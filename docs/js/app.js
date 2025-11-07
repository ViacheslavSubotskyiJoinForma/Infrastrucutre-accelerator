// Configuration
const GITHUB_REPO = 'ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator';
const WORKFLOW_NAME = 'Generate Infrastructure Template (MVP)';

// State
let selectedComponents = ['vpc'];
let selectedEnvironments = ['dev'];

// Theme management
const theme = {
    init() {
        // Load saved theme or detect system preference
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            this.enable();
        }

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                if (e.matches) {
                    this.enable();
                } else {
                    this.disable();
                }
            }
        });
    },

    toggle() {
        if (document.body.classList.contains('dark-mode')) {
            this.disable();
        } else {
            this.enable();
        }
    },

    enable() {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        updateDiagram();
    },

    disable() {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        updateDiagram();
    },

    isDark() {
        return document.body.classList.contains('dark-mode');
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    theme.init();
    await auth.init();
    setupEventListeners();
    updateDiagram();
    updateComponentList();
});

function setupEventListeners() {
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', () => theme.toggle());

    // Component checkboxes
    document.querySelectorAll('.checkbox-group:not(.environments) input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', handleComponentChange);
    });

    // Environment checkboxes
    document.querySelectorAll('.environments input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', handleEnvironmentChange);
    });

    // Generate button
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);

    // Close modal
    document.getElementById('closeModal').addEventListener('click', closeModal);

    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', () => auth.login());
    document.getElementById('logoutBtn').addEventListener('click', () => auth.logout());
}

function handleComponentChange(e) {
    const value = e.target.value;
    if (e.target.checked) {
        if (!selectedComponents.includes(value)) {
            selectedComponents.push(value);
        }
    } else {
        selectedComponents = selectedComponents.filter(c => c !== value);
    }

    // Always keep vpc
    if (!selectedComponents.includes('vpc')) {
        selectedComponents.push('vpc');
        document.querySelector('input[value="vpc"]').checked = true;
    }

    updateDiagram();
    updateComponentList();
}

function handleEnvironmentChange(e) {
    const value = e.target.value;
    if (e.target.checked) {
        if (!selectedEnvironments.includes(value)) {
            selectedEnvironments.push(value);
        }
    } else {
        selectedEnvironments = selectedEnvironments.filter(env => env !== value);
    }

    // At least one environment
    if (selectedEnvironments.length === 0) {
        selectedEnvironments = ['dev'];
        document.querySelector('.environments input[value="dev"]').checked = true;
    }

    updateDiagram();
}

function updateComponentList() {
    const list = document.getElementById('componentList');
    const items = [];

    items.push('✅ VPC with multi-AZ subnets');
    items.push('✅ NAT Gateway and Internet Gateway');
    items.push('✅ Security Groups and Network ACLs');

    if (selectedComponents.includes('eks-auto')) {
        items.push('✅ EKS Auto Mode cluster');
        items.push('✅ Automatic node provisioning');
        items.push('✅ IAM roles and policies');
    }

    list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
}

function updateDiagram() {
    const svg = document.getElementById('diagram');
    const width = svg.clientWidth || 600;
    const height = 400;

    // Clear existing
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const envCount = selectedEnvironments.length;
    const hasEKS = selectedComponents.includes('eks-auto');
    const isDark = theme.isDark();

    // Theme-aware colors
    const colors = isDark ? {
        envLight: '#374151',
        envProd: '#1e3a5f',
        vpc: '#1f2937',
        public: '#1e3a5f',
        private: '#78350f',
        eks: '#4c1d95',
        text: '#f9fafb',
        border: {
            env: '#3b82f6',
            vpc: '#10b981',
            public: '#0ea5e9',
            private: '#f59e0b',
            eks: '#8b5cf6'
        }
    } : {
        envLight: '#f3f4f6',
        envProd: '#dbeafe',
        vpc: '#ffffff',
        public: '#e0f2fe',
        private: '#fef3c7',
        eks: '#ddd6fe',
        text: '#1f2937',
        border: {
            env: '#3b82f6',
            vpc: '#10b981',
            public: '#0ea5e9',
            private: '#f59e0b',
            eks: '#8b5cf6'
        }
    };

    // Title
    addText(svg, width / 2, 30, `Architecture: ${selectedEnvironments.join(', ').toUpperCase()}`, 'bold', 'middle', colors.text);

    // Draw environments
    const envWidth = (width - 80) / envCount;
    selectedEnvironments.forEach((env, i) => {
        const x = 40 + i * envWidth;
        const y = 60;

        // Environment box
        addRect(svg, x, y, envWidth - 20, height - 100, env === 'prod' ? colors.envProd : colors.envLight, colors.border.env);
        addText(svg, x + (envWidth - 20) / 2, y + 30, env.toUpperCase(), 'bold', 'middle', colors.text);

        // VPC
        addRect(svg, x + 20, y + 60, envWidth - 60, hasEKS ? 220 : 120, colors.vpc, colors.border.vpc);
        addText(svg, x + envWidth / 2, y + 90, 'VPC', 'normal', 'middle', colors.text);

        // Subnets
        const subnetY = y + 110;
        addRect(svg, x + 30, subnetY, (envWidth - 80) / 2 - 5, 50, colors.public, colors.border.public);
        addText(svg, x + 30 + (envWidth - 80) / 4, subnetY + 25, 'Public', 'small', 'middle', colors.text);

        addRect(svg, x + envWidth / 2 + 5, subnetY, (envWidth - 80) / 2 - 5, 50, colors.private, colors.border.private);
        addText(svg, x + envWidth / 2 + 5 + (envWidth - 80) / 4, subnetY + 25, 'Private', 'small', 'middle', colors.text);

        // EKS if selected
        if (hasEKS) {
            const eksY = subnetY + 70;
            addRect(svg, x + 30, eksY, envWidth - 60, 80, colors.eks, colors.border.eks);
            addText(svg, x + envWidth / 2, eksY + 25, 'EKS Cluster', 'normal', 'middle', colors.text);
            addText(svg, x + envWidth / 2, eksY + 50, 'Auto Mode', 'small', 'middle', colors.text);
        }
    });

    // Legend
    const legendY = height - 30;
    addText(svg, 40, legendY, '● VPC', 'small', 'start', colors.border.vpc);
    if (hasEKS) {
        addText(svg, 120, legendY, '● EKS', 'small', 'start', colors.border.eks);
    }
}

function addRect(svg, x, y, width, height, fill, stroke) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', x);
    rect.setAttribute('y', y);
    rect.setAttribute('width', width);
    rect.setAttribute('height', height);
    rect.setAttribute('fill', fill);
    rect.setAttribute('stroke', stroke);
    rect.setAttribute('stroke-width', '2');
    rect.setAttribute('rx', '8');
    svg.appendChild(rect);
}

function addText(svg, x, y, text, weight, anchor, fill = '#1f2937') {
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('fill', fill);
    textEl.setAttribute('text-anchor', anchor);
    textEl.setAttribute('font-size', weight === 'bold' ? '16' : weight === 'small' ? '12' : '14');
    textEl.setAttribute('font-weight', weight === 'bold' ? 'bold' : 'normal');
    textEl.textContent = text;
    svg.appendChild(textEl);
}

async function handleGenerate() {
    const projectName = Security.sanitizeInput(
        document.getElementById('projectName').value.trim()
    );
    const region = document.getElementById('region').value;
    const awsAccountId = Security.sanitizeInput(
        document.getElementById('awsAccountId').value.trim()
    );

    // Validation with security checks
    if (!projectName) {
        alert('Please enter a project name');
        return;
    }

    if (!Security.validateProjectName(projectName.toLowerCase())) {
        alert('Project name must be lowercase alphanumeric with hyphens, and DNS-compliant (max 63 chars)');
        return;
    }

    if (!Security.validateAwsAccountId(awsAccountId)) {
        alert('Please enter a valid 12-digit AWS Account ID');
        return;
    }

    const components = selectedComponents.join(',');
    const environments = selectedEnvironments.join(',');

    // If authenticated, trigger workflow directly
    if (auth.isAuthenticated()) {
        try {
            showModalSafe('⚡ Triggering Workflow', 'Please wait...');

            const runId = await auth.triggerWorkflow({
                project_name: projectName,
                components: components,
                environments: environments,
                region: region,
                aws_account_id: awsAccountId
            });

            // Build workflow URL - specific run if we got the ID, otherwise general actions page
            const workflowUrl = runId
                ? `https://github.com/${GITHUB_REPO}/actions/runs/${runId}`
                : `https://github.com/${GITHUB_REPO}/actions`;

            // Create safe modal content
            const modal = document.getElementById('modalMessage');
            modal.innerHTML = '';

            const title = Security.createSafeElement('h3', '✅ Workflow Triggered!');
            modal.appendChild(title);

            const p1 = Security.createSafeElement('p', 'Your infrastructure generation has been started.');
            modal.appendChild(p1);

            const p2 = Security.createSafeElement('strong', 'Configuration:');
            modal.appendChild(p2);

            const config = Security.createSafeConfigDisplay({
                'Project': projectName,
                'Components': components,
                'Environments': environments,
                'Region': region,
                'Account': awsAccountId
            });
            modal.appendChild(config);

            const link = Security.createSafeElement('a', 'View Workflow Run →', {
                href: workflowUrl,
                target: '_blank',
                class: 'btn-primary',
                style: 'display: inline-block; margin-top: 1rem; text-decoration: none;'
            });
            modal.appendChild(link);

            document.getElementById('closeModal').style.display = 'inline-block';
            document.getElementById('modal').classList.add('show');

        } catch (error) {
            showModalSafe(
                '❌ Error',
                `${Security.escapeHtml(error.message)}\n\nPlease try again or trigger manually via GitHub Actions.`,
                [{
                    text: 'Open Workflow →',
                    href: `https://github.com/${GITHUB_REPO}/actions/workflows/generate-infrastructure.yml`,
                    className: 'btn-primary'
                }]
            );
        }
        return;
    }

    // Not authenticated - show manual instructions
    const workflowUrl = `https://github.com/${GITHUB_REPO}/actions/workflows/generate-infrastructure.yml`;

    // Create safe modal content
    const modal = document.getElementById('modalMessage');
    modal.innerHTML = '';

    const title = Security.createSafeElement('h3', '🚀 Ready to Generate!');
    modal.appendChild(title);

    const p1 = Security.createSafeElement('p', "You'll be redirected to GitHub Actions.");
    modal.appendChild(p1);

    const p2 = Security.createSafeElement('strong', 'Your configuration:');
    modal.appendChild(p2);

    const config = Security.createSafeConfigDisplay({
        'Project': projectName,
        'Components': components,
        'Environments': environments,
        'Region': region,
        'Account': awsAccountId
    });
    modal.appendChild(config);

    const p3 = Security.createSafeElement('p', 'Click the workflow and enter these values manually.');
    modal.appendChild(p3);

    const link = Security.createSafeElement('a', 'Open GitHub Actions →', {
        href: workflowUrl,
        target: '_blank',
        class: 'btn-primary',
        style: 'display: inline-block; margin-top: 1rem; text-decoration: none;'
    });
    modal.appendChild(link);

    document.getElementById('closeModal').style.display = 'inline-block';
    document.getElementById('modal').classList.add('show');

    // Copy configuration to clipboard
    const configText = `project_name: ${projectName}
components: ${components}
environments: ${environments}
region: ${region}
aws_account_id: ${awsAccountId}`;

    try {
        await navigator.clipboard.writeText(configText);
        console.log('Configuration copied to clipboard');
    } catch (err) {
        console.log('Could not copy to clipboard:', err);
    }
}

function showModalSafe(title, message, buttons = []) {
    const modal = document.getElementById('modalMessage');
    modal.innerHTML = '';

    const h3 = Security.createSafeElement('h3', title);
    modal.appendChild(h3);

    const p = Security.createSafeElement('p', message);
    modal.appendChild(p);

    buttons.forEach(button => {
        const a = Security.createSafeElement('a', button.text, {
            href: button.href,
            target: '_blank',
            class: button.className || 'btn-primary',
            style: 'display: inline-block; margin-top: 1rem; text-decoration: none;'
        });
        modal.appendChild(a);
    });

    document.getElementById('closeModal').style.display = 'inline-block';
    document.getElementById('modal').classList.add('show');
}

function showModal(message, allowClose = false) {
    const modal = document.getElementById('modal');
    const modalMessage = document.getElementById('modalMessage');
    const closeBtn = document.getElementById('closeModal');

    modalMessage.innerHTML = message;
    closeBtn.style.display = allowClose ? 'inline-block' : 'none';
    modal.classList.add('show');

    if (!allowClose) {
        setTimeout(() => {
            closeBtn.style.display = 'inline-block';
        }, 2000);
    }
}

function closeModal() {
    document.getElementById('modal').classList.remove('show');
}
