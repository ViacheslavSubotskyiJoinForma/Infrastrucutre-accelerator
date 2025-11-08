#!/usr/bin/env node

/**
 * Node.js tests for cloud provider features
 * Tests CIDR calculation and IP range functionality
 */

// CIDR Calculation Function (extracted from app.js)
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

// Default CIDR ranges
const defaultCIDRs = {
    'dev': '10.0.0.0/16',
    'staging': '10.1.0.0/16',
    'prod': '10.2.0.0/16'
};

// Test suite
const tests = [
    // CIDR Calculation Tests - Dev Environment
    {
        name: 'CIDR: Dev public subnet (10.0.0.0/16 -> 10.0.0.0/20)',
        fn: () => calculateSubnetCIDR('10.0.0.0/16', 0),
        expected: '10.0.0.0/20'
    },
    {
        name: 'CIDR: Dev private subnet (10.0.0.0/16 -> 10.0.16.0/20)',
        fn: () => calculateSubnetCIDR('10.0.0.0/16', 1),
        expected: '10.0.16.0/20'
    },

    // CIDR Calculation Tests - Staging Environment
    {
        name: 'CIDR: Staging public subnet (10.1.0.0/16 -> 10.1.0.0/20)',
        fn: () => calculateSubnetCIDR('10.1.0.0/16', 0),
        expected: '10.1.0.0/20'
    },
    {
        name: 'CIDR: Staging private subnet (10.1.0.0/16 -> 10.1.16.0/20)',
        fn: () => calculateSubnetCIDR('10.1.0.0/16', 1),
        expected: '10.1.16.0/20'
    },

    // CIDR Calculation Tests - Prod Environment
    {
        name: 'CIDR: Prod public subnet (10.2.0.0/16 -> 10.2.0.0/20)',
        fn: () => calculateSubnetCIDR('10.2.0.0/16', 0),
        expected: '10.2.0.0/20'
    },
    {
        name: 'CIDR: Prod private subnet (10.2.0.0/16 -> 10.2.16.0/20)',
        fn: () => calculateSubnetCIDR('10.2.0.0/16', 1),
        expected: '10.2.16.0/20'
    },

    // CIDR Calculation Tests - Custom Ranges
    {
        name: 'CIDR: Custom range 192.168.0.0/16 -> public',
        fn: () => calculateSubnetCIDR('192.168.0.0/16', 0),
        expected: '192.168.0.0/20'
    },
    {
        name: 'CIDR: Custom range 192.168.0.0/16 -> private',
        fn: () => calculateSubnetCIDR('192.168.0.0/16', 1),
        expected: '192.168.16.0/20'
    },
    {
        name: 'CIDR: Custom range 172.16.0.0/16 -> public',
        fn: () => calculateSubnetCIDR('172.16.0.0/16', 0),
        expected: '172.16.0.0/20'
    },
    {
        name: 'CIDR: Custom range 172.16.0.0/16 -> private',
        fn: () => calculateSubnetCIDR('172.16.0.0/16', 1),
        expected: '172.16.16.0/20'
    },

    // Edge Cases
    {
        name: 'CIDR: Empty string returns empty',
        fn: () => calculateSubnetCIDR('', 0),
        expected: ''
    },
    {
        name: 'CIDR: No slash returns empty',
        fn: () => calculateSubnetCIDR('10.0.0.0', 0),
        expected: ''
    },
    {
        name: 'CIDR: Non-/16 prefix returns base/20',
        fn: () => calculateSubnetCIDR('10.0.0.0/24', 0),
        expected: '10.0.0.0/20'
    },

    // Default CIDR Tests
    {
        name: 'Defaults: Dev environment CIDR',
        fn: () => defaultCIDRs['dev'],
        expected: '10.0.0.0/16'
    },
    {
        name: 'Defaults: Staging environment CIDR',
        fn: () => defaultCIDRs['staging'],
        expected: '10.1.0.0/16'
    },
    {
        name: 'Defaults: Prod environment CIDR',
        fn: () => defaultCIDRs['prod'],
        expected: '10.2.0.0/16'
    },

    // CIDR Range Validation Tests
    {
        name: 'CIDR: Third octet calculation (index 0)',
        fn: () => {
            const result = calculateSubnetCIDR('10.5.0.0/16', 0);
            const thirdOctet = result.split('.')[2];
            return thirdOctet === '0';
        },
        expected: true
    },
    {
        name: 'CIDR: Third octet calculation (index 1)',
        fn: () => {
            const result = calculateSubnetCIDR('10.5.0.0/16', 1);
            const thirdOctet = result.split('.')[2];
            return thirdOctet === '16';
        },
        expected: true
    },

    // Multi-environment subnet segregation
    {
        name: 'Segregation: Dev and Staging ranges do not overlap',
        fn: () => {
            const devPublic = calculateSubnetCIDR(defaultCIDRs.dev, 0);
            const stagingPublic = calculateSubnetCIDR(defaultCIDRs.staging, 0);
            return devPublic !== stagingPublic;
        },
        expected: true
    },
    {
        name: 'Segregation: Staging and Prod ranges do not overlap',
        fn: () => {
            const stagingPrivate = calculateSubnetCIDR(defaultCIDRs.staging, 1);
            const prodPrivate = calculateSubnetCIDR(defaultCIDRs.prod, 1);
            return stagingPrivate !== prodPrivate;
        },
        expected: true
    },
    {
        name: 'Segregation: Public and Private subnets differ within same VPC',
        fn: () => {
            const publicSubnet = calculateSubnetCIDR('10.0.0.0/16', 0);
            const privateSubnet = calculateSubnetCIDR('10.0.0.0/16', 1);
            return publicSubnet !== privateSubnet;
        },
        expected: true
    }
];

// Run tests
let passed = 0;
let failed = 0;

console.log('🧪 Running Cloud Features Tests\n');

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

// Display subnet calculations for all environments
console.log('\n📋 Subnet Calculations Summary:');
console.log('================================');
Object.entries(defaultCIDRs).forEach(([env, vpcCidr]) => {
    const publicCidr = calculateSubnetCIDR(vpcCidr, 0);
    const privateCidr = calculateSubnetCIDR(vpcCidr, 1);
    console.log(`${env.toUpperCase()}:`);
    console.log(`  VPC:     ${vpcCidr}`);
    console.log(`  Public:  ${publicCidr}`);
    console.log(`  Private: ${privateCidr}`);
});

if (failed > 0) {
    console.log('\n❌ Some tests failed');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}
