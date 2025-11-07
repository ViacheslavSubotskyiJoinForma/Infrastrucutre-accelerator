# Infrastructure Accelerator - OAuth Backend

Vercel serverless function for handling GitHub OAuth callbacks.

## Setup

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` for local development:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your GitHub OAuth App credentials:
- `GITHUB_CLIENT_ID` - From GitHub OAuth App (already set)
- `GITHUB_CLIENT_SECRET` - From GitHub OAuth App settings

### 3. Local Development

```bash
vercel dev
```

The function will be available at: `http://localhost:3000/api/auth/callback`

### 4. Deploy to Vercel

```bash
vercel --prod
```

After deployment, configure environment variables in Vercel Dashboard:
1. Go to your project settings
2. Navigate to Environment Variables
3. Add:
   - `GITHUB_CLIENT_ID` = `Ov23li70Q9xYHNx6bOVB`
   - `GITHUB_CLIENT_SECRET` = (your secret from GitHub)

### 5. Update Frontend

After deployment, update `docs/js/auth.js` with your Vercel URL:

```javascript
const VERCEL_BACKEND_URL = 'https://your-project.vercel.app';
```

## API Endpoint

### POST /api/auth/callback

Exchanges GitHub OAuth authorization code for access token.

**Request:**
```json
{
  "code": "github_oauth_code"
}
```

**Response:**
```json
{
  "access_token": "gho_...",
  "token_type": "bearer",
  "scope": "repo,workflow"
}
```

**Error Response:**
```json
{
  "error": "Error description"
}
```

## Testing

Test the endpoint locally:

```bash
curl -X POST http://localhost:3000/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code"}'
```

## Security

- Client Secret is stored as environment variable (never in code)
- CORS restricted to GitHub Pages domain only
- No logging of sensitive data
- Token exchange happens server-side only
