# Infrastructure Accelerator - Web UI

This is the GitHub Pages site for Infrastructure Accelerator.

## Features

- ✨ Interactive component selection
- 📊 Real-time architecture diagram preview
- 🎯 Multi-environment support
- 🚀 One-click workflow trigger

## Usage

Visit the live site at: [https://viacheslavsubotskyijoinforma.github.io/Infrastrucutre-accelerator/](https://viacheslavsubotskyijoinforma.github.io/Infrastrucutre-accelerator/)

### Configuration Steps

1. Enter your project name
2. Select components (VPC is required, EKS Auto Mode optional)
3. Choose environments (dev, staging, prod)
4. Select AWS region
5. Enter your AWS Account ID
6. Click "Generate Infrastructure"

### Authentication

The workflow trigger uses GitHub OAuth for seamless authentication:
- **Secure token storage**: Uses sessionStorage (auto-cleared on tab close)
- **Configurable OAuth settings**: Can be overridden via `window.CONFIG`
- **Minimal permissions**: Only requests necessary scopes (repo, workflow)

For security testing or custom deployments, you can override the OAuth configuration:
```javascript
window.CONFIG = {
    GITHUB_CLIENT_ID: 'your-client-id',
    GITHUB_REDIRECT_URI: window.location.origin,
    GITHUB_SCOPE: 'repo,workflow',
    TOKEN_STORAGE: 'session'  // or 'local'
};
```

## Local Development

```bash
# Serve locally
cd docs
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

## Architecture

- **Pure HTML/CSS/JavaScript** (no build step required)
- **SVG-based dynamic diagrams** with error boundaries and fallback rendering
- **Responsive design** for mobile and desktop
- **GitHub Actions API integration** via OAuth authentication
- **Configurable deployment** via `window.CONFIG` and `window.APP_CONFIG`
- **Dark mode support** with theme-aware SVG colors

### Recent Improvements

**Security Enhancements** (2025-11-07):
- OAuth tokens stored in sessionStorage instead of localStorage
- Configurable OAuth settings for custom deployments
- Minimal permission scopes

**Reliability Improvements**:
- Error boundaries for SVG rendering
- Fallback diagram rendering on errors
- Graceful degradation for missing elements

**User Experience**:
- Real-time architecture preview
- Visual feedback for component dependencies
- Responsive mobile layout
