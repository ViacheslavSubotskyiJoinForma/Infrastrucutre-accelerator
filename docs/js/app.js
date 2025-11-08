/**
 * @file Infrastructure Generator Web UI
 * @description Interactive interface for generating Terraform infrastructure templates
 */

/**
 * GitHub repository identifier
 * @constant {string}
 */
const GITHUB_REPO = 'ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator';

/**
 * GitHub Actions workflow name
 * @constant {string}
 */
const WORKFLOW_NAME = 'Generate Infrastructure Template (MVP)';

/**
 * Currently selected infrastructure components
 * @type {string[]}
 */
let selectedComponents = ['vpc'];

/**
 * Currently selected deployment environments
 * @type {string[]}
 */
let selectedEnvironments = ['dev'];

/**
 * Currently selected cloud provider
 * @type {string}
 */
let selectedProvider = 'aws';

/**
 * Default VPC CIDR ranges per environment
 * @type {Object<string, string>}
 */
const defaultCIDRs = {
    'dev': '10.0.0.0/16',
    'staging': '10.1.0.0/16',
    'prod': '10.2.0.0/16'
};

/**
 * Calculate subnet CIDR from VPC CIDR
 * @param {string} vpcCidr - VPC CIDR block (e.g., "10.0.0.0/16")
 * @param {number} subnetIndex - Subnet index (0 for public, 1 for private)
 * @returns {string} Subnet CIDR block
 */
function calculateSubnetCIDR(vpcCidr, subnetIndex) {
    if (!vpcCidr || !vpcCidr.includes('/')) return '';

    const [baseIp, prefix] = vpcCidr.split('/');
    const octets = baseIp.split('.').map(Number);

    // For /16 VPC, create /20 subnets
    // Public: .0.0/20, Private: .16.0/20
    if (prefix === '16') {
        octets[2] = subnetIndex * 16;
        return `${octets.join('.')}/20`;
    }

    return `${baseIp}/20`;
}

/**
 * Debounce function to limit execution rate
 * @param {Function} func - Function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Theme management module
 * Handles dark mode toggle with localStorage persistence
 * @namespace theme
 */
const theme = {
    /**
     * Initialize theme system
     * - Loads saved theme or detects system preference
     * - Listens for system theme changes
     * @returns {void}
     */
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

    /**
     * Toggle between light and dark mode
     * @returns {void}
     */
    toggle() {
        if (document.body.classList.contains('dark-mode')) {
            this.disable();
        } else {
            this.enable();
        }
    },

    /**
     * Enable dark mode
     * @returns {void}
     */
    enable() {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        updateDiagram();
    },

    /**
     * Disable dark mode (enable light mode)
     * @returns {void}
     */
    disable() {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
        updateDiagram();
    },

    /**
     * Check if dark mode is currently enabled
     * @returns {boolean} true if dark mode is active
     */
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

/**
 * Setup all event listeners for the UI
 * Attaches handlers for theme toggle, component/environment selection,
 * generation button, modal, and auth buttons
 * @returns {void}
 */
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

    // Cloud provider radio buttons
    document.querySelectorAll('input[name="cloudProvider"]').forEach(radio => {
        radio.addEventListener('change', handleProviderChange);
    });

    // Advanced options toggle
    document.getElementById('toggleAdvanced').addEventListener('click', toggleAdvancedOptions);

    // IP range inputs - update diagram on change (debounced for performance)
    const debouncedUpdateDiagram = debounce(() => updateDiagram(), 300);
    ['ipRangeDev', 'ipRangeStaging', 'ipRangeProd'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', debouncedUpdateDiagram);
        }
    });

    // Generate button
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);

    // Close modal
    document.getElementById('closeModal').addEventListener('click', closeModal);

    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', () => auth.login());
    document.getElementById('logoutBtn').addEventListener('click', () => auth.logout());

    // Clear validation errors on input
    document.getElementById('projectName').addEventListener('input', function() {
        if (this.classList.contains('error')) {
            clearError(this);
        }
    });

    document.getElementById('awsAccountId').addEventListener('input', function() {
        if (this.classList.contains('error')) {
            clearError(this);
        }
    });
}

/**
 * Handle component checkbox changes
 * - Adds/removes components from selection
 * - Enforces VPC as required dependency
 * - Updates diagram and component list
 * @param {Event} e - Checkbox change event
 * @returns {void}
 */
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

/**
 * Handle environment checkbox changes
 * - Adds/removes environments from selection
 * - Ensures at least one environment is always selected (defaults to dev)
 * - Updates diagram and component list
 * - Shows/hides IP range inputs based on selected environments
 * @param {Event} e - Checkbox change event
 * @returns {void}
 */
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

    // Update IP range visibility
    updateIPRangeVisibility();
    updateDiagram();
}

/**
 * Handle cloud provider radio button changes
 * @param {Event} e - Radio change event
 * @returns {void}
 */
function handleProviderChange(e) {
    selectedProvider = e.target.value;
    updateDiagram();
}

/**
 * Toggle advanced options visibility
 * Updates aria-expanded attribute for accessibility
 * @returns {void}
 */
function toggleAdvancedOptions() {
    const toggle = document.getElementById('toggleAdvanced');
    const options = document.getElementById('advancedOptions');

    if (options.classList.contains('collapsed')) {
        options.classList.remove('collapsed');
        options.classList.add('expanded');
        toggle.classList.add('expanded');
        toggle.setAttribute('aria-expanded', 'true');
    } else {
        options.classList.add('collapsed');
        options.classList.remove('expanded');
        toggle.classList.remove('expanded');
        toggle.setAttribute('aria-expanded', 'false');
    }
}

/**
 * Update visibility of IP range inputs based on selected environments
 * @returns {void}
 */
function updateIPRangeVisibility() {
    const ipRangeGroups = document.querySelectorAll('.ip-range-group');

    ipRangeGroups.forEach(group => {
        const env = group.getAttribute('data-env');
        if (selectedEnvironments.includes(env)) {
            group.classList.remove('hidden');
        } else {
            group.classList.add('hidden');
        }
    });
}

/**
 * Get VPC CIDR for an environment (custom or default)
 * @param {string} env - Environment name
 * @returns {string} VPC CIDR block
 */
function getVPCCIDR(env) {
    const inputId = `ipRange${env.charAt(0).toUpperCase() + env.slice(1)}`;
    const input = document.getElementById(inputId);
    const customValue = input ? input.value.trim() : '';

    // Return custom value if provided, otherwise default
    return customValue || defaultCIDRs[env] || '10.0.0.0/16';
}

/**
 * Update component list display based on selected components
 * Displays a checklist of infrastructure components that will be generated
 * Dynamically shows EKS-specific components if eks-auto is selected
 * @returns {void}
 */
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

/**
 * Update the architecture diagram SVG based on selected components and environments
 * Renders a visual representation of the infrastructure with theme-aware colors
 * Displays environments, VPCs, subnets, and EKS clusters if selected
 * Shows cloud provider, IP ranges, and subnet auto-split details
 * Side effect: Updates the diagram SVG element with new content
 * @returns {void}
 */
function updateDiagram() {
    const svg = document.getElementById('diagram');
    const containerWidth = svg.clientWidth || 600;
    const envCount = selectedEnvironments.length;
    const hasEKS = selectedComponents.includes('eks-auto');

    // Calculate required width based on environment count
    // Minimum 220px per environment to avoid text overlap
    const minEnvWidth = 220;
    const calculatedWidth = Math.max(containerWidth, minEnvWidth * envCount + 80);
    const width = calculatedWidth;
    const height = 450;

    // Clear existing
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Enable horizontal scroll if needed
    const container = svg.parentElement;
    if (width > containerWidth) {
        container.style.overflowX = 'auto';
        svg.style.minWidth = `${width}px`;
        container.setAttribute('data-scrollable', 'true');
    } else {
        container.style.overflowX = 'visible';
        svg.style.minWidth = '100%';
        container.setAttribute('data-scrollable', 'false');
    }

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
        textSecondary: '#9ca3af',
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
        textSecondary: '#6b7280',
        border: {
            env: '#3b82f6',
            vpc: '#10b981',
            public: '#0ea5e9',
            private: '#f59e0b',
            eks: '#8b5cf6'
        }
    };

    // Provider badge
    const providerNames = {
        'aws': 'AWS',
        'gcp': 'GCP',
        'azure': 'Azure'
    };

    // Title with provider
    addText(svg, width / 2, 25, `${providerNames[selectedProvider]} Architecture`, 'bold', 'middle', colors.text);
    addText(svg, width / 2, 45, selectedEnvironments.join(', ').toUpperCase(), 'normal', 'middle', colors.textSecondary);

    // Draw environments
    const envWidth = (width - 80) / envCount;
    selectedEnvironments.forEach((env, i) => {
        const x = 40 + i * envWidth;
        const y = 70;

        // Get VPC CIDR for this environment
        const vpcCidr = getVPCCIDR(env);
        const publicCidr = calculateSubnetCIDR(vpcCidr, 0);
        const privateCidr = calculateSubnetCIDR(vpcCidr, 1);

        // Environment box
        const boxHeight = hasEKS ? 340 : 240;
        addRect(svg, x, y, envWidth - 20, boxHeight, env === 'prod' ? colors.envProd : colors.envLight, colors.border.env);
        addText(svg, x + (envWidth - 20) / 2, y + 20, env.toUpperCase(), 'bold', 'middle', colors.text);

        // VPC with CIDR
        const vpcY = y + 40;
        const vpcHeight = hasEKS ? 260 : 160;
        const vpcPadding = 12;
        addRect(svg, x + vpcPadding, vpcY, envWidth - vpcPadding * 2 - 8, vpcHeight, colors.vpc, colors.border.vpc);
        addText(svg, x + envWidth / 2, vpcY + 18, 'VPC', 'normal', 'middle', colors.text);
        addText(svg, x + envWidth / 2, vpcY + 35, vpcCidr, 'tiny', 'middle', colors.textSecondary);

        // Subnets with CIDR details
        const subnetY = vpcY + 50;
        const subnetHeight = 70;
        const subnetGap = 8;
        const subnetPadding = 20;
        const totalSubnetWidth = envWidth - vpcPadding * 2 - subnetPadding * 2;
        const subnetWidth = (totalSubnetWidth - subnetGap) / 2;

        // Public subnet
        addRect(svg, x + vpcPadding + subnetPadding, subnetY, subnetWidth, subnetHeight, colors.public, colors.border.public);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 18, 'Public', 'small', 'middle', colors.text);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 36, publicCidr, 'tiny', 'middle', colors.textSecondary);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 53, 'Multi-AZ', 'tiny', 'middle', colors.textSecondary);

        // Private subnet
        addRect(svg, x + vpcPadding + subnetPadding + subnetWidth + subnetGap, subnetY, subnetWidth, subnetHeight, colors.private, colors.border.private);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth + subnetGap + subnetWidth / 2, subnetY + 18, 'Private', 'small', 'middle', colors.text);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth + subnetGap + subnetWidth / 2, subnetY + 36, privateCidr, 'tiny', 'middle', colors.textSecondary);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth + subnetGap + subnetWidth / 2, subnetY + 53, 'Multi-AZ', 'tiny', 'middle', colors.textSecondary);

        // EKS if selected
        if (hasEKS) {
            const eksY = subnetY + 90;
            const eksPadding = 20;
            addRect(svg, x + vpcPadding + eksPadding, eksY, envWidth - vpcPadding * 2 - eksPadding * 2, 90, colors.eks, colors.border.eks);
            addText(svg, x + envWidth / 2, eksY + 25, 'EKS Cluster', 'normal', 'middle', colors.text);
            addText(svg, x + envWidth / 2, eksY + 45, 'Auto Mode', 'small', 'middle', colors.textSecondary);
            addText(svg, x + envWidth / 2, eksY + 63, 'Automatic Node', 'tiny', 'middle', colors.textSecondary);
            addText(svg, x + envWidth / 2, eksY + 76, 'Provisioning', 'tiny', 'middle', colors.textSecondary);
        }
    });

    // Legend
    const legendY = height - 20;
    addText(svg, 40, legendY, `● ${providerNames[selectedProvider]} VPC`, 'small', 'start', colors.border.vpc);
    if (hasEKS) {
        addText(svg, 160, legendY, '● EKS Auto Mode', 'small', 'start', colors.border.eks);
    }
    addText(svg, width - 100, legendY, '● Multi-AZ', 'tiny', 'end', colors.textSecondary);
}

/**
 * Add a rectangle element to an SVG diagram
 * Creates a rect element with rounded corners and appends it to the SVG
 * @param {SVGElement} svg - Target SVG element
 * @param {number} x - X coordinate of rectangle top-left corner
 * @param {number} y - Y coordinate of rectangle top-left corner
 * @param {number} width - Width of the rectangle
 * @param {number} height - Height of the rectangle
 * @param {string} fill - Fill color (hex or CSS color)
 * @param {string} stroke - Stroke color (hex or CSS color)
 * @returns {void}
 */
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

/**
 * Add a text element to an SVG diagram
 * Creates a text element with specified styling and appends it to the SVG
 * @param {SVGElement} svg - Target SVG element
 * @param {number} x - X coordinate of text position
 * @param {number} y - Y coordinate of text position
 * @param {string} text - Text content to display
 * @param {string} weight - Font weight: 'bold', 'normal', 'small', or 'tiny' (for sizing)
 * @param {string} anchor - Text anchor alignment: 'start', 'middle', or 'end'
 * @param {string} [fill='#1f2937'] - Text color (hex or CSS color)
 * @returns {void}
 */
function addText(svg, x, y, text, weight, anchor, fill = '#1f2937') {
    const textEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    textEl.setAttribute('x', x);
    textEl.setAttribute('y', y);
    textEl.setAttribute('fill', fill);
    textEl.setAttribute('text-anchor', anchor);

    // Font size mapping
    const fontSizes = {
        'bold': '16',
        'normal': '14',
        'small': '12',
        'tiny': '10'
    };
    textEl.setAttribute('font-size', fontSizes[weight] || '14');
    textEl.setAttribute('font-weight', weight === 'bold' ? 'bold' : 'normal');

    // Use monospace for CIDR blocks
    if (text.includes('/') && text.match(/\d+\.\d+\.\d+\.\d+/)) {
        textEl.setAttribute('font-family', 'Monaco, Courier New, monospace');
    }

    textEl.textContent = text;
    svg.appendChild(textEl);
}

/**
 * Show validation error for an input field
 * @param {HTMLElement} input - Input element to mark as invalid
 * @param {string} message - Error message to display
 * @returns {void}
 */
function showError(input, message) {
    // Add error class to input
    input.classList.add('error');

    // Remove existing error message if any
    const existingError = input.parentElement.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }

    // Create and insert error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;

    // Insert after the input
    input.parentNode.insertBefore(errorDiv, input.nextSibling);

    // Hide the small helper text
    const smallText = input.parentElement.querySelector('small:not(.error-message)');
    if (smallText) {
        smallText.classList.add('hide');
    }

    // Focus the input
    input.focus();
}

/**
 * Clear validation error for an input field
 * @param {HTMLElement} input - Input element to clear error from
 * @returns {void}
 */
function clearError(input) {
    input.classList.remove('error');

    const errorMessage = input.parentElement.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }

    const smallText = input.parentElement.querySelector('small:not(.error-message)');
    if (smallText) {
        smallText.classList.remove('hide');
    }
}

/**
 * Clear all validation errors from the form
 * @returns {void}
 */
function clearAllErrors() {
    document.querySelectorAll('input.error, select.error').forEach(input => {
        clearError(input);
    });
}

/**
 * Handle infrastructure generation workflow trigger
 * Validates input, triggers GitHub Actions workflow if authenticated,
 * or shows manual instructions if not authenticated
 * Side effects: May show modals, redirect to GitHub, or trigger workflow
 * @returns {Promise<void>}
 * @throws {Error} If workflow trigger fails (caught and displayed in modal)
 */
async function handleGenerate() {
    // Clear all previous errors
    clearAllErrors();
    const projectNameInput = document.getElementById('projectName');
    const awsAccountIdInput = document.getElementById('awsAccountId');

    const projectName = Security.sanitizeInput(projectNameInput.value.trim());
    const region = document.getElementById('region').value;
    const awsAccountId = Security.sanitizeInput(awsAccountIdInput.value.trim());

    // Validation with security checks
    let hasErrors = false;

    if (!projectName) {
        showError(projectNameInput, 'Please enter a project name');
        hasErrors = true;
    } else if (!Security.validateProjectName(projectName.toLowerCase())) {
        showError(projectNameInput, 'Project name must be lowercase alphanumeric with hyphens, and DNS-compliant (max 63 chars)');
        hasErrors = true;
    }

    if (!awsAccountId) {
        showError(awsAccountIdInput, 'Please enter your AWS Account ID');
        hasErrors = true;
    } else if (!Security.validateAwsAccountId(awsAccountId)) {
        showError(awsAccountIdInput, 'AWS Account ID must be exactly 12 digits');
        hasErrors = true;
    }

    if (hasErrors) {
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

/**
 * Display a modal with sanitized content and optional buttons
 * Uses Security.createSafeElement to prevent XSS attacks
 * Displays modal with title, message, and action buttons
 * @param {string} title - Modal title (will be HTML-escaped)
 * @param {string} message - Modal message (will be HTML-escaped)
 * @param {Array<{text: string, href: string, className?: string}>} [buttons=[]] - Action buttons
 * @returns {void}
 */
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

/**
 * Display a modal with unsanitized HTML content (legacy function)
 * WARNING: Does not sanitize content - use showModalSafe for user input
 * Optionally shows close button with auto-enable after 2 seconds
 * @param {string} message - HTML content to display (not escaped)
 * @param {boolean} [allowClose=false] - Whether to allow closing the modal
 * @returns {void}
 * @deprecated Use showModalSafe instead for security
 */
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

/**
 * Close the modal dialog
 * Removes the 'show' class to hide the modal
 * @returns {void}
 */
function closeModal() {
    document.getElementById('modal').classList.remove('show');
}
