# Vercel Auto-Deploy Setup Guide

This guide will help you set up automatic deployments to Vercel using GitHub Actions.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your project already deployed to Vercel (at least once manually)
3. Admin access to this GitHub repository

## Step 1: Get Your Vercel Token

1. Go to [Vercel Account Settings](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Give it a name (e.g., "GitHub Actions - Infrastructure Accelerator")
4. Set scope to **Full Account**
5. Click **"Create"** and copy the token (starts with `vercel_...`)

⚠️ **Important:** Save this token securely - you won't be able to see it again!

## Step 2: Get Your Vercel Project ID and Org ID

### Option A: From Vercel Dashboard

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **Settings** → **General**
3. Scroll down to **Project ID** - copy this value
4. Your **Org ID** (Team ID) is in the URL: `vercel.com/[ORG_ID]/[project-name]`

### Option B: From Local Vercel CLI

```bash
cd vercel-backend
vercel link  # Link to your existing project
cat .vercel/project.json
```

You'll see:
```json
{
  "projectId": "prj_...",
  "orgId": "team_..."
}
```

## Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add the following:

### Required Secrets:

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `VERCEL_TOKEN` | Your Vercel authentication token | `vercel_xxx...` |
| `VERCEL_ORG_ID` | Your Vercel organization/team ID | `team_xxx...` or `user_xxx...` |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | `prj_xxx...` |

### Optional Secrets (for OAuth functionality):

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret | From GitHub OAuth App settings |

## Step 4: Configure Vercel Environment Variables

Add environment variables in Vercel Dashboard:

1. Go to **Project Settings** → **Environment Variables**
2. Add the following:

| Variable | Value | Environment |
|----------|-------|-------------|
| `GITHUB_CLIENT_ID` | `Ov23li70Q9xYHNx6bOVB` | Production, Preview, Development |
| `GITHUB_CLIENT_SECRET` | Your GitHub OAuth secret | Production, Preview, Development |

## Step 5: Test the Deployment

### Automatic Deployment (Recommended)

The workflow will automatically trigger when:
- You push changes to `vercel-backend/` directory on `main` branch → **Production deploy**
- You push changes to `vercel-backend/` directory on `claude/**` branches → **Preview deploy**
- You modify the workflow file itself

### Manual Deployment

1. Go to **Actions** tab in GitHub
2. Select **"Deploy to Vercel"** workflow
3. Click **"Run workflow"**
4. Choose environment (production/preview)
5. Click **"Run workflow"**

## Deployment Behavior

### Production Deployment (`main` branch)
- Deploys to production domain (e.g., `your-project.vercel.app`)
- Triggered by push to `main` branch
- Requires all checks to pass

### Preview Deployment (Feature branches)
- Deploys to unique preview URL (e.g., `your-project-git-branch.vercel.app`)
- Triggered by push to `claude/**` branches
- Perfect for testing before merging

## Troubleshooting

### Error: "Missing required secrets"
- Make sure you added all three secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- Check that secret names match exactly (case-sensitive)

### Error: "Project not found"
- Verify your `VERCEL_PROJECT_ID` is correct
- Make sure you've deployed the project to Vercel at least once manually
- Run `vercel link` in `vercel-backend/` directory to link the project

### Error: "Authentication failed"
- Verify your `VERCEL_TOKEN` is valid and not expired
- Create a new token if needed

### OAuth not working after deployment
- Make sure `GITHUB_CLIENT_SECRET` is set in Vercel environment variables
- Update the callback URL in your GitHub OAuth App settings to match your Vercel domain

## Vercel Project Configuration

Your `vercel-backend/vercel.json` is already configured with:

```json
{
  "version": 2,
  "functions": {
    "api/**/*.js": {
      "memory": 128,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "https://viacheslavsubotskyijoinforma.github.io"
        }
      ]
    }
  ]
}
```

If you need to update CORS settings, modify the `Access-Control-Allow-Origin` value.

## Next Steps

After successful setup:

1. ✅ Push changes to `vercel-backend/` - deployment happens automatically
2. ✅ Monitor deployments in GitHub Actions tab
3. ✅ Check deployment status in Vercel Dashboard
4. ✅ Test your OAuth callback: `https://your-project.vercel.app/api/auth/callback`

## Resources

- [Vercel GitHub Integration Docs](https://vercel.com/docs/git/vercel-for-github)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

---

**Last Updated:** 2025-11-07
