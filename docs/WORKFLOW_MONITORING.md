# Workflow Monitoring Features

## Overview

The Infrastructure Accelerator now includes **real-time workflow monitoring** with automatic artifact download. When you trigger infrastructure generation via the web UI, you can track progress in real-time and automatically receive the generated files.

## Features

### 1. Real-Time Status Updates ⚡

The web interface polls GitHub Actions API every 5 seconds to display:
- **Current workflow status** (queued, in-progress, completed)
- **Elapsed time** since workflow started
- **Live progress percentage** based on workflow state

### 2. Interactive Progress Bar 📊

Visual progress indicator showing:
- **Animated shimmer effect** during execution
- **Color-coded status** (yellow for queued, blue for in-progress, green for success)
- **Percentage display** (0-100%)
- **Smooth transitions** between states

### 3. Job-Level Progress 🔍

Detailed view of individual workflow jobs:
- **Job names** with status icons
- **Real-time status updates** (pending ⏳, running ⚡, success ✅, failure ❌)
- **Scrollable job list** for complex workflows

### 4. Automatic Artifact Download 📦

When the workflow completes successfully:
- **Automatically fetches** the generated infrastructure ZIP file
- **Downloads directly** to your browser's download folder
- **Shows download confirmation** with file details
- **Fallback to manual download** if auto-download fails

### 5. Background Monitoring 🔄

- **Close the modal** and monitoring continues in background
- **Re-open anytime** to check progress
- **Automatic cleanup** when workflow completes

## User Experience Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User clicks "Generate Infrastructure" (authenticated)      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Workflow triggered via GitHub API                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Progress modal appears with:                               │
│  • Progress bar (0%)                                        │
│  • Status: "⏳ Queued"                                      │
│  • Empty job list                                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Polling starts (every 5 seconds):                          │
│  • Fetch workflow run status                                │
│  • Fetch job details                                        │
│  • Update progress bar (10% → 90%)                          │
│  • Update status: "⚡ Generating infrastructure... (1m 23s)"│
│  • Show job progress:                                       │
│    ⚡ Validate Infrastructure                               │
│    ✅ Generate Templates                                    │
│    ⏳ Package Artifact                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Workflow completes:                                        │
│  • Progress bar: 100%                                       │
│  • Status: "✅ Generation complete! (2m 15s)"              │
│  • All jobs marked ✅                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  Automatic artifact download:                               │
│  • Fetch artifacts list from GitHub API                     │
│  • Download first artifact (infrastructure.zip)             │
│  • Show success modal with:                                 │
│    - File name and size                                     │
│    - Next steps instructions                                │
│    - Link to workflow run                                   │
└─────────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Architecture

```
┌──────────────────┐
│   User Action    │
│  (Generate Btn)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐      ┌─────────────────────┐
│    auth.js       │─────▶│  GitHub API         │
│  triggerWorkflow │      │  /actions/workflows │
└────────┬─────────┘      │  /dispatches        │
         │                └─────────────────────┘
         │ (returns runId)
         ▼
┌──────────────────┐
│  app.js          │
│  handleGenerate  │
└────────┬─────────┘
         │
         ▼
┌───────────────────────────────────────────────────┐
│  workflow-monitor.js (WorkflowMonitor class)      │
├───────────────────────────────────────────────────┤
│  startMonitoring(runId)                           │
│    │                                              │
│    ├─▶ showProgressModal()                        │
│    │                                              │
│    └─▶ setInterval(checkStatus, 5000)            │
│          │                                        │
│          ├─▶ GET /repos/{repo}/actions/runs/{id} │
│          │   (workflow status)                    │
│          │                                        │
│          ├─▶ GET /repos/{repo}/actions/runs/     │
│          │   {id}/jobs (job details)              │
│          │                                        │
│          ├─▶ updateProgress(run)                  │
│          │     ├─ updateProgressBar(percent)      │
│          │     ├─ updateProgressMessage(msg)      │
│          │     └─ displayJobProgress(jobs)        │
│          │                                        │
│          └─▶ handleCompletion(run)                │
│                ├─ downloadArtifacts()             │
│                │   └─ downloadArtifact(artifact)  │
│                └─ showSuccessModal()              │
└───────────────────────────────────────────────────┘
```

### Key Components

#### 1. `workflow-monitor.js`

**Class:** `WorkflowMonitor`

**Methods:**
- `startMonitoring(runId)` - Initialize monitoring with workflow run ID
- `checkStatus()` - Poll GitHub API for workflow status
- `updateJobProgress(run)` - Fetch and display job details
- `updateProgress(run)` - Update UI with current status
- `handleCompletion(run)` - Handle workflow completion (success/failure)
- `downloadArtifacts()` - Fetch and download generated artifacts
- `showProgressModal()` - Display progress tracking UI
- `hideProgressModal()` - Hide modal (monitoring continues)

**Polling Strategy:**
- Interval: 5 seconds
- Endpoints:
  - `GET /repos/{owner}/{repo}/actions/runs/{run_id}` (status)
  - `GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs` (jobs)
  - `GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts` (artifacts)

#### 2. Progress Calculation

```javascript
// Progress estimation based on workflow status
switch (run.status) {
    case 'queued':
        progressPercent = 10;  // Initial state
        break;
    case 'in_progress':
        // Time-based estimation (capped at 90% until completion)
        progressPercent = Math.min(90, 20 + (elapsed / 10));
        break;
    case 'completed':
        progressPercent = 100;  // Done
        break;
}
```

#### 3. Artifact Download

```javascript
// Fetch artifact metadata
GET /repos/{repo}/actions/runs/{run_id}/artifacts

// Download artifact as ZIP
GET {artifact.archive_download_url}
  Headers: { Authorization: Bearer {token} }

// Trigger browser download
const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = `${artifact.name}.zip`;
a.click();
```

## Styling

### CSS Classes

**Progress Container:**
- `.progress-modal` - Modal container for progress UI
- `.progress-container` - Wrapper for progress bar
- `.progress-bar-wrapper` - Background track for progress bar
- `.progress-bar` - Animated progress indicator with shimmer effect
- `.progress-percent` - Percentage text display

**Status Messages:**
- `.progress-message` - Base class for status text
- `.progress-message.queued` - Yellow styling for queued state
- `.progress-message.in_progress` - Blue styling with pulse animation
- `.progress-message.completed` - Green styling for success
- `.progress-message.warning` - Yellow styling for warnings

**Job List:**
- `.jobs-container` - Container for job list
- `.job-list` - Scrollable list of jobs
- `.job-item` - Individual job display
- `.job-status` - Icon with status-specific styling
- `.job-name` - Job name text

### Animations

**Shimmer Effect:**
```css
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}
```

**Pulse Effect:**
```css
@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
}
```

**Spin Effect:**
```css
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
```

## Dark Mode Support

All progress components support dark mode with adjusted colors:
- **Queued**: Yellow tones with reduced opacity
- **In Progress**: Blue tones with animated pulse
- **Completed**: Green tones for success
- **Warning/Error**: Red/yellow tones for issues

## Error Handling

### Network Errors
- Displays "⚠️ Error checking status. Retrying..." message
- Continues polling (doesn't stop on transient errors)
- Logs errors to console for debugging

### No Artifacts Found
- Shows warning message
- Provides link to workflow run for manual download
- Automatically opens completion modal after 2 seconds

### Auto-Download Failure
- Falls back to manual download instructions
- Shows completion modal with "Download manually" link
- Logs error details to console

## Browser Compatibility

**Tested and working on:**
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

**Required APIs:**
- `fetch()` for GitHub API calls
- `Blob` for artifact downloads
- `URL.createObjectURL()` for download links
- `setInterval()` / `clearInterval()` for polling

## Security

### Authentication
- Uses GitHub OAuth token from `auth.js`
- Token stored in `localStorage` (secure HTTPS only)
- Token validated before workflow operations

### API Permissions
Required OAuth scopes:
- `repo` - Access to repository actions
- `workflow` - Trigger and read workflow runs

### XSS Protection
- All user input escaped via `Security.escapeHtml()`
- Safe element creation via `Security.createSafeElement()`
- No `innerHTML` for user-provided content

## Performance

### Optimization Strategies
1. **Polling Interval**: 5 seconds (balanced between real-time and API rate limits)
2. **Conditional Rendering**: Only fetch jobs when workflow is in progress
3. **Cleanup**: Stop polling when workflow completes
4. **Lazy Loading**: Modal created on-demand, not at page load

### GitHub API Rate Limits
- **Authenticated**: 5,000 requests/hour
- **Polling Impact**: ~12 requests/minute during active monitoring
- **Maximum Monitoring Time**: ~400 minutes before hitting limit (unrealistic workflow duration)

## Future Enhancements

### Planned Features
1. **Notifications** - Browser notifications when workflow completes
2. **Multiple Workflows** - Monitor several workflows simultaneously
3. **Cost Estimation** - Display estimated AWS costs during generation
4. **Log Streaming** - Real-time workflow logs in UI
5. **Retry Failed Jobs** - Re-run specific failed jobs
6. **Workflow History** - View past generations and re-download artifacts

### Configuration Options
```javascript
// Future: User-configurable settings
const monitorConfig = {
    pollInterval: 5000,        // ms between status checks
    autoDownload: true,        // Auto-download on success
    notifications: true,       // Browser notifications
    showLogs: false,           // Show workflow logs
    maxRetries: 3              // Max retries for API errors
};
```

## Troubleshooting

### Issue: Progress stuck at 0%
**Cause:** Workflow not triggering or run ID not returned
**Solution:** Check GitHub Actions permissions and workflow file

### Issue: Auto-download not working
**Cause:** Browser blocking downloads or artifact not ready
**Solution:** Check browser download permissions, wait for workflow completion

### Issue: "Failed to fetch workflow status"
**Cause:** Invalid token, network error, or API rate limit
**Solution:** Re-authenticate, check internet connection, wait if rate limited

### Issue: Jobs not displaying
**Cause:** Workflow hasn't started jobs yet or API error
**Solution:** Wait a few seconds, check workflow on GitHub

## Code Examples

### Starting Monitoring Manually

```javascript
// Initialize monitor
const monitor = new WorkflowMonitor(
    'your-github-token',
    'owner/repo'
);

// Start monitoring a specific run
await monitor.startMonitoring(123456789);
```

### Customizing Progress Display

```javascript
// Override progress calculation
monitor.updateProgress = function(run) {
    // Custom logic here
    const customPercent = calculateCustomProgress(run);
    this.updateProgressBar(customPercent);
};
```

### Handling Custom Completion

```javascript
// Override completion handler
monitor.handleCompletion = async function(run) {
    if (run.conclusion === 'success') {
        // Custom success handling
        await customSuccessHandler(run);
    }
};
```

## Support

For issues or questions:
1. Check workflow logs on GitHub Actions
2. Review browser console for JavaScript errors
3. Open issue on GitHub repository
4. Contact DevOps team

---

**Version:** 1.0
**Last Updated:** 2025-11-08
**Author:** Infrastructure Accelerator Team
