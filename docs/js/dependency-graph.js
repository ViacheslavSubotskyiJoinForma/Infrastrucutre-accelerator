/**
 * Dependency Graph Visualization
 * Handles interactive component dependency visualization
 */

class DependencyGraph {
    constructor() {
        this.dependencies = {
            'vpc': [],
            'eks-auto': ['vpc'],
            'rds': ['vpc'],
            'services': ['vpc', 'eks-auto']
        };

        this.init();
    }

    init() {
        // Listen to component checkbox changes
        const componentCheckboxes = document.querySelectorAll('input[type="checkbox"][value="vpc"], input[type="checkbox"][value="eks-auto"], input[type="checkbox"][value="rds"], input[type="checkbox"][value="services"]');

        componentCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.updateGraph());
        });

        // Initial update
        this.updateGraph();
    }

    getSelectedComponents() {
        const selected = [];
        const checkboxes = document.querySelectorAll('input[type="checkbox"][value="vpc"], input[type="checkbox"][value="eks-auto"], input[type="checkbox"][value="rds"], input[type="checkbox"][value="services"]');

        checkboxes.forEach(checkbox => {
            if (checkbox.checked && !checkbox.disabled) {
                selected.push(checkbox.value);
            }
        });

        return selected;
    }

    getRequiredDependencies(selected) {
        const required = new Set(selected);

        selected.forEach(component => {
            const deps = this.dependencies[component] || [];
            deps.forEach(dep => required.add(dep));
        });

        return Array.from(required);
    }

    updateGraph() {
        const selected = this.getSelectedComponents();
        const required = this.getRequiredDependencies(selected);
        const autoAdded = required.filter(comp => !selected.includes(comp));

        // Update node states
        Object.keys(this.dependencies).forEach(component => {
            const node = document.getElementById(`node-${component}`);
            if (!node) return;

            // Remove all state classes
            node.classList.remove('active', 'auto-added');

            // Add appropriate class
            if (selected.includes(component)) {
                node.classList.add('active');
            } else if (autoAdded.includes(component)) {
                node.classList.add('auto-added');
            }
        });

        // Update dependency lines
        this.updateDependencyLines(selected, required);
    }

    updateDependencyLines(selected, required) {
        // Update each dependency line
        Object.keys(this.dependencies).forEach(component => {
            const deps = this.dependencies[component] || [];

            deps.forEach(dep => {
                const line = document.getElementById(`dep-${dep}-${component}`);
                if (!line) return;

                // Line is active if target component is selected or auto-added
                if (required.includes(component)) {
                    line.classList.add('active');
                } else {
                    line.classList.remove('active');
                }
            });
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new DependencyGraph();
    });
} else {
    new DependencyGraph();
}
