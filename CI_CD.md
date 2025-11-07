# CI/CD Pipeline Documentation

## Overview

This repository includes a comprehensive CI/CD pipeline for automated testing, security scanning, and code quality checks.

## GitHub Actions Workflows

### Security & Tests Workflow (`.github/workflows/security-tests.yml`)

**Triggers:**
- Push to `main` branch
- Push to `claude/**` branches
- Pull requests to `main`
- Manual trigger via workflow_dispatch

**Jobs:**

#### 1. Security Tests
- **Matrix**: Python 3.9, 3.10, 3.11
- **Steps**:
  - Run security validator tests (24 tests)
  - Run infrastructure generator tests (16 tests)
  - Generate coverage report
  - Upload coverage as artifact
  - Comment coverage on PRs

**Coverage Reporting:**
- Generates HTML coverage report
- Uploads to workflow artifacts (30 days retention)
- Comments on PRs with coverage summary
- Badge color based on coverage %:
  - 🟢 ≥90%: bright green
  - 🟢 ≥75%: green
  - 🟡 ≥60%: yellow
  - 🔴 <60%: red

#### 2. Web Security Tests
- **Environment**: Node.js 20
- **Tools**: Playwright + Chromium
- **Steps**:
  - Install Playwright
  - Run headless browser tests
  - Validate 25+ XSS protection tests
  - Report results

#### 3. Security Scan
- **Tools**: Bandit, TruffleHog
- **Checks**:
  - Python code security (Bandit)
  - Secret detection (TruffleHog)
  - Generates JSON reports
  - Uploads reports as artifacts

#### 4. Code Quality
- **Linters**: flake8, pylint, mypy
- **Checks**:
  - PEP 8 compliance
  - Code complexity
  - Type hints validation
  - Best practices

#### 5. Test Summary
- **Purpose**: Aggregate results from all jobs
- **Output**: Markdown summary in workflow UI
- **Shows**: Pass/fail status for each job

---

## Local Development

### Setup

```bash
# Install development dependencies
make install-dev

# Install pre-commit hooks
make install-hooks
```

### Running Tests Locally

```bash
# All tests
make test

# Specific test suites
make test-security      # Security validator tests
make test-generator     # Generator tests
make test-coverage      # With coverage report
make test-web          # Web security tests (opens browser)

# Quick test during development
make quick-test
```

### Code Quality Checks

```bash
# Run all linters
make lint

# Format code
make format

# Security scan
make security-scan

# Full CI pipeline locally
make ci
```

### Pre-commit Hooks

Installed via `.pre-commit-config.yaml`:

**Automatic checks before each commit:**
- ✅ Black (code formatting)
- ✅ isort (import sorting)
- ✅ flake8 (linting)
- ✅ Bandit (security)
- ✅ YAML validation
- ✅ Secrets detection
- ✅ mypy (type checking)
- ✅ Safety (dependency vulnerabilities)

**Manual run:**
```bash
pre-commit run --all-files
```

**Skip hooks (emergency only):**
```bash
git commit --no-verify -m "message"
```

---

## Continuous Integration

### On Every Push

1. **Code Quality**
   - Linting (flake8, pylint)
   - Type checking (mypy)
   - Security scan (Bandit)

2. **Testing**
   - Unit tests (security validator)
   - Integration tests (generator)
   - Web security tests
   - Coverage reporting

3. **Security**
   - Secret detection (TruffleHog)
   - Dependency vulnerabilities (Safety)
   - Code security issues (Bandit)

### On Pull Requests

All of the above, plus:
- **Coverage comment** on PR
- **Test summary** in PR checks
- **Artifacts** available for download
- **Blocking** if critical tests fail

---

## Artifacts

Workflow artifacts are retained for 30 days:

### Coverage Report
- **Path**: `coverage-report/`
- **Contains**: HTML coverage report
- **Access**: Download from workflow "Artifacts" section

### Security Reports
- **Path**: `bandit-security-report/`
- **Contains**: JSON security scan results
- **Access**: Download from workflow "Artifacts" section

---

## Status Badges

Add to README.md:

```markdown
[![Security & Tests](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/security-tests.yml/badge.svg)](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions/workflows/security-tests.yml)
```

---

## Configuration

### Test Configuration

**Coverage settings** (`run_tests.py`):
```python
cov = coverage.Coverage(
    source=['scripts'],
    omit=[
        '*/tests/*',
        '*/test_*',
        '*/__pycache__/*',
        '*/venv/*',
        '*/.venv/*'
    ]
)
```

### Linter Configuration

**flake8** (via command args):
- Max line length: 100
- Ignored: E501, W503, E203

**pylint** (via command args):
- Max line length: 100
- Disabled: C0111, R0913, R0914

**mypy** (via command args):
- Ignore missing imports
- No strict optional

---

## Troubleshooting

### Tests Failing Locally but Passing in CI

**Common causes:**
- Different Python versions
- Missing dependencies
- Environment variables

**Solution:**
```bash
# Use same Python version as CI
python3.11 -m unittest discover -s tests

# Clean and reinstall dependencies
make clean
make install-dev
```

### Pre-commit Hooks Too Slow

**Solution:**
```bash
# Run specific hook only
pre-commit run black --all-files

# Disable hooks temporarily (not recommended)
git commit --no-verify
```

### Coverage Report Not Generated

**Cause**: Tests failing before coverage runs

**Solution:**
```bash
# Run tests first
make test

# Then generate coverage
make test-coverage
```

---

## Best Practices

### Before Committing

1. ✅ Run tests locally: `make test`
2. ✅ Check coverage: `make test-coverage`
3. ✅ Run linters: `make lint`
4. ✅ Security scan: `make security-scan`
5. ✅ Format code: `make format`

Or simply:
```bash
make ci  # Runs everything
```

### Writing New Tests

1. **Create test file**: `tests/test_new_feature.py`
2. **Write tests**: Follow existing patterns
3. **Run locally**: `make test`
4. **Check coverage**: `make test-coverage`
5. **Aim for**: 80%+ coverage on new code

### Adding Dependencies

1. **Update imports** in relevant files
2. **Install locally**: `pip install <package>`
3. **Update workflow**: Add to `security-tests.yml` if needed
4. **Test**: Ensure CI passes

---

## Performance

### Workflow Execution Times

Typical execution times (parallel jobs):

| Job | Duration |
|-----|----------|
| Security Tests (3.11) | ~2-3 min |
| Web Security Tests | ~1-2 min |
| Security Scan | ~1-2 min |
| Code Quality | ~1-2 min |

**Total**: ~3-4 minutes (parallel execution)

### Optimization Tips

- ✅ **Cache dependencies** (pip cache enabled)
- ✅ **Parallel jobs** (matrix strategy)
- ✅ **Continue on error** for non-critical checks
- ✅ **Artifact cleanup** (30-day retention)

---

## Security

### Secrets Management

- ✅ **Never commit secrets** (detected by TruffleHog)
- ✅ **Use GitHub Secrets** for sensitive data
- ✅ **Baseline file** for known false positives

### Dependency Security

- ✅ **Automated scanning** (Safety, Bandit)
- ✅ **Regular updates** via Dependabot
- ✅ **Vulnerability alerts** in workflow

---

## Monitoring

### Workflow Notifications

**On Failure:**
- GitHub notifications
- Email (if configured)
- PR status checks

**On Success:**
- Green checkmark on PR
- Coverage comment
- Test summary

### Metrics to Monitor

- 📊 **Test coverage** (target: 80%+)
- 🔒 **Security issues** (target: 0)
- ⚡ **Workflow duration** (target: <5 min)
- ✅ **Pass rate** (target: 100%)

---

## Future Improvements

### Planned Enhancements

- [ ] Automatic PR creation for security updates
- [ ] Performance benchmarking
- [ ] E2E tests for web UI
- [ ] Coverage trend tracking
- [ ] Slack/Discord notifications
- [ ] Deploy preview for web UI changes

---

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Pre-commit Documentation](https://pre-commit.com/)
- [Coverage.py Documentation](https://coverage.readthedocs.io/)
- [Bandit Documentation](https://bandit.readthedocs.io/)

---

**Last Updated**: 2025-11-07
**Maintained by**: Infrastructure Team
