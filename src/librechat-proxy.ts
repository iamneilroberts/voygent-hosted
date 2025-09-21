import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// LibreChat proxy configuration
const librechatProxy = createProxyMiddleware({
  target: process.env.LIBRECHAT_URL || 'http://localhost:3080',
  changeOrigin: true,
  pathRewrite: {
    '^/librechat': '', // Remove /librechat prefix when forwarding
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add any custom headers if needed
    proxyReq.setHeader('X-Forwarded-For', req.ip);
  },
  onError: (err, req, res) => {
    console.error('LibreChat proxy error:', err);
    res.status(500).json({
      error: 'LibreChat service unavailable',
      message: 'Please try again later'
    });
  }
});

// Health check for LibreChat
router.get('/health', async (req, res) => {
  try {
    const librechatUrl = process.env.LIBRECHAT_URL || 'http://localhost:3080';
    const response = await fetch(`${librechatUrl}/api/auth/logout`, { method: 'HEAD' });

    res.json({
      ok: true,
      service: 'librechat-proxy',
      librechat_status: response.ok ? 'healthy' : 'unhealthy',
      librechat_url: librechatUrl
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      service: 'librechat-proxy',
      librechat_status: 'unreachable',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Proxy all other requests to LibreChat
router.use('/', librechatProxy);

export default router;