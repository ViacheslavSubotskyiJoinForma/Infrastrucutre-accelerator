.PHONY: help test test-security test-generator test-coverage test-web lint format security-scan clean install-dev install-hooks

# Default target
help:
	@echo "Infrastructure Template Generator - Development Commands"
	@echo ""
	@echo "Testing:"
	@echo "  make test              - Run all tests"
	@echo "  make test-security     - Run security validator tests only"
	@echo "  make test-generator    - Run generator tests only"
	@echo "  make test-coverage     - Run tests with coverage report"
	@echo "  make test-web          - Open web security tests in browser"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint              - Run all linters (flake8, pylint, mypy)"
	@echo "  make format            - Format code with black and isort"
	@echo "  make security-scan     - Run security scanners (bandit)"
	@echo ""
	@echo "Development:"
	@echo "  make install-dev       - Install development dependencies"
	@echo "  make install-hooks     - Install pre-commit hooks"
	@echo "  make clean             - Clean up temporary files"
	@echo ""
	@echo "CI/CD:"
	@echo "  make ci                - Run full CI pipeline locally"

# Testing targets
test:
	@echo "🧪 Running all tests..."
	python3 -m unittest discover -s tests -p 'test_*.py' -v

test-security:
	@echo "🔒 Running security validator tests..."
	python3 -m unittest tests.test_security_validator -v

test-generator:
	@echo "⚙️  Running infrastructure generator tests..."
	python3 -m unittest tests.test_infrastructure_generator -v

test-coverage:
	@echo "📊 Running tests with coverage..."
	python3 run_tests.py
	@echo ""
	@echo "📁 HTML coverage report: htmlcov/index.html"

test-web:
	@echo "🌐 Opening web security tests..."
	@command -v xdg-open > /dev/null && xdg-open tests/test_web_security.html || \
	 command -v open > /dev/null && open tests/test_web_security.html || \
	 echo "Please open tests/test_web_security.html in your browser"

# Code quality targets
lint:
	@echo "🔍 Running linters..."
	@echo "--- flake8 ---"
	-flake8 scripts/ tests/ --max-line-length=100 --ignore=E501,W503,E203
	@echo ""
	@echo "--- pylint ---"
	-pylint scripts/ --max-line-length=100 --disable=C0111,R0913,R0914
	@echo ""
	@echo "--- mypy ---"
	-mypy scripts/ --ignore-missing-imports

format:
	@echo "✨ Formatting code..."
	black scripts/ tests/ --line-length=100
	isort scripts/ tests/ --profile=black --line-length=100
	@echo "✅ Code formatted!"

security-scan:
	@echo "🔒 Running security scans..."
	@echo "--- Bandit ---"
	-bandit -r scripts/ -ll
	@echo ""
	@echo "--- Safety (dependency check) ---"
	-safety check --json || echo "Install safety: pip install safety"

# Development setup
install-dev:
	@echo "📦 Installing development dependencies..."
	pip install --upgrade pip
	pip install jinja2 coverage
	pip install black isort flake8 pylint mypy
	pip install bandit safety
	pip install pre-commit
	@echo "✅ Development dependencies installed!"

install-hooks:
	@echo "🪝 Installing pre-commit hooks..."
	pre-commit install
	@echo "✅ Pre-commit hooks installed!"
	@echo "Hooks will run automatically before each commit."

# Cleanup
clean:
	@echo "🧹 Cleaning up..."
	find . -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '*.pyc' -delete
	find . -type f -name '*.pyo' -delete
	find . -name '.coverage' -delete
	rm -rf htmlcov/
	rm -rf .pytest_cache/
	rm -rf .mypy_cache/
	rm -rf generated-infra/
	@echo "✅ Cleanup complete!"

# CI/CD simulation
ci: clean
	@echo "🚀 Running full CI pipeline..."
	@echo ""
	@echo "Step 1: Code formatting check"
	@black scripts/ tests/ --check --line-length=100
	@echo ""
	@echo "Step 2: Linting"
	@$(MAKE) lint
	@echo ""
	@echo "Step 3: Security scan"
	@$(MAKE) security-scan
	@echo ""
	@echo "Step 4: Tests with coverage"
	@$(MAKE) test-coverage
	@echo ""
	@echo "✅ CI pipeline complete!"

# Quick test for development
quick-test:
	@echo "⚡ Running quick tests..."
	python3 -m unittest tests.test_security_validator

# Generate documentation
docs:
	@echo "📚 Generating documentation..."
	@echo "Security report: SECURITY_REPORT.md"
	@echo "Test documentation: tests/README.md"
	@echo "Generator documentation: GENERATOR_README.md"
