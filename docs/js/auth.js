// Configuration (can be overridden via window.CONFIG)
const CONFIG = window.CONFIG || {
    GITHUB_CLIENT_ID: 'Ov23li70Q9xYHNx6bOVB',
    GITHUB_REDIRECT_URI: window.location.origin + window.location.pathname,
    GITHUB_SCOPE: 'repo,workflow',
    VERCEL_BACKEND_URL: 'https://vercel-backend-three-gilt.vercel.app',
    TOKEN_STORAGE: 'session' // 'session' or 'memory' (more secure than 'local')
};

class GitHubAuth {
    constructor() {
        // Use sessionStorage (cleared on tab close) instead of localStorage for better security
        // Tokens are only kept in memory and sessionStorage, not persistent localStorage
        this.token = sessionStorage.getItem('github_token');
        this.user = null;

        // Try to restore user from sessionStorage
        const savedUser = sessionStorage.getItem('github_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
            } catch (e) {
                console.error('Failed to parse saved user:', e);
                sessionStorage.removeItem('github_user');
            }
        }
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
            `client_id=${CONFIG.GITHUB_CLIENT_ID}&` +
            `redirect_uri=${encodeURIComponent(CONFIG.GITHUB_REDIRECT_URI)}&` +
            `scope=${CONFIG.GITHUB_SCOPE}`;

        window.location.href = authUrl;
    }

    logout() {
        // Clear tokens from sessionStorage
        sessionStorage.removeItem('github_token');
        sessionStorage.removeItem('github_user');
        this.token = null;
        this.user = null;
        this.updateUI();
    }

    async handleCallback(code) {
        try {
            showModal(`
                <h3>⚡ Authenticating...</h3>
                <p>Exchanging authorization code for access token...</p>
            `);

            // Exchange code for token via Vercel backend
            const response = await fetch(`${CONFIG.VERCEL_BACKEND_URL}/api/auth/callback`, {
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

            // Save token to sessionStorage (more secure than localStorage)
            this.token = access_token;
            sessionStorage.setItem('github_token', access_token);

            await this.verifyToken();

            closeModal();

            showModal(`
                <h3>✅ Authentication Successful!</h3>
                <p>You are now signed in and can trigger workflows directly.</p>
            `, true);

        } catch (error) {
            console.error('OAuth callback error:', error);

            showModal(`
                <h3>⚠️ OAuth Failed</h3>
                <p>${error.message}</p>
                <p>Please try again or contact support.</p>
            `, true);
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
                sessionStorage.setItem('github_user', JSON.stringify(this.user));
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
