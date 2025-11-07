# Tests for Infrastructure Accelerator

This directory contains comprehensive unit and integration tests for the Infrastructure Accelerator.

## 📋 Test Structure

```
tests/
├── __init__.py              # Test package initialization
├── test_validator.py        # InputValidator tests (20 tests)
├── test_generator.py        # InfrastructureGenerator tests (19 tests)
└── README.md               # This file
```

## 🧪 Test Coverage

**Total Tests: 39**
- ✅ InputValidator: 20 tests
- ✅ InfrastructureGenerator: 19 tests

**Code Coverage: 60%**
- Covers all critical validation and error handling paths
- Integration tests verify end-to-end functionality

## 🚀 Running Tests

### Run All Tests

```bash
pytest tests/ -v
```

### Run Specific Test File

```bash
# Validator tests only
pytest tests/test_validator.py -v

# Generator tests only
pytest tests/test_generator.py -v
```

### Run with Coverage Report

```bash
pytest tests/ --cov=scripts.generators --cov-report=html
```

View coverage report:
```bash
open htmlcov/index.html
```

### Run Specific Test Class

```bash
# Run all project name validation tests
pytest tests/test_validator.py::TestProjectNameValidation -v

# Run all generator initialization tests
pytest tests/test_generator.py::TestGeneratorInitialization -v
```

### Run Specific Test

```bash
pytest tests/test_validator.py::TestProjectNameValidation::test_valid_project_names -v
```

## 📝 Test Categories

### 1. InputValidator Tests

#### Project Name Validation
- ✅ Valid project names (lowercase, alphanumeric, hyphens)
- ✅ Invalid: empty, uppercase, too short/long, special characters
- ✅ Invalid: starts with number

#### AWS Account ID Validation
- ✅ Valid 12-digit account IDs
- ✅ Optional (None or empty allowed)
- ✅ Invalid: wrong length, non-numeric

#### Region Validation
- ✅ Valid AWS regions (12 supported regions)
- ✅ Invalid region names

#### Environment Validation
- ✅ Valid environments (dev, uat, staging, prod, test)
- ✅ Invalid: empty list, invalid names

### 2. InfrastructureGenerator Tests

#### Initialization
- ✅ Valid initialization with all parameters
- ✅ Validation during init (project name, region, environment)
- ✅ Error handling for invalid inputs

#### Component Validation
- ✅ Known component validation
- ✅ Unknown component rejection
- ✅ Automatic dependency resolution

#### Dependency Sorting
- ✅ Topological sort of components
- ✅ Handles circular dependencies
- ✅ Independent component ordering

#### Module Management
- ✅ Checks if modules are needed
- ✅ Copies modules when required

#### Error Handling
- ✅ Fallback copy for missing templates
- ✅ Template render error handling
- ✅ Proper error types and messages

#### Integration
- ✅ Full VPC generation (with templates)
- ✅ Output directory creation
- ✅ Config file generation

## 🔧 CI/CD Integration

Tests run automatically on:
- **Push** to main, develop, or claude/* branches
- **Pull requests** to main or develop
- **Before infrastructure generation** in GitHub Actions

### GitHub Actions Workflows

1. **test.yml** - Runs on every push/PR
   - Tests on Python 3.9, 3.10, 3.11, 3.12
   - Generates coverage reports
   - Uploads to Codecov

2. **generate-infrastructure.yml** - Runs before generation
   - Validates code with pytest
   - Ensures generator works correctly

## 📊 Coverage Details

Current coverage: **60%**

**Covered:**
- ✅ All validation logic (100%)
- ✅ Error handling (100%)
- ✅ Component dependency resolution (100%)
- ✅ Generator initialization (100%)

**Not covered (intentional):**
- Template rendering (requires real templates)
- GitLab CI generation (complex string formatting)
- README generation (complex string formatting)
- Main function (CLI entry point)

## 🛠️ Development

### Adding New Tests

1. Create test file in `tests/` directory
2. Import necessary modules
3. Use pytest fixtures for setup
4. Follow naming convention: `test_*.py`

Example:
```python
import pytest
from scripts.generators.generate_infrastructure import YourClass

def test_your_feature():
    # Arrange
    obj = YourClass()

    # Act
    result = obj.your_method()

    # Assert
    assert result == expected
```

### Running Tests During Development

```bash
# Run tests in watch mode (requires pytest-watch)
ptw

# Run tests with verbose output
pytest -vv

# Run only failed tests
pytest --lf

# Run tests matching pattern
pytest -k "test_valid"
```

### Test Fixtures

Common fixtures available:
- `temp_dir` - Temporary directory for file operations
- `basic_config` - Standard generator configuration
- `generator` - Initialized generator instance

## 🐛 Debugging Tests

### See full error output
```bash
pytest tests/ -vv --tb=long
```

### Stop on first failure
```bash
pytest tests/ -x
```

### Run with pdb debugger
```bash
pytest tests/ --pdb
```

### Print statements in tests
```bash
pytest tests/ -s
```

## ✅ Best Practices

1. **One assertion per test** (when possible)
2. **Descriptive test names** that explain what is tested
3. **Arrange-Act-Assert** pattern
4. **Use fixtures** for common setup
5. **Test edge cases** and error conditions
6. **Keep tests fast** (< 1 second each)
7. **Mock external dependencies** (file system, network)

## 📚 Further Reading

- [pytest documentation](https://docs.pytest.org/)
- [pytest-cov documentation](https://pytest-cov.readthedocs.io/)
- [Python testing best practices](https://docs.python-guide.org/writing/tests/)

---

**Last Updated:** 2025-11-07
**Total Tests:** 39
**Coverage:** 60%
**Status:** ✅ All tests passing
