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

    // Update backend options placeholder when project name or AWS account ID changes
    const projectNameInput = document.getElementById('projectName');
    const awsAccountIdInput = document.getElementById('awsAccountId');
    if (projectNameInput) {
        projectNameInput.addEventListener('input', updateBackendOptions);
    }
    if (awsAccountIdInput) {
        awsAccountIdInput.addEventListener('input', updateBackendOptions);
    }

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
        // Always call clearError - it handles the case when there's no error
        clearError(this);
        debouncedUpdateDiagram();
    });

    // AWS Account ID - clear errors and update diagram in real-time
    if (awsAccountIdInput) {
        awsAccountIdInput.addEventListener('input', function() {
            // Always call clearError - it handles the case when there's no error
            clearError(this);
            debouncedUpdateDiagram();
        });
    }
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
    updateBackendOptions();
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
 * Update backend configuration options based on terraform-backend component selection
 * - Shows S3 backend options only if terraform-backend is selected
 * - Dynamically updates placeholder with project name and AWS account ID
 * @returns {void}
 */
function updateBackendOptions() {
    const s3Options = document.getElementById('s3BackendOptions');
    const stateBucketInput = document.getElementById('stateBucket');

    if (selectedComponents.includes('terraform-backend')) {
        s3Options.classList.remove('hidden');

        // Update placeholder dynamically
        const projectName = document.getElementById('projectName')?.value.trim() || 'my-project';
        const awsAccountId = document.getElementById('awsAccountId')?.value.trim() || '123456789012';
        stateBucketInput.placeholder = `${projectName}-terraform-state-${awsAccountId}`;
    } else {
        s3Options.classList.add('hidden');
    }
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
    const groups = [];

    if (selectedComponents.includes('terraform-backend')) {
        groups.push({
            title: 'Terraform Backend',
            items: [
                'S3 bucket for Terraform state',
                'S3 native state locking (Terraform 1.10+)',
                'Encryption and versioning enabled'
            ]
        });
    }

    groups.push({
        title: 'VPC Networking',
        items: [
            'VPC with multi-AZ subnets',
            'NAT Gateway and Internet Gateway',
            'Security Groups and Network ACLs'
        ]
    });

    if (selectedComponents.includes('eks-auto')) {
        groups.push({
            title: 'EKS Auto Mode',
            items: [
                'EKS Auto Mode cluster',
                'Automatic node provisioning',
                'IAM roles and policies'
            ]
        });
    }

    if (selectedComponents.includes('rds')) {
        groups.push({
            title: 'RDS Database',
            items: [
                'Aurora PostgreSQL Serverless v2',
                'Auto-scaling database capacity',
                'AWS Secrets Manager integration'
            ]
        });
    }

    // CI/CD configuration
    const ciProviderNames = {
        'gitlab': 'GitLab CI/CD',
        'github': 'GitHub Actions',
        'azuredevops': 'Azure DevOps'
    };
    const ciTitle = ciProviderNames[selectedCIProvider] || 'CI/CD';
    groups.push({
        title: ciTitle,
        items: [
            `${ciProviderNames[selectedCIProvider] || 'CI/CD'} pipeline configuration`,
            'Automated validation and deployment',
            'Environment-specific workflows'
        ]
    });

    // Render grouped list
    list.innerHTML = groups.map(group => `
        <li class="component-group">
            <strong>${group.title}:</strong>
            <ul class="component-items">
                ${group.items.map(item => `<li>✅ ${item}</li>`).join('')}
            </ul>
        </li>
    `).join('');
}

/**
 * Update the architecture diagram SVG based on selected components and environments
 *
 * This function uses a dynamic layout system that automatically calculates diagram
 * dimensions based on selected components. This makes it easy to add new components
 * without hardcoding heights for every possible combination.
 *
 * HOW TO ADD NEW COMPONENTS:
 * ==========================
 *
 * 1. Add component height to COMPONENT_HEIGHTS object:
 *    ```
 *    const COMPONENT_HEIGHTS = {
 *      ...
 *      myNewComponent: 85,  // Height in pixels
 *    };
 *    ```
 *
 * 2. Add component detection:
 *    ```
 *    const hasMyComponent = selectedComponents.includes('my-component');
 *    ```
 *
 * 3. Update vpcContentHeight calculation:
 *    ```
 *    if (hasMyComponent) {
 *      vpcContentHeight += GAPS.afterSubnets + COMPONENT_HEIGHTS.myNewComponent;
 *    }
 *    ```
 *
 * 4. Add rendering code in the environment loop:
 *    ```
 *    if (hasMyComponent) {
 *      const myComponentY = currentY;
 *      addRect(...);
 *      addText(...);
 *      currentY = myComponentY + COMPONENT_HEIGHTS.myNewComponent + GAPS.betweenComponents;
 *    }
 *    ```
 *
 * The diagram will automatically adjust its height and maintain proper spacing!
 *
 * @returns {void}
 */
function updateDiagram() {
    const svg = document.getElementById('diagram');
    const container = svg.parentElement;

    // Adaptive width: full container for 1 env, scales down for multiple
    const envCount = selectedEnvironments.length;
    const hasEKS = selectedComponents.includes('eks-auto');
    const hasRDS = selectedComponents.includes('rds');

    // Component height configuration (easily extensible for new components)
    // To add a new component: just add its height here and follow the steps above
    const COMPONENT_HEIGHTS = {
        subnet: 70,       // Height of subnet blocks
        eks: 80,          // Height of EKS block
        rds: 80,          // Height of RDS block
        // Add new components here: componentName: heightInPixels
    };

    // Gap and padding configuration
    // Adjust these to change spacing throughout the diagram
    const GAPS = {
        outerPadding: 15,     // Padding from outer container to environment boxes (top and sides)
        envHeader: 40,        // Space for environment name
        vpcPadding: 15,       // Padding inside VPC container
        vpcHeader: 50,        // Space for VPC name and CIDR
        afterSubnets: 5,      // Gap after subnet blocks
        betweenComponents: 5, // Gap between components (EKS, RDS, etc.)
        afterLastComponent: 10, // Gap after last component before VPC bottom
        legendHeight: 6,      // Height reserved for legend (accounting for text descent)
        legendPadding: 20,    // Padding above legend (space between env blocks and legend)
        legendBottomPadding: 0, // No padding - text descent provides natural spacing
    };

    // Calculate VPC content height dynamically
    let vpcContentHeight = COMPONENT_HEIGHTS.subnet; // Subnets always present

    // Add additional components
    if (hasEKS) {
        vpcContentHeight += GAPS.afterSubnets + COMPONENT_HEIGHTS.eks;
    }
    if (hasRDS) {
        vpcContentHeight += (hasEKS ? GAPS.betweenComponents : GAPS.afterSubnets) + COMPONENT_HEIGHTS.rds;
    }

    // Add gap after last component (prevents VPC box from touching components)
    vpcContentHeight += GAPS.afterLastComponent;

    // Calculate total heights
    const vpcHeight = GAPS.vpcHeader + vpcContentHeight;
    const envBoxHeight = GAPS.envHeader + vpcHeight + GAPS.vpcPadding * 2;
    const outerHeight = envBoxHeight + GAPS.outerPadding + GAPS.legendPadding + GAPS.legendHeight + GAPS.legendBottomPadding;
    const totalHeight = 50 + outerHeight; // 50 = header space

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

    const height = totalHeight;

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

    // Draw outer container with provider branding
    addRect(svg, outerX, outerY, outerWidth, outerHeight, 'transparent', colors.border.env, 3);

    // Provider header
    const headerY = 20;

    // AWS Logo (smile only, no text)
    if (selectedProvider === 'aws') {
        const logoX = 28;
        const logoY = headerY - 10; // Lifted up for better centering
        const scale = 0.11; // Smaller scale for smile-only logo

        // Create group for the logo
        const logoGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        logoGroup.setAttribute('transform', `translate(${logoX}, ${logoY}) scale(${scale})`);

        // Orange smile (Amazon smile from a to z)
        const smile = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        smile.setAttribute('d', 'M273.5,143.7c-32.9,24.3-80.7,37.2-121.8,37.2c-57.6,0-109.5-21.3-148.7-56.7c-3.1-2.8-0.3-6.6,3.4-4.4c42.4,24.6,94.7,39.5,148.8,39.5c36.5,0,76.6-7.6,113.5-23.2C274.2,133.6,278.9,139.7,273.5,143.7z');
        smile.setAttribute('fill', '#FF9900');
        logoGroup.appendChild(smile);

        // Orange arrow at the end of smile
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
    const envGap = 10; // Gap between environments
    const availableWidth = outerWidth - GAPS.outerPadding * 2;
    const totalGaps = Math.max(0, (envCount - 1) * envGap);
    const envWidth = (availableWidth - totalGaps) / envCount;

    selectedEnvironments.forEach((env, i) => {
        const x = outerX + GAPS.outerPadding + i * (envWidth + envGap);
        const y = outerY + GAPS.outerPadding; // Same padding as sides

        // Get VPC CIDR for this environment
        const vpcCidr = getVPCCIDR(env);
        const [baseIp] = vpcCidr.split('/');
        const [oct1, oct2] = baseIp.split('.');

        // Show compact range for 3 AZs (instead of just first subnet)
        const publicCidr = `${oct1}.${oct2}.0-32/20`;
        const privateCidr = `${oct1}.${oct2}.48-80/20`;
        const databaseCidr = `${oct1}.${oct2}.96-128/20`;

        // Environment box (using dynamically calculated height)
        const envBoxWidth = envWidth; // Use full envWidth without subtraction
        addRect(svg, x, y, envBoxWidth, envBoxHeight, env === 'prod' ? colors.envProd : colors.envLight, colors.border.env);
        addText(svg, x + envBoxWidth / 2, y + 20, env.toUpperCase(), 'bold', 'middle', colors.text);

        // VPC with CIDR (using dynamically calculated height)
        const vpcY = y + GAPS.envHeader;
        const vpcWidth = envBoxWidth - GAPS.vpcPadding * 2;
        addRect(svg, x + GAPS.vpcPadding, vpcY, vpcWidth, vpcHeight, colors.vpc, colors.border.vpc);
        addText(svg, x + envBoxWidth / 2, vpcY + 18, 'VPC', 'normal', 'middle', colors.text);
        addText(svg, x + envBoxWidth / 2, vpcY + 35, vpcCidr, 'tiny', 'middle', colors.textSecondary);

        // Subnets with CIDR details (3 subnets: Public, Private, Database)
        const subnetY = vpcY + GAPS.vpcHeader;
        const subnetHeight = COMPONENT_HEIGHTS.subnet;
        const subnetGap = 6;
        const subnetPadding = 18;
        const totalSubnetWidth = vpcWidth - subnetPadding * 2;
        const subnetWidth = (totalSubnetWidth - 2 * subnetGap) / 3;

        // Public subnet
        addRect(svg, x + GAPS.vpcPadding + subnetPadding, subnetY, subnetWidth, subnetHeight, colors.public, colors.border.public);
        addText(svg, x + GAPS.vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 18, 'Public', 'small', 'middle', colors.text);
        addText(svg, x + GAPS.vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 36, publicCidr, 'tiny', 'middle', colors.textSecondary);
        addText(svg, x + GAPS.vpcPadding + subnetPadding + subnetWidth / 2, subnetY + 53, '3 AZs', 'tiny', 'middle', colors.textSecondary);

        // Private subnet
        const privateX = x + GAPS.vpcPadding + subnetPadding + subnetWidth + subnetGap;
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

        // EKS if selected (using dynamic positioning)
        let currentY = subnetY + subnetHeight + GAPS.afterSubnets;
        if (hasEKS) {
            const eksY = currentY;
            const eksWidth = vpcWidth - subnetPadding * 2;
            addRect(svg, x + GAPS.vpcPadding + subnetPadding, eksY, eksWidth, COMPONENT_HEIGHTS.eks, colors.eks, colors.border.eks);
            addText(svg, x + envBoxWidth / 2, eksY + 22, 'EKS Cluster', 'normal', 'middle', colors.text);
            addText(svg, x + envBoxWidth / 2, eksY + 40, 'Auto Mode', 'small', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, eksY + 56, 'Automatic Node', 'tiny', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, eksY + 68, 'Provisioning', 'tiny', 'middle', colors.textSecondary);
            currentY = eksY + COMPONENT_HEIGHTS.eks + GAPS.betweenComponents;
        }

        // RDS if selected (using dynamic positioning)
        if (hasRDS) {
            const rdsY = currentY;
            const rdsWidth = vpcWidth - subnetPadding * 2;
            addRect(svg, x + GAPS.vpcPadding + subnetPadding, rdsY, rdsWidth, COMPONENT_HEIGHTS.rds, colors.rds, colors.border.rds);
            addText(svg, x + envBoxWidth / 2, rdsY + 18, 'RDS Aurora', 'normal', 'middle', colors.text);
            addText(svg, x + envBoxWidth / 2, rdsY + 35, 'PostgreSQL', 'small', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, rdsY + 50, 'Serverless v2', 'tiny', 'middle', colors.textSecondary);
            addText(svg, x + envBoxWidth / 2, rdsY + 64, 'Multi-AZ', 'tiny', 'middle', colors.textSecondary);
        }
    });

    // Legend - positioned inside outer container at the bottom
    const legendY = outerY + GAPS.outerPadding + envBoxHeight + GAPS.legendPadding;
    const legendX = outerX + GAPS.outerPadding; // Align with environment boxes
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

    // Clear form group error state
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        formGroup.classList.remove('error');
    }

    // Clear new validation message container
    const validationId = input.id + 'Validation';
    const validationMsg = document.getElementById(validationId);
    if (validationMsg) {
        validationMsg.textContent = '';
        validationMsg.className = 'validation-message'; // Remove show and error classes
    }

    // Clear old error message (fallback)
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

            // Collect backend configuration
            // Auto-determine backend type based on terraform-backend component selection
            const backendType = selectedComponents.includes('terraform-backend') ? 's3' : 'local';
            const stateBucketInput = document.getElementById('stateBucket')?.value.trim() || '';
            // Use custom bucket name or generate default
            const defaultBucketName = `${projectName}-terraform-state-${awsAccountId}`;
            const stateBucket = stateBucketInput || defaultBucketName;

            const workflowInputs = {
                project_name: projectName,
                components: components,
                environments: environments,
                region: region,
                aws_account_id: awsAccountId,
                ci_provider: selectedCIProvider,
                backend_type: backendType
            };

            // Add VPC CIDRs if any were specified
            if (Object.keys(vpcCidrs).length > 0) {
                workflowInputs.vpc_cidrs = JSON.stringify(vpcCidrs);
            }

            // Add S3 backend configuration if terraform-backend is selected
            if (backendType === 's3') {
                workflowInputs.state_bucket = stateBucket;
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
