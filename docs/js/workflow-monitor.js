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
    }

    /**
     * Start monitoring a workflow run
     * Polls GitHub API every 5 seconds for status updates
     * Updates progress UI and automatically downloads artifacts when complete
     * @param {number} runId - GitHub workflow run ID
     * @returns {Promise<void>}
     */
    async startMonitoring(runId) {
        this.currentRunId = runId;
        this.startTime = Date.now();

        console.log('[WorkflowMonitor] Starting monitoring for run ID:', runId);

        // Show progress modal
        this.showProgressModal();

        // Start polling with arrow function to preserve 'this' context
        this.pollInterval = setInterval(async () => {
            console.log('[WorkflowMonitor] Polling status...');
            await this.checkStatus();
        }, 5000); // Poll every 5 seconds

        // Check immediately
        await this.checkStatus();
    }

    /**
     * Stop monitoring and cleanup
     * @returns {void}
     */
    stopMonitoring() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    /**
     * Check workflow run status via GitHub API
     * @returns {Promise<void>}
     */
    async checkStatus() {
        try {
            console.log('[WorkflowMonitor] Checking status for run:', this.currentRunId);

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
                const errorText = await response.text();
                console.error('[WorkflowMonitor] API error:', response.status, errorText);
                throw new Error(`Failed to fetch workflow status: ${response.status}`);
            }

            const run = await response.json();
            console.log('[WorkflowMonitor] Current status:', run.status, 'Conclusion:', run.conclusion);

            this.updateProgress(run);

            // If completed, fetch jobs for detailed progress
            if (run.status === WorkflowStatus.COMPLETED) {
                console.log('[WorkflowMonitor] Workflow completed, stopping monitoring');
                this.stopMonitoring();
                await this.handleCompletion(run);
            } else {
                // Fetch jobs for progress details
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
            console.log('[WorkflowMonitor] Fetching jobs for run:', this.currentRunId);

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
                console.log('[WorkflowMonitor] Received', jobs.length, 'jobs');
                this.displayJobProgress(jobs);
            } else {
                console.error('[WorkflowMonitor] Failed to fetch jobs:', response.status);
            }
        } catch (error) {
            console.error('[WorkflowMonitor] Job progress error:', error);
        }
    }

    /**
     * Display job progress in UI
     * @param {Array} jobs - Array of job objects from GitHub API
     * @returns {void}
     */
    displayJobProgress(jobs) {
        const jobList = document.getElementById('workflowJobs');
        if (!jobList) {
            console.error('[WorkflowMonitor] workflowJobs element not found in displayJobProgress');
            return;
        }

        console.log('[WorkflowMonitor] Displaying', jobs.length, 'jobs');
        jobList.innerHTML = '';

        jobs.forEach((job, index) => {
            console.log(`[WorkflowMonitor] Job ${index + 1}:`, job.name, 'Status:', job.status);

            const jobItem = document.createElement('div');
            jobItem.className = 'job-item';

            let statusIcon = '⏳';
            let statusClass = 'pending';

            if (job.status === 'completed') {
                if (job.conclusion === 'success') {
                    statusIcon = '✅';
                    statusClass = 'success';
                } else if (job.conclusion === 'failure') {
                    statusIcon = '❌';
                    statusClass = 'failure';
                } else {
                    statusIcon = '⚠️';
                    statusClass = 'warning';
                }
            } else if (job.status === 'in_progress') {
                statusIcon = '⚡';
                statusClass = 'in-progress';
            }

            jobItem.innerHTML = `
                <span class="job-status ${statusClass}">${statusIcon}</span>
                <span class="job-name">${Security.escapeHtml(job.name)}</span>
            `;

            jobList.appendChild(jobItem);
        });
    }

    /**
     * Update overall progress display
     * @param {Object} run - Workflow run object from GitHub API
     * @returns {void}
     */
    updateProgress(run) {
        console.log('[WorkflowMonitor] updateProgress called with status:', run.status);

        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = `${minutes}m ${seconds}s`;

        let message = '';
        let progressPercent = 0;

        switch (run.status) {
            case WorkflowStatus.QUEUED:
                message = `⏳ Queued (${timeStr})`;
                progressPercent = 10;
                console.log('[WorkflowMonitor] Status: QUEUED');
                break;
            case WorkflowStatus.IN_PROGRESS:
                message = `⚡ Generating infrastructure... (${timeStr})`;
                // Estimate progress based on time (max 90% until complete)
                progressPercent = Math.min(90, 20 + (elapsed / 10));
                console.log('[WorkflowMonitor] Status: IN_PROGRESS, progress:', progressPercent);
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
                console.log('[WorkflowMonitor] Status: COMPLETED, conclusion:', run.conclusion);
                break;
            default:
                console.warn('[WorkflowMonitor] Unknown status:', run.status);
        }

        console.log('[WorkflowMonitor] Updating UI - Progress:', progressPercent, 'Message:', message);
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

        console.log('[WorkflowMonitor] updateProgressBar called with:', percent, '%, elements found:', !!progressBar, !!progressPercent);

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
        } else {
            console.error('[WorkflowMonitor] progressBar element not found!');
        }
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(percent)}%`;
        } else {
            console.error('[WorkflowMonitor] progressPercent element not found!');
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

        console.log('[WorkflowMonitor] updateProgressMessage called:', message, 'status:', status, 'element found:', !!messageEl);

        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `progress-message ${status}`;
        } else {
            console.error('[WorkflowMonitor] progressMessage element not found!');
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
        console.log('[WorkflowMonitor] showProgressModal called');

        const modal = document.getElementById('progressModal');
        if (!modal) {
            console.log('[WorkflowMonitor] Modal not found, creating new modal');
            this.createProgressModal();
        } else {
            console.log('[WorkflowMonitor] Modal found, showing it');
            modal.classList.add('show');
        }

        // Reset progress
        console.log('[WorkflowMonitor] Resetting progress to 0');
        this.updateProgressBar(0);
        this.updateProgressMessage('⏳ Starting workflow...', 'queued');

        const jobList = document.getElementById('workflowJobs');
        if (jobList) {
            jobList.innerHTML = '';
        } else {
            console.error('[WorkflowMonitor] workflowJobs element not found in showProgressModal');
        }
    }

    /**
     * Create progress modal if it doesn't exist
     * @returns {void}
     */
    createProgressModal() {
        console.log('[WorkflowMonitor] createProgressModal called, runId:', this.currentRunId);

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
                        <h4>Workflow Jobs:</h4>
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
        console.log('[WorkflowMonitor] Modal HTML inserted into DOM');

        // Verify elements were created
        const progressBar = document.getElementById('progressBar');
        const progressMessage = document.getElementById('progressMessage');
        console.log('[WorkflowMonitor] Verification - progressBar:', !!progressBar, 'progressMessage:', !!progressMessage);
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
