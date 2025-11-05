# Infrastructure Generator - Web Interface

This is a web interface for the Infrastructure Template Generator.

## Features

- 🎨 Beautiful, modern UI
- ☑️ Interactive component selection with checkboxes
- 🔄 Automatic dependency resolution
- 👁️ Live configuration preview
- 🚀 One-click workflow trigger via GitHub API
- 📱 Fully responsive design

## How to Use

1. **Open the web interface**: Visit the GitHub Pages URL
2. **Configure your project**:
   - Enter project name
   - Select environments (dev, uat, prod)
   - Choose AWS region
3. **Select components**: Check the boxes for components you need
   - Dependencies are automatically included
   - Cannot deselect components required by others
4. **Advanced options** (optional):
   - Custom S3 bucket for Terraform state
   - Custom DynamoDB table for state locking
   - AWS role assumption settings
5. **GitHub Authentication**:
   - Create a [Personal Access Token](https://github.com/settings/tokens/new?scopes=repo,workflow)
   - Token needs `repo` or `workflow` scope
   - Paste it in the form
6. **Generate**: Click "Generate Infrastructure" button
7. **Monitor**: Go to [Actions page](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator/actions) to see progress
8. **Download**: Get the artifact when workflow completes

## Component Dependencies

The web interface automatically manages dependencies:

- **VPC** → No dependencies (foundational)
- **RDS** → Requires VPC
- **EKS** → Requires VPC
- **Services** → Requires VPC, EKS
- **Secrets** → Requires EKS, Services
- **OpenSearch** → Requires VPC, Services, EKS
- **Monitoring** → Requires VPC, EKS, Services, RDS
- **Common** → No dependencies (management account)

## Security

- GitHub token is never stored
- Token is only sent directly to GitHub API
- All communication happens client-side
- No server or database involved

## Technical Details

- Pure HTML/CSS/JavaScript (no frameworks)
- GitHub Actions API for workflow triggering
- Responsive design with CSS Grid
- Font Awesome icons
- No build step required

## Local Development

To test locally:

```bash
# Simple HTTP server
python3 -m http.server 8000

# Or using Node.js
npx http-server .

# Then open http://localhost:8000
```

## Repository

[Infrastructure Accelerator Repository](https://github.com/ViacheslavSubotskyiJoinForma/Infrastrucutre-accelerator)
