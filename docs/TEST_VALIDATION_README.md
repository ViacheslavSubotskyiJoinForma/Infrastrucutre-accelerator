# Validation Testing Guide

This document explains how to test the validation functionality locally.

## Quick Start

1. Open the test page in your browser:
   ```bash
   # From the repository root
   open docs/test-validation.html
   # or on Linux
   xdg-open docs/test-validation.html
   ```

2. Run the automated tests by clicking the buttons

3. Manually test by typing in the input fields

## Test Cases

### Test 1: Project Name Validation

**Automated Tests:**
- ✅ **Show Error**: Verifies error message displays correctly
- ✅ **Clear Error**: Verifies error message clears correctly
- ✅ **Simulate Typing**: Verifies error clears on input event

**Manual Test:**
1. Click "Show Error"
2. Start typing in the "Project Name" field
3. **Expected**: Error message should disappear immediately

### Test 2: AWS Account ID Validation

**Automated Tests:**
- ✅ **Show Error**: Verifies error message displays correctly
- ✅ **Clear Error**: Verifies error message clears correctly
- ✅ **Simulate Typing**: Verifies error clears on input event

**Manual Test:**
1. Click "Show Error"
2. Start typing in the "AWS Account ID" field
3. **Expected**: Error message should disappear immediately

### Test 3: Input Event Listener

**Manual Test Only:**
1. Click "Show Error" on either field
2. Start typing in the input field
3. Verify that:
   - ✅ Error message text disappears
   - ✅ Red border is removed from the input
   - ✅ Helper text (small gray text) remains visible

## Expected Behavior

### When Error is Shown
- ✅ Form group gets `error` class (red border)
- ✅ Validation message container shows error text
- ✅ Validation message has `error` and `show` classes
- ✅ Input field is focused

### When User Starts Typing
- ✅ Form group `error` class is removed immediately
- ✅ Validation message text is cleared
- ✅ Validation message `show` and `error` classes are removed
- ✅ Helper text remains visible

## Testing in Main Application

After verifying the test page works correctly:

1. Open `docs/index.html` in your browser
2. Click "🚀 Open GitHub Actions" without filling in required fields
3. Verify error messages appear
4. Start typing in the "Project Name" field
5. **Expected**: Error message should disappear immediately
6. Do the same for "AWS Account ID" field

## Troubleshooting

### Error message doesn't clear when typing

**Check:**
1. Browser console for JavaScript errors
2. Verify `clearError()` function is being called (add `console.log`)
3. Verify input event listener is attached

**Debug:**
```javascript
// Add to setupEventListeners() in app.js
console.log('Attaching input listener to projectName');
document.getElementById('projectName').addEventListener('input', function() {
    console.log('Input event fired');
    clearError(this);
    debouncedUpdateDiagram();
});
```

### Error message clears but red border remains

**Check:**
- Verify `formGroup.classList.remove('error')` is executed
- Check CSS specificity issues

### Helper text disappears

**Check:**
- Ensure helper text doesn't have `.error-message` class
- Verify `small:not(.error-message)` selector works correctly

## Technical Details

### DOM Structure
```html
<div class="form-group" id="projectNameGroup">
    <label for="projectName">Project Name</label>
    <input type="text" id="projectName">
    <small>Helper text</small>
    <div class="validation-message" id="projectNameValidation"></div>
</div>
```

### Error State Classes
- `form-group.error` - Adds red border to input
- `validation-message.error` - Styles error message
- `validation-message.show` - Makes message visible

### Event Flow
1. User submits form with invalid data
2. `showError()` called → adds classes and text
3. User starts typing (input event)
4. `clearError()` called → removes classes and text
5. Validation message disappears immediately

## Files Modified

1. `docs/js/app.js` - Fixed `clearError()` and event listeners
2. `docs/test-validation.html` - Test page (this test suite)
3. `docs/TEST_VALIDATION_README.md` - This document

## Success Criteria

✅ All automated tests show "PASS"
✅ Manual typing test works smoothly
✅ No console errors
✅ Error clears on first keystroke
✅ Helper text remains visible
✅ Red border is removed immediately
