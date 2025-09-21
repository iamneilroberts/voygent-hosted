import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import extractRouter from "./routes/extract.js";
import importRouter from "./routes/importFromUrl.js";
import publishRouter from "./routes/publish.js";
import librechatProxy from "./librechat-proxy.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3080'],
  credentials: true
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'voygen-librechat-api',
    version: '0.1.0',
    timestamp: new Date().toISOString(),
    components: {
      api: 'healthy',
      librechat: process.env.LIBRECHAT_URL ? 'proxied' : 'local'
    }
  });
});

// API routes
app.use("/voygen/extract", extractRouter);
app.use("/voygen/import-from-url", importRouter);
app.use("/voygen/publish", publishRouter);

// LibreChat proxy (serves the main UI)
app.use("/librechat", librechatProxy);

// Default route - redirect to LibreChat or show info
app.get('/', (req, res) => {
  if (process.env.LIBRECHAT_URL || process.env.NODE_ENV === 'production') {
    res.redirect('/librechat');
  } else {
    res.json({
      message: 'Voygen API with LibreChat Integration',
      version: '0.1.0',
      endpoints: [
        '/health',
        '/voygen/extract',
        '/voygen/import-from-url',
        '/voygen/publish',
        '/librechat (LibreChat UI)'
      ],
      librechat_status: 'Run LibreChat separately or set LIBRECHAT_URL'
    });
  }
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  if (req.path.startsWith('/librechat')) {
    // For LibreChat routes, let the proxy handle it
    return;
  }
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`🚀 Voygen API with LibreChat listening on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🎯 LibreChat UI: http://localhost:${port}/librechat`);
  console.log(`🔧 API endpoints: http://localhost:${port}/voygen/*`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});