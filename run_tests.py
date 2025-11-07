#!/usr/bin/env python3
"""
Test runner with coverage reporting
Runs all Python tests and generates coverage report
"""

import sys
import unittest
import os
from pathlib import Path

# Try to import coverage, install if not available
try:
    import coverage
except ImportError:
    print("Installing coverage...")
    import subprocess
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'coverage'])
    import coverage


def run_tests_with_coverage():
    """Run all tests with coverage reporting"""

    # Initialize coverage
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

    cov.start()

    # Discover and run tests
    loader = unittest.TestLoader()
    start_dir = 'tests'
    suite = loader.discover(start_dir, pattern='test_*.py')

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    cov.stop()
    cov.save()

    # Print coverage report
    print("\n" + "="*70)
    print("COVERAGE REPORT")
    print("="*70 + "\n")

    cov.report()

    # Generate HTML report
    html_dir = Path('htmlcov')
    cov.html_report(directory=str(html_dir))
    print(f"\n📊 HTML coverage report generated: {html_dir}/index.html")

    # Calculate coverage percentage
    total_coverage = cov.report(file=open(os.devnull, 'w'))

    print("\n" + "="*70)
    print(f"Total Coverage: {total_coverage:.1f}%")
    print("="*70)

    # Exit with appropriate code
    if result.wasSuccessful():
        print("\n✅ All tests passed!")

        # Check if we achieved target coverage
        if total_coverage >= 100:
            print("🎉 Achieved 100% code coverage!")
            sys.exit(0)
        elif total_coverage >= 90:
            print(f"⚠️  Coverage is {total_coverage:.1f}%, target is 100%")
            sys.exit(0)
        else:
            print(f"⚠️  Coverage is {total_coverage:.1f}%, target is 100%")
            sys.exit(0)  # Still exit successfully if tests pass
    else:
        print("\n❌ Some tests failed!")
        sys.exit(1)


if __name__ == '__main__':
    run_tests_with_coverage()
