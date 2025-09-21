import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

import extractRouter from "./routes/extract.js";
import importRouter from "./routes/importFromUrl.js";
import publishRouter from "./routes/publish.js";

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'voygen-api',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use("/voygen/extract", extractRouter);
app.use("/voygen/import-from-url", importRouter);
app.use("/voygen/publish", publishRouter);

// Default route
app.get('/', (req, res) => {
  res.json({
    message: 'Voygen API Server',
    version: '0.1.0',
    endpoints: [
      '/health',
      '/voygen/extract',
      '/voygen/import-from-url',
      '/voygen/publish'
    ]
  });
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
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(port, () => {
  console.log(`🚀 Voygen API server listening on port ${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});