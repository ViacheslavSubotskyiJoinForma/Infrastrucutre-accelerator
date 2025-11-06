// Configuration
const GITHUB_REPO = 'ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator';
const WORKFLOW_NAME = 'Generate Infrastructure Template (MVP)';

// State
let selectedComponents = ['vpc'];
let selectedEnvironments = ['dev'];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await auth.init();
    setupEventListeners();
    updateDiagram();
    updateComponentList();
});

function setupEventListeners() {
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

    // Title
    addText(svg, width / 2, 30, `Architecture: ${selectedEnvironments.join(', ').toUpperCase()}`, 'bold', 'middle');

    // Draw environments
    const envWidth = (width - 80) / envCount;
    selectedEnvironments.forEach((env, i) => {
        const x = 40 + i * envWidth;
        const y = 60;

        // Environment box
        addRect(svg, x, y, envWidth - 20, height - 100, env === 'prod' ? '#dbeafe' : '#f3f4f6', '#3b82f6');
        addText(svg, x + (envWidth - 20) / 2, y + 30, env.toUpperCase(), 'bold', 'middle');

        // VPC
        addRect(svg, x + 20, y + 60, envWidth - 60, hasEKS ? 220 : 120, '#ffffff', '#10b981');
        addText(svg, x + envWidth / 2, y + 90, 'VPC', 'normal', 'middle');

        // Subnets
        const subnetY = y + 110;
        addRect(svg, x + 30, subnetY, (envWidth - 80) / 2 - 5, 50, '#e0f2fe', '#0ea5e9');
        addText(svg, x + 30 + (envWidth - 80) / 4, subnetY + 25, 'Public', 'small', 'middle');

        addRect(svg, x + envWidth / 2 + 5, subnetY, (envWidth - 80) / 2 - 5, 50, '#fef3c7', '#f59e0b');
        addText(svg, x + envWidth / 2 + 5 + (envWidth - 80) / 4, subnetY + 25, 'Private', 'small', 'middle');

        // EKS if selected
        if (hasEKS) {
            const eksY = subnetY + 70;
            addRect(svg, x + 30, eksY, envWidth - 60, 80, '#ddd6fe', '#8b5cf6');
            addText(svg, x + envWidth / 2, eksY + 25, 'EKS Cluster', 'normal', 'middle');
            addText(svg, x + envWidth / 2, eksY + 50, 'Auto Mode', 'small', 'middle');
        }
    });

    // Legend
    const legendY = height - 30;
    addText(svg, 40, legendY, '● VPC', 'small', 'start', '#10b981');
    if (hasEKS) {
        addText(svg, 120, legendY, '● EKS', 'small', 'start', '#8b5cf6');
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
    const projectName = document.getElementById('projectName').value.trim();
    const region = document.getElementById('region').value;
    const awsAccountId = document.getElementById('awsAccountId').value.trim();

    // Validation
    if (!projectName) {
        alert('Please enter a project name');
        return;
    }

    if (!awsAccountId || !/^\d{12}$/.test(awsAccountId)) {
        alert('Please enter a valid 12-digit AWS Account ID');
        return;
    }

    const components = selectedComponents.join(',');
    const environments = selectedEnvironments.join(',');

    // If authenticated, trigger workflow directly
    if (auth.isAuthenticated()) {
        try {
            showModal(`
                <h3>⚡ Triggering Workflow</h3>
                <p>Please wait...</p>
            `);

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

            showModal(`
                <h3>✅ Workflow Triggered!</h3>
                <p>Your infrastructure generation has been started.</p>
                <p><strong>Configuration:</strong></p>
                <ul style="text-align: left; margin: 1rem 0;">
                    <li>Project: <code>${projectName}</code></li>
                    <li>Components: <code>${components}</code></li>
                    <li>Environments: <code>${environments}</code></li>
                    <li>Region: <code>${region}</code></li>
                    <li>Account: <code>${awsAccountId}</code></li>
                </ul>
                <a href="${workflowUrl}" target="_blank" class="btn-primary" style="display: inline-block; margin-top: 1rem; text-decoration: none;">
                    View Workflow Run →
                </a>
            `, true);
        } catch (error) {
            showModal(`
                <h3>❌ Error</h3>
                <p>${error.message}</p>
                <p>Please try again or trigger manually via GitHub Actions.</p>
                <a href="https://github.com/${GITHUB_REPO}/actions/workflows/generate-infrastructure.yml" target="_blank" class="btn-primary" style="display: inline-block; margin-top: 1rem; text-decoration: none;">
                    Open Workflow →
                </a>
            `, true);
        }
        return;
    }

    // Not authenticated - show manual instructions
    const workflowUrl = `https://github.com/${GITHUB_REPO}/actions/workflows/generate-infrastructure.yml`;

    showModal(`
        <h3>🚀 Ready to Generate!</h3>
        <p>You'll be redirected to GitHub Actions.</p>
        <p><strong>Your configuration:</strong></p>
        <ul style="text-align: left; margin: 1rem 0;">
            <li>Project: <code>${projectName}</code></li>
            <li>Components: <code>${components}</code></li>
            <li>Environments: <code>${environments}</code></li>
            <li>Region: <code>${region}</code></li>
            <li>Account: <code>${awsAccountId}</code></li>
        </ul>
        <p>Click the workflow and enter these values manually.</p>
        <a href="${workflowUrl}" target="_blank" class="btn-primary" style="display: inline-block; margin-top: 1rem; text-decoration: none;">
            Open GitHub Actions →
        </a>
    `, true);

    // Copy configuration to clipboard
    const config = `project_name: ${projectName}
components: ${components}
environments: ${environments}
region: ${region}
aws_account_id: ${awsAccountId}`;

    try {
        await navigator.clipboard.writeText(config);
        console.log('Configuration copied to clipboard');
    } catch (err) {
        console.log('Could not copy to clipboard:', err);
    }
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
