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
        this.isChecking = false; // Guard to prevent concurrent checkStatus calls
    }

    /**
     * Start monitoring a workflow run
     * Polls GitHub API every 10 seconds for status updates
     * Longer interval (10s vs 5s) prevents Chrome tab throttling issues
     * Updates progress UI and automatically downloads artifacts when complete
     * @param {number} runId - GitHub workflow run ID
     * @returns {Promise<void>}
     */
    async startMonitoring(runId) {
        this.currentRunId = runId;
        this.startTime = Date.now();
        this.isChecking = false;

        // Show progress modal
        this.showProgressModal();

        // Start polling with proper error handling to prevent polling from stopping
        // Longer 10s interval helps avoid Chrome's aggressive tab throttling
        this.pollInterval = setInterval(() => {
            // Fire and forget - don't await to prevent blocking
            // Silently catch errors to prevent console.error from blocking when devtools closed
            this.checkStatus().catch(() => {});
        }, 10000); // Poll every 10 seconds (longer to avoid Chrome throttling)

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
     * Uses guard to prevent concurrent calls
     * @returns {Promise<void>}
     */
    async checkStatus() {
        // Guard: skip if already checking to prevent concurrent API calls
        if (this.isChecking) {
            return;
        }

        this.isChecking = true;
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

            // Always update progress with current workflow status
            this.updateProgress(run);

            // If completed, stop monitoring and handle completion
            if (run.status === WorkflowStatus.COMPLETED) {
                this.stopMonitoring();
                await this.handleCompletion(run);
            }

        } catch (error) {
            // Silently fail and retry on next interval
            // console.error can block execution when devtools are closed
            this.updateProgressMessage('⚠️ Error checking status. Retrying...', 'warning');
        } finally {
            // Always release the guard
            this.isChecking = false;
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

        let message = '';
        let progressPercent = 0;

        switch (run.status) {
            case WorkflowStatus.QUEUED:
                message = `⏳ Queued (${timeStr})`;
                progressPercent = 10;
                break;
            case WorkflowStatus.IN_PROGRESS:
                message = `⚡ Generating infrastructure... (${timeStr})`;
                // Simple linear progress based on elapsed time (max 90%)
                // Estimate: ~3 minutes workflow = 180 seconds
                const estimatedDuration = 180; // seconds
                progressPercent = Math.min(90, 10 + Math.floor((elapsed / estimatedDuration) * 80));
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
     * Direct DOM manipulation without requestAnimationFrame for better reliability
     * @param {number} percent - Progress percentage (0-100)
     * @returns {void}
     */
    updateProgressBar(percent) {
        const progressBar = document.getElementById('progressBar');
        const progressPercent = document.getElementById('progressPercent');

        if (progressBar) {
            progressBar.style.width = `${percent}%`;
            // Force reflow to ensure browser processes the change
            void progressBar.offsetHeight;
        }
        if (progressPercent) {
            progressPercent.textContent = `${Math.round(percent)}%`;
        }
    }

    /**
     * Update progress message
     * Direct DOM manipulation without requestAnimationFrame for better reliability
     * @param {string} message - Status message
     * @param {string} status - Status type (queued, in_progress, completed)
     * @returns {void}
     */
    updateProgressMessage(message, status) {
        const messageEl = document.getElementById('progressMessage');

        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `progress-message ${status}`;
            // Force reflow to ensure browser processes the change
            void messageEl.offsetHeight;
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
