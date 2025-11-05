// Component dependencies mapping
const DEPENDENCIES = {
    vpc: [],
    rds: ['vpc'],
    secrets: ['eks', 'services'],
    eks: ['vpc'],
    services: ['vpc', 'eks'],
    opensearch: ['vpc', 'services', 'eks'],
    monitoring: ['vpc', 'eks', 'services', 'rds'],
    common: []
};

// GitHub configuration
const GITHUB_OWNER = 'ViacheslavSubotskyiJoinForma';
const GITHUB_REPO = 'Infrastrucutre-accelerator';
const WORKFLOW_FILE = 'generate-infrastructure.yml';

// State
let selectedComponents = new Set(['vpc']);
let allComponents = new Set(['vpc']);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    updatePreview();
    validateForm();
});

function initializeEventListeners() {
    // Form inputs
    document.getElementById('project-name').addEventListener('input', updatePreview);
    document.getElementById('environments').addEventListener('input', updatePreview);
    document.getElementById('region').addEventListener('change', updatePreview);
    document.getElementById('github-token').addEventListener('input', validateForm);

    // Component checkboxes
    document.querySelectorAll('.component-card input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', handleComponentChange);
    });

    // Generate button
    document.getElementById('generate-btn').addEventListener('click', generateInfrastructure);
}

function handleComponentChange(event) {
    const component = event.target.value;
    const isChecked = event.target.checked;

    if (isChecked) {
        selectedComponents.add(component);
        // Add dependencies
        addDependencies(component);
    } else {
        selectedComponents.delete(component);
        // Check if this component is required by others
        checkDependents(component);
    }

    updateComponentStates();
    updatePreview();
}

function addDependencies(component) {
    const deps = DEPENDENCIES[component] || [];
    deps.forEach(dep => {
        selectedComponents.add(dep);
        const checkbox = document.getElementById(`comp-${dep}`);
        if (checkbox && !checkbox.checked) {
            checkbox.checked = true;
            checkbox.disabled = true;
        }
    });
}

function checkDependents(component) {
    // Check if any selected component depends on this one
    for (const selected of selectedComponents) {
        const deps = DEPENDENCIES[selected] || [];
        if (deps.includes(component)) {
            // Re-add the component
            selectedComponents.add(component);
            const checkbox = document.getElementById(`comp-${component}`);
            if (checkbox) {
                checkbox.checked = true;
                alert(`Cannot deselect ${component} because ${selected} depends on it.`);
            }
            return;
        }
    }

    // Enable checkboxes that were disabled as dependencies
    document.querySelectorAll('.component-card input[type="checkbox"]').forEach(checkbox => {
        const comp = checkbox.value;
        if (!selectedComponents.has(comp)) {
            checkbox.disabled = false;
        }
    });
}

function updateComponentStates() {
    // Recalculate all components including auto-added dependencies
    allComponents = new Set(selectedComponents);

    selectedComponents.forEach(component => {
        const deps = DEPENDENCIES[component] || [];
        deps.forEach(dep => allComponents.add(dep));
    });
}

function updatePreview() {
    // Project name
    const projectName = document.getElementById('project-name').value || 'my-infrastructure';
    document.getElementById('preview-project').textContent = projectName;

    // Environments
    const environments = document.getElementById('environments').value || 'dev, uat, prod';
    document.getElementById('preview-environments').textContent = environments;

    // Region
    const region = document.getElementById('region').value;
    document.getElementById('preview-region').textContent = region;

    // Selected components
    const componentsDiv = document.getElementById('preview-components');
    componentsDiv.innerHTML = '';

    selectedComponents.forEach(comp => {
        const tag = document.createElement('span');
        tag.className = 'tag';
        tag.textContent = comp;
        componentsDiv.appendChild(tag);
    });

    // Dependencies
    const dependencies = new Set();
    selectedComponents.forEach(component => {
        const deps = DEPENDENCIES[component] || [];
        deps.forEach(dep => {
            if (!selectedComponents.has(dep)) {
                dependencies.add(dep);
            }
        });
    });

    const depsContainer = document.getElementById('preview-dependencies-container');
    const depsDiv = document.getElementById('preview-dependencies');

    if (dependencies.size > 0) {
        depsContainer.style.display = 'block';
        depsDiv.innerHTML = '';
        dependencies.forEach(dep => {
            const tag = document.createElement('span');
            tag.className = 'tag dependency';
            tag.textContent = dep;
            depsDiv.appendChild(tag);
        });
    } else {
        depsContainer.style.display = 'none';
    }

    validateForm();
}

function validateForm() {
    const projectName = document.getElementById('project-name').value.trim();
    const environments = document.getElementById('environments').value.trim();
    const githubToken = document.getElementById('github-token').value.trim();
    const hasComponents = selectedComponents.size > 0;

    const isValid = projectName && environments && githubToken && hasComponents;
    document.getElementById('generate-btn').disabled = !isValid;
}

async function generateInfrastructure() {
    const btn = document.getElementById('generate-btn');
    const statusSection = document.getElementById('status-section');
    const statusContent = document.getElementById('status-content');

    // Disable button
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating...';

    // Show status
    statusSection.style.display = 'block';
    statusContent.innerHTML = `
        <div class="status-message loading">
            <i class="fas fa-spinner fa-spin"></i>
            <strong>Preparing workflow...</strong>
        </div>
    `;

    try {
        // Get form data
        const projectName = document.getElementById('project-name').value.trim();
        const environments = document.getElementById('environments').value.trim();
        const region = document.getElementById('region').value;
        const stateBucket = document.getElementById('state-bucket').value.trim();
        const dynamodbTable = document.getElementById('dynamodb-table').value.trim();
        const useAssumeRole = document.getElementById('use-assume-role').checked;
        const githubToken = document.getElementById('github-token').value.trim();

        // Build component list
        const components = Array.from(selectedComponents).sort().join(',');

        // Prepare workflow inputs
        const inputs = {
            project_name: projectName,
            component_preset: 'custom',
            custom_components: components,
            environments: environments,
            region: region,
            use_assume_role: useAssumeRole
        };

        if (stateBucket) inputs.state_bucket = stateBucket;
        if (dynamodbTable) inputs.dynamodb_table = dynamodbTable;

        statusContent.innerHTML = `
            <div class="status-message loading">
                <i class="fas fa-spinner fa-spin"></i>
                <strong>Triggering GitHub Actions workflow...</strong><br>
                <small>Components: ${components}</small>
            </div>
        `;

        // Call GitHub API
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
            {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `Bearer ${githubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ref: 'main',
                    inputs: inputs
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `GitHub API error: ${response.status} ${response.statusText}`);
        }

        // Success
        statusContent.innerHTML = `
            <div class="status-message success">
                <i class="fas fa-check-circle"></i>
                <strong>Workflow triggered successfully!</strong><br>
                <small>Your infrastructure is being generated.</small>
            </div>
            <div class="status-message loading">
                <i class="fas fa-info-circle"></i>
                <strong>Next steps:</strong><br>
                1. Go to <a href="https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/actions" target="_blank">Actions page</a><br>
                2. Find the "Generate Infrastructure Template" workflow run<br>
                3. Wait for completion (~2-3 minutes)<br>
                4. Download the artifact with generated code<br>
                5. Extract and deploy to your AWS account
            </div>
        `;

        // Reset button after 3 seconds
        setTimeout(() => {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-rocket"></i> Generate Infrastructure';
        }, 3000);

    } catch (error) {
        console.error('Error:', error);

        statusContent.innerHTML = `
            <div class="status-message error">
                <i class="fas fa-exclamation-circle"></i>
                <strong>Error triggering workflow</strong><br>
                <small>${error.message}</small>
            </div>
            <div class="status-message loading">
                <i class="fas fa-lightbulb"></i>
                <strong>Troubleshooting:</strong><br>
                • Check your GitHub token has 'repo' or 'workflow' scope<br>
                • Ensure you have access to the repository<br>
                • Try <a href="https://github.com/settings/tokens" target="_blank">creating a new token</a><br>
                • Check the browser console for details
            </div>
        `;

        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-rocket"></i> Generate Infrastructure';
    }
}

// Helper: Build components with dependencies
function buildComponentsWithDependencies(selected) {
    const result = new Set(selected);

    const addDeps = (component) => {
        const deps = DEPENDENCIES[component] || [];
        deps.forEach(dep => {
            if (!result.has(dep)) {
                result.add(dep);
                addDeps(dep);
            }
        });
    };

    selected.forEach(comp => addDeps(comp));
    return Array.from(result).sort();
}

// Debug helper
window.debugState = () => {
    console.log('Selected:', Array.from(selectedComponents));
    console.log('All (with deps):', Array.from(allComponents));
};
