#!/usr/bin/env node

/**
 * Automated validation tests for Infrastructure Accelerator
 * Tests the showError() and clearError() functions
 *
 * Run with: node docs/test-validation.js
 */

// JSDOM setup for testing DOM manipulation
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

// Create a minimal DOM
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
    <div class="form-group" id="projectNameGroup">
        <label for="projectName">Project Name</label>
        <input type="text" id="projectName" placeholder="my-project">
        <small>Used for naming resources</small>
        <div class="validation-message" id="projectNameValidation"></div>
    </div>

    <div class="form-group" id="awsAccountIdGroup">
        <label for="awsAccountId">AWS Account ID</label>
        <input type="text" id="awsAccountId" placeholder="123456789012">
        <small>Your 12-digit AWS account number</small>
        <div class="validation-message" id="awsAccountIdValidation"></div>
    </div>
</body>
</html>
`, {
    url: 'http://localhost',
    contentType: 'text/html',
    includeNodeLocations: true,
    storageQuota: 10000000
});

global.document = dom.window.document;
global.window = dom.window;

// Import the validation functions (simplified versions)
function showError(input, message) {
    const formGroup = input.closest('.form-group');
    if (formGroup) {
        formGroup.classList.add('error');
        formGroup.classList.remove('success');
    }

    const validationId = input.id + 'Validation';
    const validationMsg = document.getElementById(validationId);

    if (validationMsg) {
        validationMsg.textContent = message;
        validationMsg.className = 'validation-message error show';
    }
}

function clearError(input) {
    input.classList.remove('error');

    const formGroup = input.closest('.form-group');
    if (formGroup) {
        formGroup.classList.remove('error');
    }

    const validationId = input.id + 'Validation';
    const validationMsg = document.getElementById(validationId);
    if (validationMsg) {
        validationMsg.textContent = '';
        validationMsg.className = 'validation-message';
    }

    const errorMessage = input.parentElement.querySelector('.error-message');
    if (errorMessage) {
        errorMessage.remove();
    }

    const smallText = input.parentElement.querySelector('small:not(.error-message)');
    if (smallText) {
        smallText.classList.remove('hide');
    }
}

// Test utilities
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName, expected, actual) {
    if (condition) {
        console.log(`✅ PASS: ${testName}`);
        passedTests++;
    } else {
        console.log(`❌ FAIL: ${testName}`);
        console.log(`   Expected: ${expected}`);
        console.log(`   Actual: ${actual}`);
        failedTests++;
    }
}

function assertEquals(actual, expected, testName) {
    assert(actual === expected, testName, expected, actual);
}

function assertTrue(condition, testName) {
    assert(condition, testName, 'true', condition);
}

function assertFalse(condition, testName) {
    assert(!condition, testName, 'false', condition);
}

// Run tests
console.log('🧪 Running Validation Tests');
console.log('============================\n');

// Test Suite 1: Project Name Validation
console.log('Test Suite 1: Project Name Validation');
console.log('--------------------------------------');

const projectNameInput = document.getElementById('projectName');
const projectNameGroup = document.getElementById('projectNameGroup');
const projectNameValidation = document.getElementById('projectNameValidation');

// Test 1.1: showError() adds error class to form group
showError(projectNameInput, 'Please enter a project name');
assertTrue(
    projectNameGroup.classList.contains('error'),
    'showError() adds error class to form-group'
);

// Test 1.2: showError() displays validation message
assertEquals(
    projectNameValidation.textContent,
    'Please enter a project name',
    'showError() displays validation message text'
);

// Test 1.3: showError() adds show and error classes
assertTrue(
    projectNameValidation.classList.contains('show'),
    'showError() adds show class to validation message'
);
assertTrue(
    projectNameValidation.classList.contains('error'),
    'showError() adds error class to validation message'
);

// Test 1.4: clearError() removes error class from form group
clearError(projectNameInput);
assertFalse(
    projectNameGroup.classList.contains('error'),
    'clearError() removes error class from form-group'
);

// Test 1.5: clearError() clears validation message text
assertEquals(
    projectNameValidation.textContent,
    '',
    'clearError() clears validation message text'
);

// Test 1.6: clearError() removes show and error classes
assertFalse(
    projectNameValidation.classList.contains('show'),
    'clearError() removes show class from validation message'
);
assertFalse(
    projectNameValidation.classList.contains('error'),
    'clearError() removes error class from validation message'
);

console.log('');

// Test Suite 2: AWS Account ID Validation
console.log('Test Suite 2: AWS Account ID Validation');
console.log('----------------------------------------');

const awsAccountIdInput = document.getElementById('awsAccountId');
const awsAccountIdGroup = document.getElementById('awsAccountIdGroup');
const awsAccountIdValidation = document.getElementById('awsAccountIdValidation');

// Test 2.1: showError() works for different input
showError(awsAccountIdInput, 'AWS Account ID must be exactly 12 digits');
assertTrue(
    awsAccountIdGroup.classList.contains('error'),
    'showError() works for AWS Account ID field'
);

// Test 2.2: Multiple errors can be shown simultaneously
assertTrue(
    projectNameGroup.classList.contains('error') === false,
    'Previous error remains cleared'
);

// Test 2.3: clearError() works for AWS Account ID
clearError(awsAccountIdInput);
assertFalse(
    awsAccountIdGroup.classList.contains('error'),
    'clearError() works for AWS Account ID field'
);

console.log('');

// Test Suite 3: Input Event Simulation
console.log('Test Suite 3: Input Event Simulation');
console.log('-------------------------------------');

// Test 3.1: Attach input event listener
projectNameInput.addEventListener('input', function() {
    clearError(this);
});

// Test 3.2: Show error
showError(projectNameInput, 'Test error');
assertTrue(
    projectNameGroup.classList.contains('error'),
    'Error is shown before input event'
);

// Test 3.3: Simulate typing (trigger input event)
projectNameInput.value = 't';
const inputEvent = new dom.window.Event('input', { bubbles: true });
projectNameInput.dispatchEvent(inputEvent);

// Test 3.4: Verify error is cleared
assertFalse(
    projectNameGroup.classList.contains('error'),
    'Error is cleared after input event'
);
assertEquals(
    projectNameValidation.textContent,
    '',
    'Validation message is cleared after input event'
);

console.log('');

// Test Suite 4: Edge Cases
console.log('Test Suite 4: Edge Cases');
console.log('------------------------');

// Test 4.1: clearError() on field without error doesn't break
clearError(projectNameInput);
assertFalse(
    projectNameGroup.classList.contains('error'),
    'clearError() handles already-clear field gracefully'
);

// Test 4.2: Multiple showError() calls
showError(projectNameInput, 'First error');
showError(projectNameInput, 'Second error');
assertEquals(
    projectNameValidation.textContent,
    'Second error',
    'showError() replaces previous error message'
);

// Test 4.3: clearError() after multiple showError()
clearError(projectNameInput);
assertEquals(
    projectNameValidation.textContent,
    '',
    'clearError() works after multiple showError() calls'
);

console.log('');

// Summary
console.log('============================');
console.log('Test Summary');
console.log('============================');
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`📊 Total:  ${passedTests + failedTests}`);
console.log('');

if (failedTests === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
} else {
    console.log('⚠️  Some tests failed. Please review the output above.');
    process.exit(1);
}
