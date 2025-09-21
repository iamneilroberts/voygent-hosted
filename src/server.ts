// Simple, robust server startup for Render.com
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Voygen API Server',
    version: '0.1.0',
    status: 'running',
    endpoints: [
      '/health',
      '/voygen/extract',
      '/voygen/import-from-url',
      '/voygen/publish'
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