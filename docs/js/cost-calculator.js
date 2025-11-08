/**
 * Cost Calculator
 * Estimates AWS infrastructure costs based on selected components and environments
 */

class CostCalculator {
    constructor() {
        // Monthly costs in USD (us-east-1 region)
        this.baseCosts = {
            'vpc': {
                dev: 35,      // NAT Gateway (single AZ)
                staging: 35,  // NAT Gateway (single AZ)
                prod: 105     // NAT Gateway (3 AZs)
            },
            'eks-auto': {
                dev: 85,      // EKS cluster ($73) + minimal nodes ($12+)
                staging: 130, // EKS cluster + moderate nodes
                prod: 220     // EKS cluster + production nodes
            },
            'rds': {
                dev: 35,      // db.t3.micro
                staging: 65,  // db.t3.small
                prod: 145     // db.t3.medium + Multi-AZ
            },
            'services': {
                dev: 25,      // API Gateway, Lambda, S3
                staging: 45,
                prod: 85
            }
        };

        this.componentNames = {
            'vpc': 'VPC + Networking',
            'eks-auto': 'EKS Auto Mode',
            'rds': 'RDS Database',
            'services': 'Services'
        };

        this.environmentNames = {
            'dev': 'Development',
            'staging': 'Staging',
            'prod': 'Production'
        };

        this.init();
    }

    init() {
        // Listen to component and environment checkbox changes
        const checkboxes = document.querySelectorAll(
            'input[type="checkbox"][value="vpc"], ' +
            'input[type="checkbox"][value="eks-auto"], ' +
            'input[type="checkbox"][value="rds"], ' +
            'input[type="checkbox"][value="services"], ' +
            'input[type="checkbox"][value="dev"], ' +
            'input[type="checkbox"][value="staging"], ' +
            'input[type="checkbox"][value="prod"]'
        );

        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => this.calculate());
        });

        // Initial calculation
        this.calculate();
    }

    getSelectedComponents() {
        const selected = [];
        const checkboxes = document.querySelectorAll(
            'input[type="checkbox"][value="vpc"], ' +
            'input[type="checkbox"][value="eks-auto"], ' +
            'input[type="checkbox"][value="rds"], ' +
            'input[type="checkbox"][value="services"]'
        );

        checkboxes.forEach(checkbox => {
            if (checkbox.checked && !checkbox.disabled) {
                selected.push(checkbox.value);
            }
        });

        return selected;
    }

    getSelectedEnvironments() {
        const selected = [];
        const checkboxes = document.querySelectorAll(
            'input[type="checkbox"][value="dev"], ' +
            'input[type="checkbox"][value="staging"], ' +
            'input[type="checkbox"][value="prod"]'
        );

        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                selected.push(checkbox.value);
            }
        });

        return selected;
    }

    calculate() {
        const components = this.getSelectedComponents();
        const environments = this.getSelectedEnvironments();

        // Add VPC automatically if other components selected
        const componentsWithDeps = [...new Set([...components, ...components.flatMap(c => this.getDependencies(c))])];

        // Calculate costs
        const costByComponent = {};
        const costByEnvironment = {};
        let totalCost = 0;

        componentsWithDeps.forEach(component => {
            let componentTotal = 0;

            environments.forEach(env => {
                const cost = this.baseCosts[component]?.[env] || 0;
                componentTotal += cost;

                if (!costByEnvironment[env]) {
                    costByEnvironment[env] = 0;
                }
                costByEnvironment[env] += cost;
            });

            costByComponent[component] = componentTotal;
            totalCost += componentTotal;
        });

        // Update UI
        this.updateUI(totalCost, costByComponent, costByEnvironment, components, environments);
    }

    getDependencies(component) {
        const deps = {
            'vpc': [],
            'eks-auto': ['vpc'],
            'rds': ['vpc'],
            'services': ['vpc', 'eks-auto']
        };
        return deps[component] || [];
    }

    updateUI(total, byComponent, byEnvironment, selectedComponents, selectedEnvironments) {
        // Update total
        const totalElement = document.getElementById('totalCost');
        if (totalElement) {
            totalElement.textContent = `$${total.toLocaleString()}`;
        }

        // Update component breakdown
        const componentCostsElement = document.getElementById('componentCosts');
        if (componentCostsElement) {
            componentCostsElement.innerHTML = '';

            Object.keys(byComponent).forEach(component => {
                const cost = byComponent[component];
                const isAutoAdded = !selectedComponents.includes(component);

                const item = document.createElement('div');
                item.className = 'cost-item';
                item.innerHTML = `
                    <span class="cost-item-name">
                        ${this.componentNames[component] || component}
                        ${isAutoAdded ? '<span style="font-size: 0.75rem; opacity: 0.7;"> (auto)</span>' : ''}
                    </span>
                    <span class="cost-item-value">$${cost.toLocaleString()}</span>
                `;
                componentCostsElement.appendChild(item);
            });

            if (Object.keys(byComponent).length === 0) {
                componentCostsElement.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0;">Select components to see cost breakdown</p>';
            }
        }

        // Update environment breakdown
        const environmentCostsElement = document.getElementById('environmentCosts');
        if (environmentCostsElement) {
            environmentCostsElement.innerHTML = '';

            Object.keys(byEnvironment).forEach(env => {
                const cost = byEnvironment[env];

                const item = document.createElement('div');
                item.className = 'cost-item';
                item.innerHTML = `
                    <span class="cost-item-name">${this.environmentNames[env] || env}</span>
                    <span class="cost-item-value">$${cost.toLocaleString()}</span>
                `;
                environmentCostsElement.appendChild(item);
            });

            if (Object.keys(byEnvironment).length === 0) {
                environmentCostsElement.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem; margin: 0;">Select environments to see cost breakdown</p>';
            }
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CostCalculator();
    });
} else {
    new CostCalculator();
}
