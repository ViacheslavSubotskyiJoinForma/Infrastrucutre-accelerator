// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = 'Ov23li70Q9xYHNx6bOVB';
const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname;
const GITHUB_SCOPE = 'repo,workflow';
const VERCEL_BACKEND_URL = 'https://vercel-backend-three-gilt.vercel.app';

class GitHubAuth {
    constructor() {
        this.token = localStorage.getItem('github_token');
        this.user = null;
    }

    async init() {
        // Check for OAuth callback
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        if (code) {
            await this.handleCallback(code);
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
        }

        // Check if already authenticated
        if (this.token) {
            await this.verifyToken();
        }

        this.updateUI();
    }

    login() {
        const authUrl = `https://github.com/login/oauth/authorize?` +
            `client_id=${GITHUB_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&` +
            `scope=${GITHUB_SCOPE}`;

        window.location.href = authUrl;
    }

    logout() {
        localStorage.removeItem('github_token');
        localStorage.removeItem('github_user');
        this.token = null;
        this.user = null;
        this.updateUI();
    }

    async handleCallback(code) {
        try {
            if (typeof showModalSafe === 'function') {
                showModalSafe('⚡ Authenticating...', 'Exchanging authorization code for access token...');
            }

            // Exchange code for token via Vercel backend
            const response = await fetch(`${VERCEL_BACKEND_URL}/api/auth/callback`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Authentication failed');
            }

            const { access_token } = await response.json();

            // Save token and verify
            this.token = access_token;
            localStorage.setItem('github_token', access_token);

            await this.verifyToken();

            if (typeof closeModal === 'function') {
                closeModal();
            }

            if (typeof showModalSafe === 'function') {
                showModalSafe(
                    '✅ Authentication Successful!',
                    'You are now signed in and can trigger workflows directly.'
                );
            }

        } catch (error) {
            console.error('OAuth callback error:', error);

            if (typeof showModalSafe === 'function' && typeof Security !== 'undefined') {
                showModalSafe(
                    '⚠️ OAuth Failed',
                    `${Security.escapeHtml(error.message)}\n\nPlease try again or contact support.`
                );
            }
        }
    }

    async verifyToken() {
        try {
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (response.ok) {
                this.user = await response.json();
                localStorage.setItem('github_user', JSON.stringify(this.user));
                this.updateUI();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
            return false;
        }
    }

    updateUI() {
        const loginBtn = document.getElementById('loginBtn');
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const generateBtn = document.getElementById('generateBtn');

        if (this.token && this.user) {
            loginBtn.style.display = 'none';
            userInfo.style.display = 'flex';
            userName.textContent = `👤 ${this.user.login}`;
            generateBtn.innerHTML = '🚀 Generate Infrastructure';
            generateBtn.classList.remove('btn-secondary');
            generateBtn.classList.add('btn-primary');
        } else {
            loginBtn.style.display = 'inline-block';
            userInfo.style.display = 'none';
            generateBtn.innerHTML = '🔒 Sign in to Generate';
            generateBtn.classList.remove('btn-primary');
            generateBtn.classList.add('btn-secondary');
        }
    }

    async triggerWorkflow(inputs) {
        if (!this.token) {
            throw new Error('Not authenticated');
        }

        // Trigger the workflow
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/generate-infrastructure.yml/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: inputs
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to trigger workflow');
        }

        // Wait a moment for GitHub to create the run
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Fetch the latest workflow run
        try {
            const runsResponse = await fetch(
                `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/generate-infrastructure.yml/runs?per_page=1`,
                {
                    headers: {
                        'Authorization': `Bearer ${this.token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                }
            );

            if (runsResponse.ok) {
                const runsData = await runsResponse.json();
                if (runsData.workflow_runs && runsData.workflow_runs.length > 0) {
                    return runsData.workflow_runs[0].id;
                }
            }
        } catch (error) {
            console.error('Failed to fetch workflow run ID:', error);
        }

        // Return null if we couldn't get the run ID (will fall back to actions page)
        return null;
    }

    isAuthenticated() {
        return this.token !== null && this.user !== null;
    }
}

// Global auth instance
const auth = new GitHubAuth();
