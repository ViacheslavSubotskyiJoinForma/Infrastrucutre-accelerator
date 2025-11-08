# UI Tests

This directory contains browser-based tests for the web interface.

## Test Files

### `test-environment-checkbox.html`
Tests the environment checkbox behavior to ensure:
- Cannot uncheck the last selected environment
- Cost calculator never sees 0 environments
- Multiple rapid clicks don't break the state
- Fallback mechanism works correctly

### Running Tests

1. Open the test file in a browser:
   ```bash
   # Using Python's built-in server
   cd tests
   python3 -m http.server 8000
   # Then open http://localhost:8000/test-environment-checkbox.html
   ```

2. Or open directly:
   ```bash
   open test-environment-checkbox.html  # macOS
   xdg-open test-environment-checkbox.html  # Linux
   ```

3. Click "Run Test" buttons to execute each test case

### Expected Results

All tests should show **PASS** status:
- ✓ Test 1: Checkbox remains checked when clicking last environment
- ✓ Test 2: Multiple clicks don't uncheck last environment  
- ✓ Test 3: Can switch between environments correctly
- ✓ Test 4: Fallback activates if all checkboxes somehow get unchecked

## Writing New Tests

1. Add test case to the `tests` array
2. Provide `setup()` to initialize state
3. Implement `run()` to execute test and return pass/fail
4. Test should be self-contained and not affect other tests
