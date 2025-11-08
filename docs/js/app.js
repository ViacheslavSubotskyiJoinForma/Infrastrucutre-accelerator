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
 * Currently selected CI/CD provider
 * @type {string}
 */
let selectedCIProvider = 'gitlab';

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

    // For /16 VPC, create /20 subnets (4096 IPs each)
    // subnetIndex: 0 = Public, 1 = Private, 2 = Database
    if (prefix === '16') {
        if (subnetIndex === 0) {
            // Public: .0.0/20
            octets[2] = 0;
        } else if (subnetIndex === 1) {
            // Private: .48.0/20
            octets[2] = 48;
        } else if (subnetIndex === 2) {
            // Database: .96.0/20
            octets[2] = 96;
        }
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

    // Initialize auto-split text for all environments
    ['dev', 'staging', 'prod'].forEach(env => updateAutoSplitText(env));
});

/**
 * Update auto-split subnet text based on VPC CIDR input
 * Calculates and displays public/private/database subnet CIDRs dynamically
 * @param {string} env - Environment name (dev, staging, prod)
 * @returns {void}
 */
function updateAutoSplitText(env) {
    const inputId = `ipRange${env.charAt(0).toUpperCase() + env.slice(1)}`;
    const autoSplitId = `autoSplit${env.charAt(0).toUpperCase() + env.slice(1)}`;

    const input = document.getElementById(inputId);
    const autoSplitElement = document.getElementById(autoSplitId);

    if (!input || !autoSplitElement) return;

    const vpcCidr = input.value.trim() || getVPCCIDR(env);

    // Validate CIDR
    if (vpcCidr && !Security.validateCIDR(vpcCidr)) {
        autoSplitElement.textContent = 'Invalid CIDR format. Use format: 10.0.0.0/16';
        autoSplitElement.style.color = '#ef4444'; // Red color for error
        return;
    }

    // Calculate subnets based on availability zones (fixed to 3)
    // Optimized /16 split: /20 subnets (4096 IPs each)
    const azCount = 3;
    if (vpcCidr) {
        const [baseIp, prefix] = vpcCidr.split('/');
        const octets = baseIp.split('.').map(Number);

        if (prefix === '16') {
            // Show optimized /20 ranges
            const publicRange = azCount > 1
                ? `${octets[0]}.${octets[1]}.0.0/20-${octets[0]}.${octets[1]}.32.0/20`
                : `${octets[0]}.${octets[1]}.0.0/20`;
            const privateRange = azCount > 1
                ? `${octets[0]}.${octets[1]}.48.0/20-${octets[0]}.${octets[1]}.80.0/20`
                : `${octets[0]}.${octets[1]}.48.0/20`;
            const dbRange = azCount > 1
                ? `${octets[0]}.${octets[1]}.96.0/20-${octets[0]}.${octets[1]}.128.0/20`
                : `${octets[0]}.${octets[1]}.96.0/20`;

            autoSplitElement.textContent = `Public (${publicRange}), Private (${privateRange}), DB (${dbRange})`;
            autoSplitElement.style.color = ''; // Reset to default color
        } else {
            autoSplitElement.textContent = 'Auto-split works best with /16 CIDR';
            autoSplitElement.style.color = '#9ca3af'; // Gray color
        }
    } else {
        autoSplitElement.textContent = 'Auto-split: Enter valid VPC CIDR';
        autoSplitElement.style.color = '#9ca3af'; // Gray color
    }
}

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

    // Environment checkboxes - use capture phase to run before cost calculator
    document.querySelectorAll('.environments input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', handleEnvironmentChange, true); // Capture phase = runs first
    });

    // Cloud provider radio buttons
    document.querySelectorAll('input[name="cloudProvider"]').forEach(radio => {
        radio.addEventListener('change', handleProviderChange);
    });

    // CI provider radio buttons
    document.querySelectorAll('input[name="ciProvider"]').forEach(radio => {
        radio.addEventListener('change', handleCIProviderChange);
    });

    // Advanced options toggle
    document.getElementById('toggleAdvanced').addEventListener('click', toggleAdvancedOptions);

    // IP range inputs - update diagram and auto-split text on change
    const debouncedUpdateDiagram = debounce(() => updateDiagram(), 300);
    const envMapping = {
        'ipRangeDev': 'dev',
        'ipRangeStaging': 'staging',
        'ipRangeProd': 'prod'
    };

    ['ipRangeDev', 'ipRangeStaging', 'ipRangeProd'].forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', () => {
                const env = envMapping[id];
                updateAutoSplitText(env); // Update text immediately
                debouncedUpdateDiagram(); // Update diagram with debounce
            });
        }
    });

    // Region select - update diagram on change
    const regionSelect = document.getElementById('region');
    if (regionSelect) {
        regionSelect.addEventListener('change', () => updateDiagram());
    }

    // Generate button
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);

    // Close modal
    document.getElementById('closeModal').addEventListener('click', closeModal);

    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', () => auth.login());
    document.getElementById('logoutBtn').addEventListener('click', () => auth.logout());

    // Project Name - clear errors and update diagram in real-time
    document.getElementById('projectName').addEventListener('input', function() {
        if (this.classList.contains('error')) {
            clearError(this);
        }
        debouncedUpdateDiagram();
    });

    // AWS Account ID - clear errors and update diagram in real-time
    const awsAccountIdInput = document.getElementById('awsAccountId');
    awsAccountIdInput.addEventListener('input', function() {
        if (this.classList.contains('error')) {
            clearError(this);
        }
        debouncedUpdateDiagram();
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
 * - Prevents unchecking the last selected environment
 * - Updates diagram and component list
 * - Shows/hides IP range inputs based on selected environments
 * Uses capture phase (addEventListener 3rd param = true) to run before cost calculator
 * @param {Event} e - Checkbox change event
 * @returns {void}
 */
function handleEnvironmentChange(e) {
    const checkbox = e.target;
    const allCheckboxes = document.querySelectorAll('.environments input[type="checkbox"]');

    // In change event, checkbox state is already NEW (after change)
    const currentlyChecked = Array.from(allCheckboxes).filter(cb => cb.checked);

    // If no checkboxes are checked after this change, revert it immediately
    if (currentlyChecked.length === 0) {
        // Stop propagation to prevent cost calculator from seeing 0 environments
        e.stopImmediatePropagation();
        // Force checkbox back to checked state
        checkbox.checked = true;
        // Don't update our state or UI
        return;
    }

    // Valid state - update our state variable
    selectedEnvironments = currentlyChecked.map(cb => cb.value);

    // Update IP range visibility and diagram
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
 * Handle CI provider radio button changes
 * @param {Event} e - Radio change event
 * @returns {void}
 */
function handleCIProviderChange(e) {
    selectedCIProvider = e.target.value;
    updateComponentList(); // Update component list to show correct CI/CD config
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

    if (selectedComponents.includes('rds')) {
        items.push('✅ Aurora PostgreSQL Serverless v2');
        items.push('✅ Auto-scaling database capacity');
        items.push('✅ AWS Secrets Manager integration');
    }

    // CI/CD configuration
    const ciProviderNames = {
        'gitlab': 'GitLab CI/CD pipeline',
        'github': 'GitHub Actions workflow',
        'azuredevops': 'Azure DevOps pipeline'
    };
    const ciConfigName = ciProviderNames[selectedCIProvider] || 'CI/CD configuration';
    items.push(`✅ ${ciConfigName}`);

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
    const container = svg.parentElement;

    // Adaptive width: full container for 1 env, scales down for multiple
    const envCount = selectedEnvironments.length;
    const hasEKS = selectedComponents.includes('eks-auto');
    const hasRDS = selectedComponents.includes('rds');

    // Calculate viewBox width: use consistent calculation for proper proportions
    // For single environment, use container-based width for proper scaling
    // SVG will scale via width: 100% to fill container
    let viewBoxWidth;
    if (envCount === 1) {
        // Use container width for single environment to match other blocks
        // This ensures the diagram fills the full width like other right panel elements
        const containerWidth = container.clientWidth; // No padding to subtract
        viewBoxWidth = Math.max(containerWidth, 600); // Minimum 600px for readability
    } else {
        // Multiple environments: calculate needed width for all environments
        viewBoxWidth = 260 * envCount + 120;
    }

    // Calculate height based on components - made more compact
    const height = (hasEKS && hasRDS) ? 530 : (hasEKS || hasRDS) ? 450 : 370;

    // Clear existing
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${height}`);
    svg.setAttribute('height', height); // Set dynamic height based on content

    // Set width: full for 1 env, fixed with scroll for multiple
    if (envCount === 1) {
        svg.style.width = '100%';
        svg.style.minWidth = '';
        svg.style.maxWidth = '';
        container.style.overflowX = 'hidden';
        container.setAttribute('data-scrollable', 'false');
    } else {
        svg.style.width = `${viewBoxWidth}px`;
        svg.style.minWidth = `${viewBoxWidth}px`;
        svg.style.maxWidth = `${viewBoxWidth}px`;
        container.style.overflowX = 'auto';
        container.setAttribute('data-scrollable', 'true');
    }

    const isDark = theme.isDark();

    // Theme-aware colors
    const colors = isDark ? {
        envLight: '#374151',
        envProd: '#1e3a5f',
        vpc: '#1f2937',
        public: '#1e3a5f',
        private: '#78350f',
        database: '#065f46',
        eks: '#4c1d95',
        rds: '#164e63',
        text: '#f9fafb',
        textSecondary: '#9ca3af',
        border: {
            env: '#3b82f6',
            vpc: '#10b981',
            public: '#0ea5e9',
            private: '#f59e0b',
            database: '#10b981',
            eks: '#8b5cf6',
            rds: '#06b6d4'
        }
    } : {
        envLight: '#f3f4f6',
        envProd: '#dbeafe',
        vpc: '#ffffff',
        public: '#e0f2fe',
        private: '#fef3c7',
        database: '#d1fae5',
        eks: '#ddd6fe',
        rds: '#cffafe',
        text: '#1f2937',
        textSecondary: '#6b7280',
        border: {
            env: '#3b82f6',
            vpc: '#10b981',
            public: '#0ea5e9',
            private: '#f59e0b',
            database: '#10b981',
            eks: '#8b5cf6',
            rds: '#06b6d4'
        }
    };

    // Provider badge
    const providerNames = {
        'aws': 'AWS',
        'gcp': 'GCP',
        'azure': 'Azure'
    };

    // Get AWS Account ID and Region from inputs
    const awsAccountIdInput = document.getElementById('awsAccountId');
    const awsAccountId = awsAccountIdInput ? awsAccountIdInput.value.trim() : '';
    const regionSelect = document.getElementById('region');
    const region = regionSelect ? regionSelect.value : '';

    // Outer provider container
    const outerPadding = 10;
    const outerX = outerPadding;
    const outerY = 50; // Increased from 40 to give more space for header
    const outerWidth = viewBoxWidth - outerPadding * 2;
    const outerHeight = (hasEKS && hasRDS) ? 460 : (hasEKS || hasRDS) ? 380 : 300;

    // Draw outer container with provider branding
    addRect(svg, outerX, outerY, outerWidth, outerHeight, 'transparent', colors.border.env, 3);

    // Provider header
    const headerY = 20;

    // AWS Logo (official AWS logo)
    if (selectedProvider === 'aws') {
        const logoX = 24;
        const logoY = headerY - 3;
        const scale = 0.15; // Scale down the original logo

        // Create group for the logo
        const logoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        logoGroup.setAttribute('transform', `translate(${logoX}, ${logoY}) scale(${scale})`);

        // AWS text (dark color)
        const awsText = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        awsText.setAttribute('d', 'M86.4,66.4c0,3.7,0.4,6.7,1.1,8.9c0.8,2.2,1.8,4.6,3.2,7.2c0.5,0.8,0.7,1.6,0.7,2.3c0,1-0.6,2-1.9,3l-6.3,4.2c-0.9,0.6-1.8,0.9-2.6,0.9c-1,0-2-0.5-3-1.4C76.2,90,75,88.4,74,86.8c-1-1.7-2-3.6-3.1-5.9c-7.8,9.2-17.6,13.8-29.4,13.8c-8.4,0-15.1-2.4-20-7.2c-4.9-4.8-7.4-11.2-7.4-19.2c0-8.5,3-15.4,9.1-20.6c6.1-5.2,14.2-7.8,24.5-7.8c3.4,0,6.9,0.3,10.6,0.8c3.7,0.5,7.5,1.3,11.5,2.2v-7.3c0-7.6-1.6-12.9-4.7-16c-3.2-3.1-8.6-4.6-16.3-4.6c-3.5,0-7.1,0.4-10.8,1.3c-3.7,0.9-7.3,2-10.8,3.4c-1.6,0.7-2.8,1.1-3.5,1.3c-0.7,0.2-1.2,0.3-1.6,0.3c-1.4,0-2.1-1-2.1-3.1v-4.9c0-1.6,0.2-2.8,0.7-3.5c0.5-0.7,1.4-1.4,2.8-2.1c3.5-1.8,7.7-3.3,12.6-4.5c4.9-1.3,10.1-1.9,15.6-1.9c11.9,0,20.6,2.7,26.2,8.1c5.5,5.4,8.3,13.6,8.3,24.6V66.4z M45.8,81.6c3.3,0,6.7-0.6,10.3-1.8c3.6-1.2,6.8-3.4,9.5-6.4c1.6-1.9,2.8-4,3.4-6.4c0.6-2.4,1-5.3,1-8.7v-4.2c-2.9-0.7-6-1.3-9.2-1.7c-3.2-0.4-6.3-0.6-9.4-0.6c-6.7,0-11.6,1.3-14.9,4c-3.3,2.7-4.9,6.5-4.9,11.5c0,4.7,1.2,8.2,3.7,10.6C37.7,80.4,41.2,81.6,45.8,81.6z M126.1,92.4c-1.8,0-3-0.3-3.8-1c-0.8-0.6-1.5-2-2.1-3.9L96.7,10.2c-0.6-2-0.9-3.3-0.9-4c0-1.6,0.8-2.5,2.4-2.5h9.8c1.9,0,3.2,0.3,3.9,1c0.8,0.6,1.4,2,2,3.9l16.8,66.2l15.6-66.2c0.5-2,1.1-3.3,1.9-3.9c0.8-0.6,2.2-1,4-1h8c1.9,0,3.2,0.3,4,1c0.8,0.6,1.5,2,1.9,3.9l15.8,67l17.3-67c0.6-2,1.3-3.3,2-3.9c0.8-0.6,2.1-1,3.9-1h9.3c1.6,0,2.5,0.8,2.5,2.5c0,0.5-0.1,1-0.2,1.6c-0.1,0.6-0.3,1.4-0.7,2.5l-24.1,77.3c-0.6,2-1.3,3.3-2.1,3.9c-0.8,0.6-2.1,1-3.8,1h-8.6c-1.9,0-3.2-0.3-4-1c-0.8-0.7-1.5-2-1.9-4L156,23l-15.4,64.4c-0.5,2-1.1,3.3-1.9,4c-0.8,0.7-2.2,1-4,1H126.1z M254.6,95.1c-5.2,0-10.4-0.6-15.4-1.8c-5-1.2-8.9-2.5-11.5-4c-1.6-0.9-2.7-1.9-3.1-2.8c-0.4-0.9-0.6-1.9-0.6-2.8v-5.1c0-2.1,0.8-3.1,2.3-3.1c0.6,0,1.2,0.1,1.8,0.3c0.6,0.2,1.5,0.6,2.5,1c3.4,1.5,7.1,2.7,11,3.5c4,0.8,7.9,1.2,11.9,1.2c6.3,0,11.2-1.1,14.6-3.3c3.4-2.2,5.2-5.4,5.2-9.5c0-2.8-0.9-5.1-2.7-7c-1.8-1.9-5.2-3.6-10.1-5.2L246,52c-7.3-2.3-12.7-5.7-16-10.2c-3.3-4.4-5-9.3-5-14.5c0-4.2,0.9-7.9,2.7-11.1c1.8-3.2,4.2-6,7.2-8.2c3-2.3,6.4-4,10.4-5.2c4-1.2,8.2-1.7,12.6-1.7c2.2,0,4.5,0.1,6.7,0.4c2.3,0.3,4.4,0.7,6.5,1.1c2,0.5,3.9,1,5.7,1.6c1.8,0.6,3.2,1.2,4.2,1.8c1.4,0.8,2.4,1.6,3,2.5c0.6,0.8,0.9,1.9,0.9,3.3v4.7c0,2.1-0.8,3.2-2.3,3.2c-0.8,0-2.1-0.4-3.8-1.2c-5.7-2.6-12.1-3.9-19.2-3.9c-5.7,0-10.2,0.9-13.3,2.8c-3.1,1.9-4.7,4.8-4.7,8.9c0,2.8,1,5.2,3,7.1c2,1.9,5.7,3.8,11,5.5l14.2,4.5c7.2,2.3,12.4,5.5,15.5,9.6c3.1,4.1,4.6,8.8,4.6,14c0,4.3-0.9,8.2-2.6,11.6c-1.8,3.4-4.2,6.4-7.3,8.8c-3.1,2.5-6.8,4.3-11.1,5.6C264.4,94.4,259.7,95.1,254.6,95.1z');
        awsText.setAttribute('fill', colors.text);
        logoGroup.appendChild(awsText);

        // Orange smile
        const smile = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        smile.setAttribute('d', 'M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z');
        smile.setAttribute('fill', '#FF9900');
        logoGroup.appendChild(smile);

        // Orange arrow
        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrow.setAttribute('d', 'M287.2,128.1c-4.2-5.4-27.8-2.6-38.5-1.3c-3.2,0.4-3.7-2.4-0.8-4.5c18.8-13.2,49.7-9.4,53.3-5c3.6,4.5-1,35.4-18.6,50.2c-2.7,2.3-5.3,1.1-4.1-1.9C282.5,155.7,291.4,133.4,287.2,128.1z');
        arrow.setAttribute('fill', '#FF9900');
        logoGroup.appendChild(arrow);

        svg.appendChild(logoGroup);
    }

    // Title with provider
    addText(svg, 70, headerY + 5, `${providerNames[selectedProvider]} Cloud Architecture`, 'bold', 'start', colors.text);

    // Get Project Name from input
    const projectNameInput = document.getElementById('projectName');
    const projectName = projectNameInput ? projectNameInput.value.trim() : '';

    // Build metadata line: Project | Account | Region | AZs
    if (selectedProvider === 'aws') {
        let detailsText = '';
        const parts = [];

        if (projectName) {
            parts.push(`Project: ${projectName}`);
        }
        if (awsAccountId) {
            parts.push(`Account: ${awsAccountId}`);
        }
        if (region) {
            parts.push(`Region: ${region}`);
        }
        parts.push('3 AZs'); // Always 3 Availability Zones

        detailsText = parts.join(' | ');

        if (detailsText) {
            addText(svg, 70, headerY + 18, detailsText, 'tiny', 'start', colors.textSecondary);
        }
    }

    // Draw environments with equal spacing
    const innerPadding = 15; // Equal padding from outer container to environments
    const envGap = 10; // Gap between environments
    const availableWidth = outerWidth - innerPadding * 2;
    const totalGaps = Math.max(0, (envCount - 1) * envGap);
    const envWidth = (availableWidth - totalGaps) / envCount;

    selectedEnvironments.forEach((env, i) => {
        const x = outerX + innerPadding + i * (envWidth + envGap);
        const y = outerY + innerPadding; // Same padding as sides

        // Get VPC CIDR for this environment
        const vpcCidr = getVPCCIDR(env);
        const [baseIp] = vpcCidr.split('/');
        const [oct1, oct2] = baseIp.split('.');

        // Show compact range for 3 AZs (instead of just first subnet)
        const publicCidr = `${oct1}.${oct2}.0-32/20`;
        const privateCidr = `${oct1}.${oct2}.48-80/20`;
        const databaseCidr = `${oct1}.${oct2}.96-128/20`;

        // Environment box
        const boxHeight = (hasEKS && hasRDS) ? 440 : (hasEKS || hasRDS) ? 340 : 240;
        const envBoxWidth = envWidth; // Use full envWidth without subtraction
        addRect(svg, x, y, envBoxWidth, boxHeight, env === 'prod' ? colors.envProd : colors.envLight, colors.border.env);
        addText(svg, x + envBoxWidth / 2, y + 20, env.toUpperCase(), 'bold', 'middle', colors.text);

        // VPC with CIDR
        const vpcY = y + 40;
        const vpcHeight = (hasEKS && hasRDS) ? 360 : (hasEKS || hasRDS) ? 260 : 160;
        const vpcPadding = 15;
        const vpcWidth = envBoxWidth - vpcPadding * 2;
        addRect(svg, x + vpcPadding, vpcY, vpcWidth, vpcHeight, colors.vpc, colors.border.vpc);
        addText(svg, x + envBoxWidth / 2, vpcY + 18, 'VPC', 'normal', 'middle', colors.text);
        addText(svg, x + envBoxWidth / 2, vpcY + 35, vpcCidr, 'tiny', 'middle', colors.textSecondary);

        // Subnets with CIDR details (3 subnets: Public, Private, Database)
        const subnetY = vpcY + 50;
        const subnetHeight = 70;
        const subnetGap = 6;
        const subnetPadding = 18;
        const totalSubnetWidth = vpcWidth - subnetPadding * 2;
        const subnetWidth = (totalSubnetWidth - 2 * subnetGap) / 3;

        // Public subnet
        addRect(svg, x + vpcPadding + subnetPadding, subnetY, subnetWidth, subnetHeight, colors.public, colors.border.public);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 18, 'Public', 'small', 'middle', colors.text);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 36, publicCidr, 'tiny', 'middle', colors.textSecondary);
        addText(svg, x + vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 53, '3 AZs', 'tiny', 'middle', colors.textSecondary);

        // Private subnet
        const privateX = x + vpcPadding + subnetPadding + subnetWidth + subnetGap;
        addRect(svg, privateX, subnetY, subnetWidth, subnetHeight, colors.private, colors.border.private);
        addText(svg, privateX + subnetWidth / 2, subnetY + 18, 'Private', 'small', 'middle', colors.text);
        addText(svg, privateX + subnetWidth / 2, subnetY + 36, privateCidr, 'tiny', 'middle', colors.textSecondary);
        addText(svg, privateX + subnetWidth / 2, subnetY + 53, '3 AZs', 'tiny', 'middle', colors.textSecondary);

        // Database subnet
        const databaseX = privateX + subnetWidth + subnetGap;
        addRect(svg, databaseX, subnetY, subnetWidth, subnetHeight, colors.database, colors.border.database);
        addText(svg, databaseX + subnetWidth / 2, subnetY + 18, 'Database', 'small', 'middle', colors.text);
        addText(svg, databaseX + subnetWidth / 2, subnetY + 36, databaseCidr, 'tiny', 'middle', colors.textSecondary);
        addText(svg, databaseX + subnetWidth / 2, subnetY + 53, '3 AZs', 'tiny', 'middle', colors.textSecondary);

        // EKS if selected
        let currentY = subnetY + 90;
        if (hasEKS) {
            const eksY = currentY;
            const eksWidth = vpcWidth - subnetPadding * 2;
            addRect(svg, x + vpcPadding + subnetPadding, eksY, eksWidth, 90, colors.eks, colors.border.eks);
            addText(svg, x + envBoxWidth / 2, eksY + 25, 'EKS Cluster', 'normal', 'middle', colors.text);
            addText(svg, x + envBoxWidth / 2, eksY + 45, 'Auto Mode', 'small', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, eksY + 63, 'Automatic Node', 'tiny', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, eksY + 76, 'Provisioning', 'tiny', 'middle', colors.textSecondary);
            currentY = eksY + 100;
        }

        // RDS if selected
        if (hasRDS) {
            const rdsY = currentY;
            const rdsWidth = vpcWidth - subnetPadding * 2;
            addRect(svg, x + vpcPadding + subnetPadding, rdsY, rdsWidth, 90, colors.rds, colors.border.rds);
            addText(svg, x + envBoxWidth / 2, rdsY + 20, 'RDS Aurora', 'normal', 'middle', colors.text);
            addText(svg, x + envBoxWidth / 2, rdsY + 38, 'PostgreSQL', 'small', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, rdsY + 56, 'Serverless v2', 'tiny', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, rdsY + 70, 'Multi-AZ', 'tiny', 'middle', colors.textSecondary);
        }
    });

    // Legend - positioned inside the outer container
    const legendY = outerY + outerHeight - 15;
    const legendX = outerX + 20; // Start from inside the container
    let legendOffset = 0;

    addText(svg, legendX + legendOffset, legendY, `● ${providerNames[selectedProvider]} VPC`, 'small', 'start', colors.border.vpc);
    legendOffset += 120;

    if (hasEKS) {
        addText(svg, legendX + legendOffset, legendY, '● EKS Auto Mode', 'small', 'start', colors.border.eks);
        legendOffset += 130;
    }

    if (hasRDS) {
        addText(svg, legendX + legendOffset, legendY, '● RDS Aurora', 'small', 'start', colors.border.rds);
    }

    addText(svg, outerX + outerWidth - 20, legendY, '● Multi-AZ', 'tiny', 'end', colors.textSecondary);
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
    // Add error class to form group
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
    }

    // Find validation message container
    const validationId = input.id + 'Validation';
    const validationMsg = document.getElementById(validationId);

    if (validationMsg) {
        validationMsg.textContent = message;
        validationMsg.className = 'validation-message error show';
    } else {
        // Fallback: use old method if validation container not found
        const existingError = input.parentElement.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        input.parentNode.insertBefore(errorDiv, input.nextSibling);
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
    const availabilityZones = '3'; // Fixed to 3 AZs for high availability

    // Collect VPC CIDRs for selected environments
    const vpcCidrs = {};
    selectedEnvironments.forEach(env => {
        const inputId = `ipRange${env.charAt(0).toUpperCase() + env.slice(1)}`;
        const input = document.getElementById(inputId);
        const customCidr = input ? input.value.trim() : '';
        if (customCidr) {
            vpcCidrs[env] = customCidr;
        }
    });

    // If authenticated, trigger workflow directly
    if (auth.isAuthenticated()) {
        try {
            showModalSafe('⚡ Triggering Workflow', 'Please wait...');

            const workflowInputs = {
                project_name: projectName,
                components: components,
                environments: environments,
                region: region,
                aws_account_id: awsAccountId,
                ci_provider: selectedCIProvider,
                availability_zones: availabilityZones
            };

            // Add VPC CIDRs if any were specified
            if (Object.keys(vpcCidrs).length > 0) {
                workflowInputs.vpc_cidrs = JSON.stringify(vpcCidrs);
            }

            const runId = await auth.triggerWorkflow(workflowInputs);

            // Close initial modal
            closeModal();

            // Start real-time monitoring if we got a run ID
            if (runId) {
                // Initialize workflow monitor
                workflowMonitor = new WorkflowMonitor(auth.token, GITHUB_REPO);
                await workflowMonitor.startMonitoring(runId);
            } else {
                // Fallback if run ID not available
                const workflowUrl = `https://github.com/${GITHUB_REPO}/actions`;
                showModalSafe(
                    '✅ Workflow Triggered!',
                    'Your infrastructure generation has been started.\n\nWe couldn\'t retrieve the run ID for real-time monitoring, but the workflow is running.',
                    [{
                        text: 'View Workflow →',
                        href: workflowUrl,
                        className: 'btn-primary'
                    }]
                );
            }

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
 * Close the modal dialog
 * Removes the 'show' class to hide the modal
 * @returns {void}
 */
function closeModal() {
    document.getElementById('modal').classList.remove('show');
}
