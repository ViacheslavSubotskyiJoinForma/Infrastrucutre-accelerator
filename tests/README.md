# UI Tests

This directory contains browser-based tests for the web interface.

## Test Files

### `test-environment-checkbox.html` (Legacy)
Original test file using change event with setTimeout approach.

### `test-environment-checkbox-v2.html` (Current)
**Current implementation** - Tests the environment checkbox behavior using capture phase listener:
- Cannot uncheck the last selected environment
- Cost calculator never sees 0 environments (uses stopImmediatePropagation)
- Can check/uncheck multiple environments freely
- Integration test with simulated cost calculator

### Running Tests

1. Open the test file in a browser:
   ```bash
   # Using Python's built-in server
   cd tests
   python3 -m http.server 8000
   # Then open http://localhost:8000/test-environment-checkbox-v2.html
   ```

2. Or open directly:
   ```bash
   open test-environment-checkbox-v2.html  # macOS
   xdg-open test-environment-checkbox-v2.html  # Linux
   ```

3. Click "Run Test" buttons to execute each test case

### Expected Results (v2)

All tests should show **PASS** status:
- ✓ Test 1: Cannot uncheck the only selected environment
- ✓ Test 2: Can check multiple environments and always maintains at least one
- ✓ Test 3: Cost calculator never sees 0 environments (capture phase prevents propagation)

## Writing New Tests

1. Add test case to the `tests` array
2. Provide `setup()` to initialize state
3. Implement `run()` to execute test and return pass/fail
4. Test should be self-contained and not affect other tests
