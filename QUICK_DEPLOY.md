# 🚀 Quick Deployment

## ⚡ Option A — Full LibreChat (recommended)

Use this to get the full LibreChat UI with Voygen config (models + 4 MCP servers) on Render.

Render.com Settings:

```
Build Command: npm run build
Start Command: npm run start
```

Required Env:

```
NODE_ENV=production
CONFIG_PATH=/opt/render/project/src/librechat.yaml
ENDPOINTS=custom
MONGODB_URI=<your mongodb uri>
JWT_SECRET=<min 32 chars>
CREDS_KEY=<32 chars>
CREDS_IV=<16 chars>
ANTHROPIC_API_KEY=<key>
# optional
OPENAI_API_KEY=<key>
```

What it does:
- Clones upstream LibreChat into `./librechat`
- Copies the included `librechat.yaml` (has all 4 Cloudflare MCP servers)
- Builds the client and starts LibreChat with that config

---

## ⚡ Option B — API Only

If you're getting TypeScript build errors with LibreChat, use this **API-only** deployment first:

### **Render.com Settings:**

```bash
Build Command: npm run build-api-only
Start Command: npm run start-api-only
```

### **Environment Variables (Minimal):**

```bash
NODE_ENV=production
ANTHROPIC_API_KEY=your-anthropic-key-here
```

### **Result:**
- ✅ **API endpoints work immediately**: `/voygen/extract`, `/voygen/import-from-url`, `/voygen/publish`
- ✅ **All 4 MCP servers available** via API calls
- ✅ **No TypeScript build errors**
- ✅ **Fast deployment** (2-3 minutes vs 15+ minutes)

## 🎯 **Test Your API:**

```bash
# Health check
curl https://your-app.onrender.com/health

# Extract service
curl https://your-app.onrender.com/voygen/extract/status

# Import service
curl https://your-app.onrender.com/voygen/import-from-url/status

# Publish service
curl https://your-app.onrender.com/voygen/publish/status
```

## 🔄 **Add LibreChat Later:**

Once API-only is working, you can:

1. **Change build command** to: `npm run install-librechat && npm run build-all`
2. **Change start command** to: `npm run start-librechat`
3. **Add MongoDB** and other LibreChat environment variables
4. **Redeploy**

## ✅ **This Gets You:**

- ✅ **Working Voygen API** with all MCP servers
- ✅ **Web scraping** via `/voygen/import-from-url`
- ✅ **Hotel data extraction** via `/voygen/extract`
- ✅ **Proposal publishing** via `/voygen/publish`
- ✅ **Ready for integrations** with other tools

**Start simple, then expand!** 🎉
