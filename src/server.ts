// Simple, robust server startup for Render.com
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Resolve current dir for static paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

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

// Root endpoint: in production, send users to the LibreChat UI
app.get('/', (req, res) => {
  if ((process.env.NODE_ENV || 'development') === 'production') {
    return res.redirect(302, '/librechat/');
  }
  res.json({
    message: 'Voygen API Server',
    version: '0.1.0',
    status: 'running',
    endpoints: [
      '/health',
      '/voygen/extract',
      '/voygen/import-from-url',
      '/voygen/publish',
      '/librechat (UI)'
    ]
  });
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
  // Serve the SPA under /librechat
  app.use('/librechat', express.static(librechatDist, { fallthrough: true }));
  // Also expose top-level assets at root paths expected by index.html
  app.use('/assets', express.static(path.join(librechatDist, 'assets'), { fallthrough: true }));
  app.use('/', express.static(librechatDist, { index: false, fallthrough: true })); // sw.js, workbox-*.js, manifest, etc.
  app.get('/librechat/*', (req, res) => {
    res.sendFile(path.join(librechatDist, 'index.html'));
  });
  console.log('✅ LibreChat static UI mounted at /librechat');
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
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
