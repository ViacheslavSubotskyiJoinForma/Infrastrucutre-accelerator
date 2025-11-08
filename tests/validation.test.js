#!/usr/bin/env node

/**
 * Node.js test for validation functions
 * Tests Security module validation without browser
 */

// Mock DOM for Node.js environment
const document = {
    createElement: (tag) => ({
        textContent: '',
        innerHTML: '',
        setAttribute: () => {},
        appendChild: () => {},
        cloneNode: () => ({})
    })
};

// Load Security module
const fs = require('fs');
const path = require('path');

const securityCode = fs.readFileSync(
    path.join(__dirname, '../docs/js/security.js'),
    'utf8'
);

// Evaluate and capture Security object
let Security;
const code = securityCode.replace('const Security', 'Security');
eval(code);

// Test suite
const tests = [
    // Project Name Validation
    { name: 'Valid: my-project', fn: () => Security.validateProjectName('my-project'), expected: true },
    { name: 'Valid: test123', fn: () => Security.validateProjectName('test123'), expected: true },
    { name: 'Valid: a', fn: () => Security.validateProjectName('a'), expected: true },
    { name: 'Valid: 63 chars', fn: () => Security.validateProjectName('a'.repeat(63)), expected: true },
    { name: 'Invalid: empty', fn: () => Security.validateProjectName(''), expected: false },
    { name: 'Invalid: uppercase', fn: () => Security.validateProjectName('MyProject'), expected: false },
    { name: 'Invalid: underscore', fn: () => Security.validateProjectName('my_project'), expected: false },
    { name: 'Invalid: starts with -', fn: () => Security.validateProjectName('-test'), expected: false },
    { name: 'Invalid: ends with -', fn: () => Security.validateProjectName('test-'), expected: false },
    { name: 'Invalid: 64 chars', fn: () => Security.validateProjectName('a'.repeat(64)), expected: false },
    { name: 'Invalid: reserved "tmp"', fn: () => Security.validateProjectName('tmp'), expected: false },
    { name: 'Invalid: reserved "admin"', fn: () => Security.validateProjectName('admin'), expected: false },
    { name: 'Invalid: reserved "root"', fn: () => Security.validateProjectName('root'), expected: false },
    { name: 'Invalid: reserved "default"', fn: () => Security.validateProjectName('default'), expected: false },
    { name: 'Invalid: reserved "temp"', fn: () => Security.validateProjectName('temp'), expected: false },

    // AWS Account ID Validation
    { name: 'Valid: 987654321098', fn: () => Security.validateAwsAccountId('987654321098'), expected: true },
    { name: 'Valid: 111111111111', fn: () => Security.validateAwsAccountId('111111111111'), expected: true },
    { name: 'Invalid: test 123456789012', fn: () => Security.validateAwsAccountId('123456789012'), expected: false },
    { name: 'Invalid: test 000000000000', fn: () => Security.validateAwsAccountId('000000000000'), expected: false },
    { name: 'Invalid: empty', fn: () => Security.validateAwsAccountId(''), expected: false },
    { name: 'Invalid: 11 digits', fn: () => Security.validateAwsAccountId('12345678901'), expected: false },
    { name: 'Invalid: 13 digits', fn: () => Security.validateAwsAccountId('1234567890123'), expected: false },
    { name: 'Invalid: letters', fn: () => Security.validateAwsAccountId('12345678901a'), expected: false },
    { name: 'Invalid: spaces', fn: () => Security.validateAwsAccountId('123 456 78901'), expected: false },

    // AWS Region Validation
    { name: 'Valid region: us-east-1', fn: () => Security.validateAwsRegion('us-east-1'), expected: true },
    { name: 'Valid region: eu-west-1', fn: () => Security.validateAwsRegion('eu-west-1'), expected: true },
    { name: 'Valid region: ap-southeast-1', fn: () => Security.validateAwsRegion('ap-southeast-1'), expected: true },
    { name: 'Invalid region: invalid-region', fn: () => Security.validateAwsRegion('invalid-region'), expected: false },
    { name: 'Invalid region: empty', fn: () => Security.validateAwsRegion(''), expected: false },

    // Sanitization
    { name: 'Sanitize: alphanumeric', fn: () => Security.sanitizeInput('test123') === 'test123', expected: true },
    { name: 'Sanitize: hyphens', fn: () => Security.sanitizeInput('my-project') === 'my-project', expected: true },
    { name: 'Sanitize: trim', fn: () => Security.sanitizeInput('  test  ') === 'test', expected: true },
    { name: 'Sanitize: null bytes', fn: () => !Security.sanitizeInput('test\x00').includes('\x00'), expected: true },
];

// Run tests
let passed = 0;
let failed = 0;

console.log('🧪 Running Validation Tests\n');

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
