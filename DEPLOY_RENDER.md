# Render.com Deployment Guide

## 🚀 Deploy Voygen API to Render.com

### Step 1: Access Render.com

1. Go to [https://render.com](https://render.com)
2. Sign in with your GitHub account
3. Click **"New +"** → **"Web Service"**

### Step 2: Connect Repository

1. **Connect Repository**: `iamneilroberts/voygent-hosted`
2. **Branch**: `main`
3. **Root Directory**: Leave empty (repository root)

### Step 3: Basic Configuration

**Service Details:**
- **Name**: `voygen-api` (or your preferred name)
- **Region**: Choose closest to your users
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: `npm run build`
- **Start Command**: `npm start`

### Step 4: Environment Variables

Click **"Advanced"** and add these environment variables:

#### Required Variables

```bash
NODE_ENV=production
```

#### MCP Database Configuration

```bash
MCP_D1_DATABASE_URL=https://d1-database-improved.somotravel.workers.dev
MCP_AUTH_KEY=your-mcp-auth-key-here
```

#### GitHub MCP Configuration (for publishing)

```bash
GITHUB_MCP_URL=https://github-mcp-cta.somotravel.workers.dev
GITHUB_AUTH_KEY=your-github-auth-key-here
```

#### Optional Variables

```bash
# CORS Configuration (if needed)
ALLOWED_ORIGINS=https://yourdomain.com,https://voygen.app

# Custom port (Render sets this automatically)
# PORT=3000
```

### Step 5: Deploy

1. Click **"Create Web Service"**
2. Render will automatically:
   - Clone your repository
   - Install dependencies (`npm install`)
   - Build the project (`npm run build`)
   - Start the server (`npm start`)

### Step 6: Verify Deployment

Once deployed, test these endpoints:

```bash
# Health check
curl https://your-app-name.onrender.com/health

# API status
curl https://your-app-name.onrender.com/voygen/extract/status
curl https://your-app-name.onrender.com/voygen/import-from-url/status
curl https://your-app-name.onrender.com/voygen/publish/status
```

## 🔧 Environment Variables Reference

### Authentication Keys

You'll need to get these values from your existing MCP server deployments:

1. **MCP_AUTH_KEY**: Authentication key for D1 database MCP server
2. **GITHUB_AUTH_KEY**: Authentication key for GitHub MCP server

### MCP Server URLs

These should match your existing Cloudflare Workers deployments:

- **D1 Database**: `https://d1-database-improved.somotravel.workers.dev`
- **GitHub MCP**: `https://github-mcp-cta.somotravel.workers.dev`

## 🔄 Auto-Deploy Setup

Render.com automatically deploys when you push to the `main` branch:

```bash
# Make changes to your code
git add .
git commit -m "feat: add new feature"
git push origin main
# Render will automatically rebuild and deploy
```

## 🚨 Troubleshooting

### Build Fails

**Check build logs for:**
- TypeScript compilation errors
- Missing dependencies
- Environment variable issues

**Common fixes:**
```bash
# Locally test build
npm run build

# Check TypeScript errors
npm run dev
```

### Runtime Errors

**Check deployment logs for:**
- Missing environment variables
- MCP connection failures
- Port binding issues

**Common fixes:**
- Verify all environment variables are set
- Test MCP endpoints directly
- Check Render.com service logs

### MCP Connection Issues

**Verify MCP servers are accessible:**
```bash
# Test D1 database MCP
curl https://d1-database-improved.somotravel.workers.dev/health

# Test GitHub MCP
curl https://github-mcp-cta.somotravel.workers.dev/health
```

## 📊 Monitoring

### Render.com Dashboard

- **Metrics**: CPU, Memory, Request volume
- **Logs**: Real-time application logs
- **Deploys**: Deployment history and status

### Health Endpoints

Monitor these endpoints for service health:

```bash
GET /health                           # Overall API health
GET /voygen/extract/status           # Extract service status
GET /voygen/import-from-url/status   # Import service status
GET /voygen/publish/status           # Publish service status
```

## 🔗 Integration

### Update MCP Clients

Update any existing MCP clients to point to your new Render.com URL:

```bash
# Replace localhost references
OLD: http://localhost:3000
NEW: https://your-app-name.onrender.com
```

### LibreChat Integration

If integrating with LibreChat, update endpoint configurations to use your Render.com URL.

## 💰 Pricing

**Free Tier Limits:**
- 750 hours/month (enough for 24/7 operation)
- Spins down after 15 minutes of inactivity
- 512MB RAM, 0.1 CPU

**Paid Tier Benefits:**
- No spin-down (always on)
- More resources (RAM/CPU)
- Custom domains
- Priority support

## 🔐 Security

### HTTPS

Render.com automatically provides HTTPS with valid SSL certificates.

### Environment Variables

All environment variables are encrypted and securely stored.

### Access Control

Consider implementing API key authentication for production use.

## 🎯 Next Steps

1. **Custom Domain**: Add your own domain in Render.com dashboard
2. **Monitoring**: Set up alerts for downtime or errors
3. **Scaling**: Upgrade to paid plan for production workloads
4. **Backup**: Regular backup of environment variables configuration

---

## 📞 Support

- **Render.com Docs**: [https://render.com/docs](https://render.com/docs)
- **Voygen Issues**: [GitHub Issues](https://github.com/iamneilroberts/voygent-hosted/issues)
- **MCP Documentation**: Check individual MCP server repositories