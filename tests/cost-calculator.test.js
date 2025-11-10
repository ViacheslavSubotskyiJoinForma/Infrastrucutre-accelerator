#!/usr/bin/env node

/**
 * Node.js tests for Cost Calculator
 * Tests cost calculation logic, regional pricing, and dependency resolution
 */

// Mock CostCalculator class with testable methods extracted
class CostCalculatorTest {
    constructor() {
        this.regionMultipliers = {
            'us-east-1': 1.0,
            'us-west-2': 1.0,
            'eu-west-1': 1.05,
            'eu-central-1': 1.07,
            'ap-southeast-1': 1.12
        };

        this.baseCosts = {
            'vpc': {
                dev: 35,
                staging: 35,
                prod: 105
            },
            'eks-auto': {
                dev: 85,
                staging: 130,
                prod: 220
            },
            'rds': {
                dev: 10,
                staging: 45,
                prod: 350
            },
            'services': {
                dev: 25,
                staging: 45,
                prod: 85
            }
        };

        this.currentRegion = 'us-east-1';
    }

    getRegionalCost(baseCost) {
        const multiplier = this.regionMultipliers[this.currentRegion] || 1.0;
        return Math.round(baseCost * multiplier);
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

    calculateTotalCost(components, environments) {
        // Add dependencies
        const componentsWithDeps = [...new Set([...components, ...components.flatMap(c => this.getDependencies(c))])];

        let totalCost = 0;
        componentsWithDeps.forEach(component => {
            environments.forEach(env => {
                const baseCost = this.baseCosts[component]?.[env] || 0;
                const regionalCost = this.getRegionalCost(baseCost);
                totalCost += regionalCost;
            });
        });

        return totalCost;
    }
}

// Test suite
const tests = [
    // Regional Cost Calculation Tests
    {
        name: 'Regional Cost: US East baseline (1.0x)',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            return calc.getRegionalCost(100);
        },
        expected: 100
    },
    {
        name: 'Regional Cost: US West same as East (1.0x)',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-west-2';
            return calc.getRegionalCost(100);
        },
        expected: 100
    },
    {
        name: 'Regional Cost: EU West Ireland (1.05x)',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'eu-west-1';
            return calc.getRegionalCost(100);
        },
        expected: 105
    },
    {
        name: 'Regional Cost: EU Central Frankfurt (1.07x)',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'eu-central-1';
            return calc.getRegionalCost(100);
        },
        expected: 107
    },
    {
        name: 'Regional Cost: Asia Pacific Singapore (1.12x)',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'ap-southeast-1';
            return calc.getRegionalCost(100);
        },
        expected: 112
    },
    {
        name: 'Regional Cost: Unknown region defaults to 1.0x',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'unknown-region';
            return calc.getRegionalCost(100);
        },
        expected: 100
    },
    {
        name: 'Regional Cost: Rounds to nearest integer',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'eu-central-1';
            return calc.getRegionalCost(99); // 99 * 1.07 = 105.93
        },
        expected: 106
    },

    // Dependency Resolution Tests
    {
        name: 'Dependencies: VPC has no dependencies',
        fn: () => {
            const calc = new CostCalculatorTest();
            return calc.getDependencies('vpc').length;
        },
        expected: 0
    },
    {
        name: 'Dependencies: EKS-Auto depends on VPC',
        fn: () => {
            const calc = new CostCalculatorTest();
            const deps = calc.getDependencies('eks-auto');
            return deps.includes('vpc');
        },
        expected: true
    },
    {
        name: 'Dependencies: RDS depends on VPC',
        fn: () => {
            const calc = new CostCalculatorTest();
            const deps = calc.getDependencies('rds');
            return deps.includes('vpc');
        },
        expected: true
    },
    {
        name: 'Dependencies: Services depends on VPC and EKS-Auto',
        fn: () => {
            const calc = new CostCalculatorTest();
            const deps = calc.getDependencies('services');
            return deps.includes('vpc') && deps.includes('eks-auto');
        },
        expected: true
    },
    {
        name: 'Dependencies: Unknown component returns empty array',
        fn: () => {
            const calc = new CostCalculatorTest();
            return calc.getDependencies('unknown-component').length;
        },
        expected: 0
    },

    // Base Cost Verification Tests
    {
        name: 'Base Cost: VPC dev environment',
        fn: () => {
            const calc = new CostCalculatorTest();
            return calc.baseCosts.vpc.dev;
        },
        expected: 35
    },
    {
        name: 'Base Cost: VPC prod environment (3 NAT Gateways)',
        fn: () => {
            const calc = new CostCalculatorTest();
            return calc.baseCosts.vpc.prod;
        },
        expected: 105
    },
    {
        name: 'Base Cost: EKS-Auto prod environment',
        fn: () => {
            const calc = new CostCalculatorTest();
            return calc.baseCosts['eks-auto'].prod;
        },
        expected: 220
    },
    {
        name: 'Base Cost: RDS dev (serverless sleep mode)',
        fn: () => {
            const calc = new CostCalculatorTest();
            return calc.baseCosts.rds.dev;
        },
        expected: 10
    },
    {
        name: 'Base Cost: RDS prod (Multi-AZ)',
        fn: () => {
            const calc = new CostCalculatorTest();
            return calc.baseCosts.rds.prod;
        },
        expected: 350
    },

    // Total Cost Calculation Tests
    {
        name: 'Total Cost: VPC only, dev environment, US East',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            return calc.calculateTotalCost(['vpc'], ['dev']);
        },
        expected: 35
    },
    {
        name: 'Total Cost: VPC only, prod environment, US East',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            return calc.calculateTotalCost(['vpc'], ['prod']);
        },
        expected: 105
    },
    {
        name: 'Total Cost: EKS-Auto includes VPC dependency, dev, US East',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // EKS-Auto (85) + VPC (35) = 120
            return calc.calculateTotalCost(['eks-auto'], ['dev']);
        },
        expected: 120
    },
    {
        name: 'Total Cost: VPC + EKS-Auto, dev, US East',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // VPC (35) + EKS-Auto (85) = 120
            return calc.calculateTotalCost(['vpc', 'eks-auto'], ['dev']);
        },
        expected: 120
    },
    {
        name: 'Total Cost: VPC + EKS-Auto + RDS, dev, US East',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // VPC (35) + EKS-Auto (85) + RDS (10) = 130
            return calc.calculateTotalCost(['vpc', 'eks-auto', 'rds'], ['dev']);
        },
        expected: 130
    },
    {
        name: 'Total Cost: VPC + EKS-Auto + RDS, prod, US East',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // VPC (105) + EKS-Auto (220) + RDS (350) = 675
            return calc.calculateTotalCost(['vpc', 'eks-auto', 'rds'], ['prod']);
        },
        expected: 675
    },
    {
        name: 'Total Cost: VPC + EKS-Auto, all environments, US East',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // Dev: VPC (35) + EKS (85) = 120
            // Staging: VPC (35) + EKS (130) = 165
            // Prod: VPC (105) + EKS (220) = 325
            // Total: 120 + 165 + 325 = 610
            return calc.calculateTotalCost(['vpc', 'eks-auto'], ['dev', 'staging', 'prod']);
        },
        expected: 610
    },
    {
        name: 'Total Cost: VPC only, dev, EU Frankfurt (1.07x)',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'eu-central-1';
            // VPC dev (35) * 1.07 = 37.45 → 37 (rounded)
            return calc.calculateTotalCost(['vpc'], ['dev']);
        },
        expected: 37
    },
    {
        name: 'Total Cost: VPC + EKS-Auto, dev, Singapore (1.12x)',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'ap-southeast-1';
            // VPC (35) * 1.12 = 39.2 → 39
            // EKS (85) * 1.12 = 95.2 → 95
            // Total: 39 + 95 = 134
            return calc.calculateTotalCost(['vpc', 'eks-auto'], ['dev']);
        },
        expected: 134
    },

    // Services Dependency Tests
    {
        name: 'Total Cost: Services includes VPC and EKS-Auto dependencies',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // Services (25) + EKS-Auto (85) + VPC (35) = 145
            return calc.calculateTotalCost(['services'], ['dev']);
        },
        expected: 145
    },

    // Edge Cases
    {
        name: 'Total Cost: Empty components array',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            return calc.calculateTotalCost([], ['dev']);
        },
        expected: 0
    },
    {
        name: 'Total Cost: Empty environments array',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            return calc.calculateTotalCost(['vpc'], []);
        },
        expected: 0
    },
    {
        name: 'Total Cost: Unknown component has no cost',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            return calc.calculateTotalCost(['unknown-component'], ['dev']);
        },
        expected: 0
    },

    // Duplicate Component Handling
    {
        name: 'Duplicate Components: VPC counted once even if specified twice',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // Should be same as single VPC (35), not doubled
            return calc.calculateTotalCost(['vpc', 'vpc'], ['dev']);
        },
        expected: 35
    },
    {
        name: 'Duplicate Components: EKS-Auto + VPC, VPC not counted twice',
        fn: () => {
            const calc = new CostCalculatorTest();
            calc.currentRegion = 'us-east-1';
            // EKS-Auto depends on VPC, so explicitly adding VPC shouldn\'t double it
            // Should be: VPC (35) + EKS-Auto (85) = 120
            return calc.calculateTotalCost(['vpc', 'eks-auto'], ['dev']);
        },
        expected: 120
    }
];

// Run tests
let passed = 0;
let failed = 0;

console.log('🧪 Running Cost Calculator Tests\n');

tests.forEach((test, i) => {
    let result;
    let error = null;

    try {
        result = test.fn();
    } catch (e) {
        result = false;
        error = e.message;
    }

    const success = result === test.expected;

    if (success) {
        passed++;
        console.log(`✅ Test ${i + 1}: ${test.name}`);
    } else {
        failed++;
        console.log(`❌ Test ${i + 1}: ${test.name}`);
        console.log(`   Expected: ${test.expected}, Got: ${result}`);
        if (error) console.log(`   Error: ${error}`);
    }
});

console.log(`\n📊 Results: ${passed}/${tests.length} passed, ${failed} failed`);

if (failed > 0) {
    console.log('❌ Some tests failed');
    process.exit(1);
} else {
    console.log('✅ All tests passed!');
    process.exit(0);
}
