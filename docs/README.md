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

The workflow trigger requires GitHub authentication. For now, you'll be redirected to manually trigger the workflow on GitHub Actions.

Future enhancements may include OAuth integration for seamless triggering.

## Local Development

```bash
# Serve locally
cd docs
python3 -m http.server 8000

# Open in browser
open http://localhost:8000
```

## Architecture

- Pure HTML/CSS/JavaScript (no build step)
- SVG-based dynamic diagrams
- Responsive design
- GitHub Actions API integration (planned)
