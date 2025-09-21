// Simple, robust server startup for Render.com
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "child_process";
import fs from "fs";

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Resolve current dir for static paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Proxy LibreChat API and OAuth to upstream backend if provided
const librechatUpstream = process.env.LIBRECHAT_URL;
if (librechatUpstream) {
  console.log(`🔁 Proxying /api and /oauth to ${librechatUpstream}`);
  const apiProxy = createProxyMiddleware({
    target: librechatUpstream,
    changeOrigin: true,
    ws: true,
    cookieDomainRewrite: '', // make upstream cookies valid for our domain
    cookiePathRewrite: { '/': '/' },
    logLevel: 'warn',
  });
  app.use(['/api', '/oauth'], apiProxy);
}

// If no upstream is provided, bootstrap LibreChat backend locally and proxy to it
async function ensureLocalLibreChat() {
  if (process.env.LIBRECHAT_URL) return; // upstream set; nothing to do

  const external = process.env.RENDER_EXTERNAL_URL || '';
  const publicURL = external.startsWith('http') ? external : undefined;

  // Required: Mongo connection (accept either MONGO_URI or MONGODB_CONNECTION_STRING)
  const mongoFromAlt = process.env.MONGODB_CONNECTION_STRING;
  if (!process.env.MONGO_URI && mongoFromAlt) {
    process.env.MONGO_URI = mongoFromAlt;
  }
  if (!process.env.MONGO_URI) {
    console.warn('⚠️ Mongo connection not set. Provide MONGO_URI or MONGODB_CONNECTION_STRING.');
    console.warn('   Set MONGO_URI in Render → Environment. Example: mongodb+srv://<user>:<pass>@cluster/<db>?retryWrites=true&w=majority');
    return;
  }

  // Spawn LibreChat API (port 3080)
  const env = {
    ...process.env,
    HOST: '0.0.0.0',
    PORT: process.env.LIBRECHAT_PORT || '3080',
    TRUST_PROXY: process.env.TRUST_PROXY || '1',
    DOMAIN_SERVER: publicURL || process.env.DOMAIN_SERVER || 'http://localhost:3080',
    DOMAIN_CLIENT: publicURL || process.env.DOMAIN_CLIENT || 'http://localhost:3080',
    NO_INDEX: process.env.NO_INDEX || 'true',
    CONSOLE_JSON: process.env.CONSOLE_JSON || 'false',
    // Ensure LibreChat sees the Mongo connection
    MONGO_URI: process.env.MONGO_URI,
  } as NodeJS.ProcessEnv;

  console.log('🚀 Starting embedded LibreChat backend on :3080');
  const child = spawn('node', ['librechat/api/server/index.js'], {
    env,
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  child.on('exit', (code) => {
    console.error(`LibreChat backend exited with code ${code}`);
  });

  // Always proxy /api and /oauth to the local backend when upstream not set
  const localProxy = createProxyMiddleware({
    target: 'http://localhost:3080',
    changeOrigin: true,
    ws: true,
    cookieDomainRewrite: '',
    cookiePathRewrite: { '/': '/' },
    logLevel: 'warn',
  });
  app.use(['/api', '/oauth'], localProxy);
}

ensureLocalLibreChat().catch((e) => console.error('Failed to start embedded LibreChat backend:', e));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'voygen-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint (dev info only if UI isn't mounted below)
app.get('/', (req, res, next) => {
  // If UI static later serves index.html, skip this handler
  (res as any).sent ? next() : next();
});

// Import routes with error handling
try {
  console.log('Loading routes...');

  // Dynamic imports with error handling
  import('./routes/extract.js').then(module => {
    app.use("/voygen/extract", module.default);
    console.log('✅ Extract routes loaded');
  }).catch(err => {
    console.error('❌ Failed to load extract routes:', err.message);
  });

  import('./routes/importFromUrl.js').then(module => {
    app.use("/voygen/import-from-url", module.default);
    console.log('✅ Import routes loaded');
  }).catch(err => {
    console.error('❌ Failed to load import routes:', err.message);
  });

  import('./routes/publish.js').then(module => {
    app.use("/voygen/publish", module.default);
    console.log('✅ Publish routes loaded');
  }).catch(err => {
    console.error('❌ Failed to load publish routes:', err.message);
  });

} catch (error) {
  console.error('❌ Error loading routes:', error);
}

// Serve LibreChat built UI if present
try {
  const librechatDist = path.resolve(__dirname, '../librechat/client/dist');
  const hasIndex = fs.existsSync(path.join(librechatDist, 'index.html'));
  // Serve frontend at ROOT so router paths match
  if (hasIndex) {
  app.use('/assets', express.static(path.join(librechatDist, 'assets'), { fallthrough: true }));
  app.use('/', express.static(librechatDist, {
    index: 'index.html',
    fallthrough: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('index.html')) {
        res.setHeader('Cache-Control', 'no-store');
      } else if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (filePath.endsWith('sw.js') || filePath.includes('workbox-')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    },
  })); // sw.js, workbox-*.js, manifest, etc.
  // Rewrite legacy /librechat paths to root (router doesn't expect base path)
  app.get(['/librechat', '/librechat/*'], (_req, res) => res.redirect(302, '/'));
  // SPA fallback for client routes (avoid API paths)
  app.get('*', (req, res, next) => {
    if (req.method !== 'GET') return next();
    if (req.path.startsWith('/voygen') || req.path.startsWith('/health')) return next();
    // Only serve HTML to browser navigations
    const accept = req.headers['accept'] || '';
    if (typeof accept === 'string' && accept.includes('text/html')) {
      res.setHeader('Cache-Control', 'no-store');
      return res.sendFile(path.join(librechatDist, 'index.html'));
    }
    return next();
  });
  console.log('✅ LibreChat static UI mounted at root');
  }
} catch (err) {
  console.warn('⚠️ LibreChat UI not found; skipping static mount');
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Minimal status shim so /voygen/extract/status always returns 200
app.get('/voygen/extract/status', (_req, res) => {
  res.json({ ok: true, service: 'extract', endpoints: ['POST /voygen/extract/hotels','POST /voygen/extract/rooms','GET /voygen/extract/status'] });
});

// Proxy LibreChat UI to upstream if configured
if (librechatUpstream) {
  // Proxy UI to upstream for browser requests
  const uiProxy = createProxyMiddleware({
    target: librechatUpstream,
    changeOrigin: true,
    ws: true,
    cookieDomainRewrite: '',
    cookiePathRewrite: { '/': '/' },
    logLevel: 'warn',
  });
  // Proxy common asset paths and SPA to upstream
  app.use(['/assets', '/favicon.ico', '/manifest.json', '/sw.js', '/service-worker.js', '/robots.txt'], uiProxy);
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const p = req.path;
    if (p.startsWith('/voygen') || p.startsWith('/api') || p.startsWith('/oauth') || p.startsWith('/health')) return next();
    return (uiProxy as any)(req, res, next);
  });
}
// 404 handler (API-only)
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path, method: req.method });
});

// Graceful error handling
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Voygen API server listening on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
}).on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
