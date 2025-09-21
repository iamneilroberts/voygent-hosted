# LibreChat + MCP Servers Deployment on Render.com

## 🎯 Overview

This guide shows how to deploy LibreChat with integrated MCP servers on Render.com. You have two deployment options:

1. **API Only**: Just the Voygen API endpoints (lighter, faster)
2. **Full LibreChat**: Complete LibreChat UI + Voygen API (recommended)

## 🌐 Required MCP Servers

All four servers are **live and tested**:

✅ **d1_database**: `https://d1-database-improved.somotravel.workers.dev/sse`
- Trip and client data management
- Advanced search and operations

✅ **template_document**: `https://template-document-mcp.somotravel.workers.dev/sse`
- Travel document rendering
- Proposal template system

✅ **github_mcp_cta**: `https://github-mcp-cta.somotravel.workers.dev/sse`
- GitHub Pages publishing
- Document deployment

✅ **prompt_instructions**: `https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse`
- Workflow management
- Conversation state

## 🚀 Option 1: API Only Deployment

### Quick Deploy

1. **Create Web Service** on Render.com
2. **Connect Repository**: `iamneilroberts/voygent-hosted`
3. **Build Settings**:
   ```bash
   Build Command: npm run build
   Start Command: npm start
   ```

4. **Environment Variables**:
   ```bash
   NODE_ENV=production
   ANTHROPIC_API_KEY=your-anthropic-key
   OPENAI_API_KEY=your-openai-key (optional)
   ```

**Result**: API endpoints at `https://your-app.onrender.com/voygen/*`

## 🎨 Option 2: Full LibreChat Deployment

### LibreChat + Voygen API Integration

1. **Create Web Service** on Render.com
2. **Connect Repository**: `iamneilroberts/voygent-hosted`
3. **Build Settings**:
   ```bash
   Build Command: npm run install-librechat && npm run build-all
   Start Command: npm run start-librechat
   ```

4. **Environment Variables**:
   ```bash
   # Core Configuration
   NODE_ENV=production

   # API Keys (REQUIRED)
   ANTHROPIC_API_KEY=your-anthropic-key-here
   OPENAI_API_KEY=your-openai-key-here

   # Database (LibreChat)
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/librechat

   # Security
   JWT_SECRET=your-super-secure-jwt-secret-here
   CREDS_KEY=your-32-character-encryption-key
   CREDS_IV=your-16-character-iv-key

   # LibreChat Configuration
   CONFIG_PATH=/opt/render/project/src/librechat.yaml

   # File Handling
   ENDPOINTS=custom
   ```

**Result**: Full LibreChat UI at `https://your-app.onrender.com/` with integrated MCP servers

## 📋 Environment Variables Reference

### Required for LibreChat

| Variable | Example | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` | Anthropic Claude API key |
| `MONGODB_URI` | `mongodb+srv://...` | MongoDB connection string |
| `JWT_SECRET` | `your-super-secret-key` | JWT signing secret |
| `CREDS_KEY` | `32-character-string` | Encryption key (32 chars) |
| `CREDS_IV` | `16-character-string` | Encryption IV (16 chars) |

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENAI_API_KEY` | - | OpenAI API key |
| `CONFIG_PATH` | `/app/librechat.yaml` | LibreChat config file path |
| `ENDPOINTS` | `custom` | Enable custom endpoints |

## 🗄️ MongoDB Setup

### Option 1: MongoDB Atlas (Recommended)

1. Go to [MongoDB Atlas](https://cloud.mongodb.com)
2. Create free cluster
3. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/librechat`
4. Add to `MONGODB_URI` environment variable

### Option 2: External MongoDB Service

Use any MongoDB hosting service and provide the connection string.

## 🔧 LibreChat Configuration

The `librechat.yaml` file includes all four MCP servers:

```yaml
mcpServers:
  d1_database:
    type: "streamable-http"
    url: "https://d1-database-improved.somotravel.workers.dev/sse"
    startup: true

  template_document:
    type: "streamable-http"
    url: "https://template-document-mcp.somotravel.workers.dev/sse"
    startup: true

  github_mcp_cta:
    type: "streamable-http"
    url: "https://github-mcp-cta.somotravel.workers.dev/sse"
    startup: true

  prompt_instructions:
    type: "streamable-http"
    url: "https://prompt-instructions-d1-mcp.somotravel.workers.dev/sse"
    startup: true
```

## 🛠️ Build Commands Explained

### API Only
```bash
npm run build    # Compile TypeScript
npm start        # Start Express server
```

### LibreChat Integration
```bash
npm run install-librechat  # Clone and setup LibreChat
npm run build-all         # Build both API and LibreChat
npm run start-librechat   # Start LibreChat with our config
```

Note: The `setup-librechat` step installs required Rollup plugins inside the cloned LibreChat workspace to satisfy its monorepo build:

```bash
npm install -g rimraf
cd librechat
npm ci
npm install \
  rollup \
  @rollup/plugin-typescript \
  rollup-plugin-typescript2 \
  @rollup/plugin-node-resolve \
  rollup-plugin-peer-deps-external \
  @rollup/plugin-commonjs \
  @rollup/plugin-replace \
  @rollup/plugin-terser \
  @rollup/plugin-json \
  @types/js-yaml
```

## 📊 Resource Requirements

### Free Tier (512MB RAM)
- ✅ **API Only**: Lightweight, runs perfectly
- ⚠️ **LibreChat**: May hit memory limits during build

### Starter Tier ($7/month, 1GB RAM)
- ✅ **API Only**: Plenty of resources
- ✅ **LibreChat**: Recommended for production

## 🔍 Testing Your Deployment

### Health Checks

```bash
# API Health
curl https://your-app.onrender.com/health

# LibreChat Health (if deployed)
curl https://your-app.onrender.com/api/auth/logout -I

# MCP Server Health
curl https://your-app.onrender.com/voygen/extract/status
```

### LibreChat UI

1. Go to: `https://your-app.onrender.com/`
2. Register/login
3. Start new conversation
4. MCP tools should be available automatically

## 🚨 Troubleshooting

### Build Failures

**LibreChat build out of memory:**
```bash
# Solution: Upgrade to Starter plan or use API-only deployment
```

**Missing environment variables:**
```bash
# Check all required variables are set in Render dashboard
```

**Rollup plugin missing during LibreChat build (e.g. '@rollup/plugin-json' or '@rollup/plugin-typescript'):**
```bash
# Solution: Ensure your Build Command uses the latest scripts
# from package.json which install required plugins during setup.
# Then redeploy.
```

### Runtime Issues

**MCP servers not connecting:**
```bash
# Check server status:
curl https://d1-database-improved.somotravel.workers.dev/health
curl https://template-document-mcp.somotravel.workers.dev/health
curl https://github-mcp-cta.somotravel.workers.dev/health
curl https://prompt-instructions-d1-mcp.somotravel.workers.dev/health
```

**MongoDB connection issues:**
```bash
# Verify MONGODB_URI format and credentials
# Check MongoDB Atlas network access settings
```

## 🎉 Success!

Once deployed, you'll have:

- ✅ **LibreChat UI** with travel-specific MCP tools
- ✅ **Complete trip management** via d1_database MCP
- ✅ **Document generation** via template_document MCP
- ✅ **GitHub publishing** via github_mcp_cta MCP
- ✅ **Workflow management** via prompt_instructions MCP
- ✅ **Custom API endpoints** for external integrations

Your travel agent assistant is ready for production! 🧳✈️
