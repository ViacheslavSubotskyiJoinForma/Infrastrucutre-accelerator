/**
 * @file Workflow Monitor Module
 * @description Real-time monitoring of GitHub Actions workflows with progress tracking
 */

/**
 * Workflow statuses from GitHub API
 * @enum {string}
 */
const WorkflowStatus = {
    QUEUED: 'queued',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed'
};

/**
 * Workflow conclusions from GitHub API
 * @enum {string}
 */
const WorkflowConclusion = {
    SUCCESS: 'success',
    FAILURE: 'failure',
    CANCELLED: 'cancelled',
    TIMED_OUT: 'timed_out'
};

/**
 * Workflow Monitor Class
 * Polls GitHub API for workflow run status and manages UI updates
 */
class WorkflowMonitor {
    /**
     * Initialize workflow monitor
     * @param {string} token - GitHub access token
     * @param {string} repo - Repository in format "owner/repo"
     */
    constructor(token, repo) {
        this.token = token;
        this.repo = repo;
        this.pollInterval = null;
        this.currentRunId = null;
        this.startTime = null;
        this.stepsProgress = 0; // Track progress based on workflow steps
        this.isMonitoring = false; // Track monitoring state
        this.lastPollTime = 0; // Track last successful poll
        this.visibilityChangeHandler = null; // Store handler for cleanup
    }

    /**
     * Start monitoring a workflow run
     * Polls GitHub API every 5 seconds for status updates
     * Updates progress UI and automatically downloads artifacts when complete
     * Uses recursive setTimeout instead of setInterval to prevent browser throttling
     * @param {number} runId - GitHub workflow run ID
     * @returns {Promise<void>}
     */
    async startMonitoring(runId) {
        this.currentRunId = runId;
        this.startTime = Date.now();
        this.stepsProgress = 0;
        this.isMonitoring = true;
        this.lastPollTime = Date.now();

        // Show progress modal
        this.showProgressModal();

        // Setup Page Visibility API handler to resume polling when tab becomes visible
        this.visibilityChangeHandler = async () => {
            if (!document.hidden && this.isMonitoring) {
                const timeSinceLastPoll = Date.now() - this.lastPollTime;

                // If more than 4 seconds passed, poll immediately
                if (timeSinceLastPoll > 4000) {
                    await this.checkStatus();
                }
            }
        };
        document.addEventListener('visibilitychange', this.visibilityChangeHandler);

        // Check immediately on start
        await this.checkStatus();

        // Start polling using recursive setTimeout (better than setInterval for background tabs)
        this.pollNext();
    }

    /**
     * Schedule next poll
     * Uses recursive setTimeout to avoid browser throttling issues
     * @returns {void}
     */
    pollNext() {
        if (!this.isMonitoring) {
            return;
        }

        this.pollInterval = setTimeout(async () => {
            await this.checkStatus();
            // Schedule next poll after current one completes
            this.pollNext();
        }, 3000); // Poll every 3 seconds (faster to combat browser throttling)
    }

    /**
     * Stop monitoring and cleanup
     * @returns {void}
     */
    stopMonitoring() {
        this.isMonitoring = false;
        if (this.pollInterval) {
            clearTimeout(this.pollInterval);
            this.pollInterval = null;
        }
        // Remove visibility change listener
        if (this.visibilityChangeHandler) {
            document.removeEventListener('visibilitychange', this.visibilityChangeHandler);
            this.visibilityChangeHandler = null;
        }
    }

    /**
     * Check workflow run status via GitHub API
     * @returns {Promise<void>}
     */
    async checkStatus() {
        this.lastPollTime = Date.now();
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.repo}/actions/runs/${this.currentRunId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch workflow status: ${response.status}`);
            }

            const run = await response.json();

            // If completed, stop monitoring and handle completion
            if (run.status === WorkflowStatus.COMPLETED) {
                this.stopMonitoring();
                this.updateProgress(run);
                await this.handleCompletion(run);
            } else {
                // Fetch jobs for step-based progress calculation
                await this.updateJobProgress(run);
            }

        } catch (error) {
            console.error('[WorkflowMonitor] Status check error:', error);
            this.updateProgressMessage('⚠️ Error checking status. Retrying...', 'warning');
        }
    }

    /**
     * Update job progress details
     * @param {Object} run - Workflow run object from GitHub API
     * @returns {Promise<void>}
     */
    async updateJobProgress(run) {
        try {
            const response = await fetch(
                `https://api.github.com/repos/${this.repo}/actions/runs/${this.currentRunId}/jobs`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (response.ok) {
                const { jobs } = await response.json();

                // Calculate progress based on steps
                this.stepsProgress = this.calculateStepsProgress(jobs);

                // Display jobs in UI
                this.displayJobProgress(jobs);

                // Update progress bar with calculated percentage
                this.updateProgress(run);
            }
        } catch (error) {
            console.error('[WorkflowMonitor] Job progress error:', error);
        }
    }

    /**
     * Calculate progress percentage based on workflow steps
     * @param {Array} jobs - Array of job objects with steps from GitHub API
     * @returns {number} Progress percentage (0-100)
     */
    calculateStepsProgress(jobs) {
        let totalSteps = 0;
        let completedSteps = 0;
        let inProgressSteps = 0;

        jobs.forEach(job => {
            if (job.steps && job.steps.length > 0) {
                job.steps.forEach(step => {
                    // Skip setup steps (like "Set up job", "Complete job")
                    if (!step.name.startsWith('Set up') && !step.name.startsWith('Complete')) {
                        totalSteps++;

                        if (step.status === 'completed') {
                            completedSteps++;
                        } else if (step.status === 'in_progress') {
                            inProgressSteps++;
                        }
                    }
                });
            }
        });

        if (totalSteps === 0) {
            // No steps yet, use job status as fallback
            const completedJobs = jobs.filter(j => j.status === 'completed').length;
            const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length;
            const totalJobs = jobs.length || 1;

            return Math.round(((completedJobs + inProgressJobs * 0.5) / totalJobs) * 90);
        }

        // Calculate: completed steps = 100%, in_progress = 50% contribution
        const weightedCompleted = completedSteps + (inProgressSteps * 0.5);
        const progress = (weightedCompleted / totalSteps) * 90; // Cap at 90% until workflow completes

        return Math.round(Math.max(10, progress)); // Minimum 10% when started
    }

    /**
     * Display job progress in UI
     * @param {Array} jobs - Array of job objects from GitHub API
     * @returns {void}
     */
    displayJobProgress(jobs) {
        const jobList = document.getElementById('workflowJobs');
        if (!jobList) {
            return;
        }

        jobList.innerHTML = '';
        let firstInProgressItem = null;

        // Show waiting message if no jobs yet
        if (!jobs || jobs.length === 0) {
            const waitingItem = document.createElement('div');
            waitingItem.className = 'job-item';
            waitingItem.innerHTML = `
                <span class="job-status pending">⏳</span>
                <span class="job-name">Waiting for workflow to start...</span>
            `;
            jobList.appendChild(waitingItem);
            return;
        }

        jobs.forEach(job => {
            // Display each step instead of just the job
            if (job.steps && job.steps.length > 0) {
                job.steps.forEach(step => {
                    // Skip setup/teardown steps
                    if (step.name.startsWith('Set up') || step.name.startsWith('Complete')) {
                        return;
                    }

                    const jobItem = document.createElement('div');
                    jobItem.className = 'job-item';

                    let statusIcon = '⏳';
                    let statusClass = 'pending';

                    if (step.status === 'completed') {
                        if (step.conclusion === 'success') {
                            statusIcon = '✅';
                            statusClass = 'success';
                        } else if (step.conclusion === 'failure') {
                            statusIcon = '❌';
                            statusClass = 'failure';
                        } else {
                            statusIcon = '⚠️';
                            statusClass = 'warning';
                        }
                    } else if (step.status === 'in_progress') {
                        statusIcon = '⚡';
                        statusClass = 'in-progress';
                        // Remember first in-progress item for auto-scroll
                        if (!firstInProgressItem) {
                            firstInProgressItem = jobItem;
                            // Add active class for visual highlight
                            jobItem.classList.add('active');
                        }
                    }

                    jobItem.innerHTML = `
                        <span class="job-status ${statusClass}">${statusIcon}</span>
                        <span class="job-name">${Security.escapeHtml(step.name)}</span>
                    `;

                    jobList.appendChild(jobItem);
                });
            } else {
                // Fallback: show job if no steps available yet
                const jobItem = document.createElement('div');
                jobItem.className = 'job-item';

                let statusIcon = '⏳';
                let statusClass = 'pending';

                if (job.status === 'completed') {
                    statusIcon = '✅';
                    statusClass = 'success';
                } else if (job.status === 'in_progress') {
                    statusIcon = '⚡';
                    statusClass = 'in-progress';
                    if (!firstInProgressItem) {
                        firstInProgressItem = jobItem;
                        jobItem.classList.add('active');
                    }
                }

                jobItem.innerHTML = `
                    <span class="job-status ${statusClass}">${statusIcon}</span>
                    <span class="job-name">${Security.escapeHtml(job.name)}</span>
                `;

                jobList.appendChild(jobItem);
            }
        });

        // Auto-scroll to the first in-progress step
        if (firstInProgressItem) {
            // Use setTimeout to ensure DOM is updated before scrolling
            setTimeout(() => {
                firstInProgressItem.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                });
            }, 100);
        }
    }

    /**
     * Update overall progress display
     * @param {Object} run - Workflow run object from GitHub API
     * @returns {void}
     */
    updateProgress(run) {
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}m ${seconds}s`;

        // Calculate last update time for debugging
        const now = new Date();
        const lastUpdateStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        let message = '';
        let progressPercent = 0;

        switch (run.status) {
            case WorkflowStatus.QUEUED:
                message = `⏳ Queued (${timeStr}) • Updated: ${lastUpdateStr}`;
                progressPercent = 5;
                break;
            case WorkflowStatus.IN_PROGRESS:
                message = `⚡ Generating infrastructure... (${timeStr}) • Updated: ${lastUpdateStr}`;
                // Use step-based progress (calculated from jobs/steps)
                progressPercent = this.stepsProgress || 10;
                break;
            case WorkflowStatus.COMPLETED:
                progressPercent = 100;
                if (run.conclusion === WorkflowConclusion.SUCCESS) {
                    message = `✅ Generation complete! (${timeStr})`;
                } else if (run.conclusion === WorkflowConclusion.FAILURE) {
                    message = `❌ Generation failed (${timeStr})`;
                } else {
                    message = `⚠️ Workflow ${run.conclusion} (${timeStr})`;
                }
                break;
        }

        this.updateProgressBar(progressPercent);
        this.updateProgressMessage(message, run.status);
    }

    /**
     * Update progress bar percentage
     * @param {number} percent - Progress percentage (0-100)
     * @returns {void}
     */
    updateProgressBar(percent) {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        }
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(percent)}%`;
        }
    }

    /**
     * Update progress message
     * @param {string} message - Status message
     * @param {string} status - Status type (queued, in_progress, completed)
     * @returns {void}
     */
    updateProgressMessage(message, status) {
        const messageEl = document.getElementById('progressMessage');

        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `progress-message ${status}`;
        }
    }

    /**
     * Handle workflow completion
     * Downloads artifacts if successful, shows error details if failed
     * @param {Object} run - Workflow run object from GitHub API
     * @returns {Promise<void>}
     */
    async handleCompletion(run) {
        if (run.conclusion === WorkflowConclusion.SUCCESS) {
            this.updateProgressMessage('✅ Generation complete! Downloading files...', 'completed');
            await this.downloadArtifacts();
        } else {
            this.showCompletionModal(run);
        }
    }

    /**
     * Download workflow artifacts
     * @returns {Promise<void>}
     */
    async downloadArtifacts() {
        try {
            // Fetch artifacts list
            const response = await fetch(
                `https://api.github.com/repos/${this.repo}/actions/runs/${this.currentRunId}/artifacts`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch artifacts');
            }

            const { artifacts } = await response.json();

            if (artifacts.length === 0) {
                this.updateProgressMessage('⚠️ No artifacts found. Check workflow logs.', 'warning');
                setTimeout(() => this.showCompletionModal({ conclusion: 'success' }), 2000);
                return;
            }

            // Download first artifact (infrastructure package)
            const artifact = artifacts[0];
            await this.downloadArtifact(artifact);

            // Show success message
            setTimeout(() => {
                this.showSuccessModal(artifact.name);
            }, 1000);

        } catch (error) {
            console.error('Artifact download error:', error);
            this.updateProgressMessage('⚠️ Auto-download failed. Download manually below.', 'warning');
            setTimeout(() => this.showCompletionModal({ conclusion: 'success' }), 2000);
        }
    }

    /**
     * Download a specific artifact
     * @param {Object} artifact - Artifact object from GitHub API
     * @returns {Promise<void>}
     */
    async downloadArtifact(artifact) {
        try {
            // Get artifact download URL
            const response = await fetch(
                artifact.archive_download_url,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Failed to download artifact');
            }

            // Download as blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${artifact.name}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);

            this.updateProgressMessage('✅ Download started! Check your downloads folder.', 'completed');

        } catch (error) {
            console.error('Artifact download error:', error);
            throw error;
        }
    }

    /**
     * Show progress modal
     * @returns {void}
     */
    showProgressModal() {
        const modal = document.getElementById('progressModal');
        if (!modal) {
            this.createProgressModal();
        } else {
            modal.classList.add('show');
        }

        // Reset progress
        this.updateProgressBar(0);
        this.updateProgressMessage('⏳ Starting workflow...', 'queued');

        const jobList = document.getElementById('workflowJobs');
        if (jobList) {
            jobList.innerHTML = '';
        }
    }

    /**
     * Create progress modal if it doesn't exist
     * @returns {void}
     */
    createProgressModal() {
        const modalHTML = `
            <div id="progressModal" class="modal show">
                <div class="modal-content progress-modal">
                    <h3>🚀 Generating Infrastructure</h3>

                    <div class="progress-container">
                        <div class="progress-bar-wrapper">
                            <div id="progressBar" class="progress-bar"></div>
                        </div>
                        <div id="progressPercent" class="progress-percent">0%</div>
                    </div>

                    <p id="progressMessage" class="progress-message">⏳ Starting workflow...</p>

                    <div class="jobs-container">
                        <h4>Workflow Steps:</h4>
                        <div id="workflowJobs" class="job-list"></div>
                    </div>

                    <div class="progress-actions">
                        <a id="viewWorkflowLink" href="https://github.com/${this.repo}/actions/runs/${this.currentRunId}" target="_blank" class="btn-secondary">
                            View on GitHub →
                        </a>
                        <button id="closeProgress" class="btn-secondary" onclick="workflowMonitor.hideProgressModal()">
                            Close (runs in background)
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    /**
     * Hide progress modal (monitoring continues in background)
     * @returns {void}
     */
    hideProgressModal() {
        const modal = document.getElementById('progressModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Show completion modal
     * @param {Object} run - Workflow run object
     * @returns {void}
     */
    showCompletionModal(run) {
        this.hideProgressModal();

        const workflowUrl = `https://github.com/${this.repo}/actions/runs/${this.currentRunId}`;

        if (run.conclusion === WorkflowConclusion.SUCCESS) {
            if (typeof showModalSafe === 'function') {
                showModalSafe(
                    '✅ Infrastructure Generated!',
                    'Your infrastructure has been generated successfully.\n\nDownload the ZIP file from the artifacts section.',
                    [
                        {
                            text: 'View Workflow & Download →',
                            href: workflowUrl,
                            className: 'btn-primary'
                        }
                    ]
                );
            }
        } else if (run.conclusion === WorkflowConclusion.FAILURE) {
            if (typeof showModalSafe === 'function') {
                showModalSafe(
                    '❌ Generation Failed',
                    'The workflow encountered an error. Please check the logs for details.',
                    [
                        {
                            text: 'View Logs →',
                            href: workflowUrl,
                            className: 'btn-primary'
                        }
                    ]
                );
            }
        } else {
            if (typeof showModalSafe === 'function') {
                showModalSafe(
                    '⚠️ Workflow Completed',
                    `Workflow ${run.conclusion}. Check the details for more information.`,
                    [
                        {
                            text: 'View Details →',
                            href: workflowUrl,
                            className: 'btn-primary'
                        }
                    ]
                );
            }
        }
    }

    /**
     * Show success modal with download info
     * @param {string} artifactName - Name of downloaded artifact
     * @returns {void}
     */
    showSuccessModal(artifactName) {
        this.hideProgressModal();

        const workflowUrl = `https://github.com/${this.repo}/actions/runs/${this.currentRunId}`;

        if (typeof showModalSafe === 'function') {
            const modal = document.getElementById('modalMessage');
            modal.innerHTML = '';

            const title = Security.createSafeElement('h3', '✅ Infrastructure Generated!');
            modal.appendChild(title);

            const p1 = Security.createSafeElement('p', '🎉 Your infrastructure has been generated and downloaded successfully!');
            modal.appendChild(p1);

            const downloadInfo = Security.createSafeElement('div', '', {
                class: 'download-info'
            });
            const downloadText = Security.createSafeElement('p', `📦 File: ${Security.escapeHtml(artifactName)}.zip`, {
                class: 'download-filename'
            });
            downloadInfo.appendChild(downloadText);
            modal.appendChild(downloadInfo);

            const p2 = Security.createSafeElement('p', 'Check your downloads folder for the ZIP file containing your Terraform infrastructure.');
            modal.appendChild(p2);

            const nextSteps = Security.createSafeElement('div', '', {
                style: 'text-align: left; margin: 1rem 0;'
            });
            const nextStepsTitle = Security.createSafeElement('strong', 'Next Steps:');
            nextSteps.appendChild(nextStepsTitle);

            const stepsList = document.createElement('ol');
            stepsList.style.marginTop = '0.5rem';
            ['Extract the ZIP file', 'Review the README.md for deployment instructions', 'Configure your .tfvars files', 'Deploy using Terraform or CI/CD pipeline'].forEach(step => {
                const li = Security.createSafeElement('li', step);
                stepsList.appendChild(li);
            });
            nextSteps.appendChild(stepsList);
            modal.appendChild(nextSteps);

            const link = Security.createSafeElement('a', 'View Workflow Run →', {
                href: workflowUrl,
                target: '_blank',
                class: 'btn-secondary',
                style: 'display: inline-block; margin-top: 1rem; text-decoration: none;'
            });
            modal.appendChild(link);

            document.getElementById('closeModal').style.display = 'inline-block';
            document.getElementById('modal').classList.add('show');
        }
    }
}

// Global instance (will be initialized when needed)
let workflowMonitor = null;
