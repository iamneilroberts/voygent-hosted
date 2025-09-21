import express from "express";
import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import fetch from "node-fetch";

const router = express.Router();

// Remote MCP API helper function
async function callRemoteMCP(endpoint: string, data: any) {
  const MCP_D1_DATABASE_URL = process.env.MCP_D1_DATABASE_URL;
  const MCP_AUTH_KEY = process.env.MCP_AUTH_KEY;

  if (!MCP_D1_DATABASE_URL) {
    throw new Error('MCP_D1_DATABASE_URL not configured for remote mode');
  }

  const response = await fetch(`${MCP_D1_DATABASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(MCP_AUTH_KEY ? { 'Authorization': `Bearer ${MCP_AUTH_KEY}` } : {})
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`Remote MCP call failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// Helper function to extract content from URL
async function extractContentFromUrl(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    return {
      title: article?.title || '',
      content: article?.content || '',
      textContent: article?.textContent || '',
      length: article?.length || 0,
      excerpt: article?.excerpt || '',
      byline: article?.byline || '',
      siteName: article?.siteName || '',
      publishedTime: article?.publishedTime || '',
      rawHtml: html
    };
  } catch (error) {
    throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// POST /voygen/import-from-url/content - Import and parse content from URL
router.post('/content', async (req, res) => {
  try {
    const { url, trip_id, save_to_database = false } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'Missing required field: url'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'Invalid URL format'
      });
    }

    const extractedContent = await extractContentFromUrl(url);

    // Optionally save to database via MCP
    if (save_to_database && trip_id) {
      try {
        await callRemoteMCP('/mcp/call', {
          method: 'import_trip_page',
          params: {
            trip_id,
            url,
            save_raw_html: true,
            save_text: true,
            tag: 'api-import'
          }
        });
      } catch (error) {
        console.warn('Failed to save to database:', error);
        // Continue without failing the request
      }
    }

    res.json({
      ok: true,
      url,
      extractedContent,
      savedToDatabase: save_to_database && trip_id
    });

  } catch (error) {
    console.error('URL import error:', error);
    res.status(500).json({
      error: 'Failed to import content from URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /voygen/import-from-url/parse - Import URL content and parse into trip data
router.post('/parse', async (req, res) => {
  try {
    const { url, trip_id, parse_strategy = 'schedule_first' } = req.body;

    if (!url || !trip_id) {
      return res.status(400).json({
        error: 'Missing required fields: url, trip_id'
      });
    }

    // Import and parse via MCP
    const result = await callRemoteMCP('/mcp/call', {
      method: 'import_trip_page_and_parse',
      params: {
        trip_id,
        url,
        strategy: parse_strategy,
        overwrite: 'none',
        dry_run: false
      }
    });

    res.json({
      ok: true,
      url,
      trip_id,
      result
    });

  } catch (error) {
    console.error('URL parse error:', error);
    res.status(500).json({
      error: 'Failed to parse trip content from URL',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /voygen/import-from-url/status - Health check for import service
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    service: 'import-from-url',
    endpoints: [
      'POST /voygen/import-from-url/content',
      'POST /voygen/import-from-url/parse',
      'GET /voygen/import-from-url/status'
    ]
  });
});

export default router;