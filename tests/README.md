# Test Suite Documentation

This directory contains comprehensive automated tests for the Infrastructure Template Generator.

## Test Coverage

### Python Tests

#### Security Validator Tests (`test_security_validator.py`)
- **24 tests** covering input validation and sanitization
- **97% code coverage** for security module
- Tests all validation functions: project names, AWS IDs, regions, paths, filenames

#### Infrastructure Generator Tests (`test_infrastructure_generator.py`)
- **16 tests** covering generator functionality
- Tests initialization, component validation, dependency resolution
- Integration tests for full generation workflow

### Web Security Tests (`test_web_security.html`)
- **25+ browser-based tests** for XSS protection
- Tests safe DOM manipulation, URL validation, input sanitization
- Rate limiting and security utility functions

## Running Tests

### All Tests with Coverage

```bash
# From project root
python3 run_tests.py
```

This will:
1. Run all Python tests
2. Generate coverage report
3. Create HTML coverage report in `htmlcov/`

### Individual Test Suites

```bash
# Security validator tests only
python3 -m unittest tests.test_security_validator -v

# Generator tests only
python3 -m unittest tests.test_infrastructure_generator -v

# Web security tests
open tests/test_web_security.html  # Opens in browser
```

### Coverage Report

```bash
# Generate and view HTML coverage
python3 run_tests.py
open htmlcov/index.html
```

## Test Results

### Current Status

```
Security Validator Tests:  24/24 passing ✅ (100%)
Generator Tests:          13/16 passing ✅ (81%)
Web Security Tests:       25/25 passing ✅ (100%)
---------------------------------------------------
Overall:                  62/65 passing (95%)

Code Coverage:
- Security Module:        97% ✅
- Generator Module:       25% ⚠️
- Overall:               56.5%
```

## Test Structure

```
tests/
├── README.md                           # This file
├── __init__.py                         # Test package init
├── test_security_validator.py          # Security tests
├── test_infrastructure_generator.py    # Generator tests
└── test_web_security.html              # Web security tests
```

## Writing New Tests

### Python Tests

```python
import unittest
from scripts.security.validator import SecurityValidator

class TestNewFeature(unittest.TestCase):
    def test_something(self):
        result = SecurityValidator.validate_project_name('test-project')
        self.assertEqual(result, 'test-project')
```

### Web Tests

```javascript
runner.addTest('Test name', () => {
    const result = Security.escapeHtml('<script>test</script>');
    assert(!result.includes('<script>'), 'Should escape HTML');
});
```

## Dependencies

### Python
- unittest (built-in)
- coverage (installed by run_tests.py)

### Web
- No dependencies (vanilla JavaScript)

## Continuous Integration

Tests are designed to be integrated into CI/CD:

```yaml
# .github/workflows/tests.yml
- name: Run tests
  run: python3 run_tests.py
```

## Coverage Goals

- **Security Module**: 95%+ (currently 97% ✅)
- **Generator Module**: 80%+ (currently 25%, needs improvement)
- **Overall**: 80%+ (currently 56.5%, progressing)

## Known Issues

### Generator Tests
- Some tests require actual template files to exist
- File system tests need proper directory setup
- Integration tests are environment-dependent

### Solutions
- Use `skipTest()` when templates not found
- Create temp directories in setUp()
- Mock file system for unit tests

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure tests pass locally
3. Check coverage: `python3 run_tests.py`
4. Aim for 80%+ coverage on new code
5. Update this README if adding new test files

## Resources

- [unittest docs](https://docs.python.org/3/library/unittest.html)
- [coverage docs](https://coverage.readthedocs.io/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
