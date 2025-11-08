# Infrastructure Accelerator - Test Suite

Comprehensive testing for the Infrastructure Template Generator web UI.

## Test Files

### Node.js Tests (Automated)

#### `validation.test.js`
Tests for input validation and security functions:
- ✅ Project name validation (DNS-compliant, lowercase, hyphens)
- ✅ AWS Account ID validation (12 digits, blocks test IDs)
- ✅ Input sanitization (null bytes, control characters, XSS)

**Run:**
```bash
node tests/validation.test.js
# or
npm run test:validation
```

#### `cloud_features.test.js`
Tests for cloud provider and IP range features:
- ✅ CIDR subnet calculation (public/private auto-split)
- ✅ Default VPC CIDR ranges per environment
- ✅ Custom IP range support
- ✅ Subnet segregation validation
- ✅ Edge cases (empty strings, invalid formats)

**Run:**
```bash
node tests/cloud_features.test.js
# or
npm run test:cloud
```

### Browser Tests (Interactive)

#### `test_validation.html`
Interactive browser-based validation testing:
- Real-time test execution in browser
- Visual test results with pass/fail indicators
- Detailed error messages and expectations
- Automatic test execution on page load

**Run:**
Open `tests/test_validation.html` in a browser

#### `test_cloud_features.html`
Interactive browser-based cloud features testing:
- Cloud provider selection tests
- IP range visibility and state management
- ARIA attributes validation
- DOM structure verification
- Diagram rendering tests
- Current state inspector

**Run:**
Open `tests/test_cloud_features.html` in a browser

## Running All Tests

### Command Line (CI/CD)
```bash
npm test
# or
npm run test:all
```

**Output Example:**
```
🧪 Running Validation Tests
✅ Test 1: Valid: my-project
✅ Test 2: Valid: test123
...
📊 Results: 23/23 passed, 0 failed
✅ All tests passed!

🧪 Running Cloud Features Tests
✅ Test 1: CIDR: Dev public subnet
✅ Test 2: CIDR: Dev private subnet
...
📊 Results: 21/21 passed, 0 failed

📋 Subnet Calculations Summary:
================================
DEV:
  VPC:     10.0.0.0/16
  Public:  10.0.0.0/20
  Private: 10.0.16.0/20
STAGING:
  VPC:     10.1.0.0/16
  Public:  10.1.0.0/20
  Private: 10.1.16.0/20
PROD:
  VPC:     10.2.0.0/16
  Public:  10.2.0.0/20
  Private: 10.2.16.0/20
✅ All tests passed!
```

## Test Coverage

### ✅ Input Validation (23 tests)
- Project name: 10 tests
- AWS Account ID: 9 tests
- Sanitization: 4 tests

### ✅ Cloud Features (21 tests)
- CIDR calculation: 13 tests
- Default CIDRs: 3 tests
- Subnet segregation: 3 tests
- Edge cases: 2 tests

### ✅ UI/DOM (12+ tests in browser)
- Cloud provider selection
- Advanced options toggle
- IP range visibility
- ARIA attributes
- Diagram rendering

**Total Coverage: 56+ Tests** ✅

## CI/CD Integration

### Exit Codes
- `0`: All tests passed ✅
- `1`: Some tests failed ❌

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    npm install
    npm test
```

---

**Last Updated:** 2025-11-08
**Status:** ✅ All Passing (56+ tests)
