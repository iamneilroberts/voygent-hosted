import express from "express";

// Add error handling for module loading
process.on('uncaughtException', (error) => {
  console.error('Extract route uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('Extract route unhandled rejection:', reason);
});

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

// POST /voygen/extract/hotels - Extract and ingest hotel data
router.post('/hotels', async (req, res) => {
  try {
    const { trip_id, city, hotels, site, session_id } = req.body;

    if (!trip_id || !hotels || !Array.isArray(hotels)) {
      return res.status(400).json({
        error: 'Missing required fields: trip_id, hotels (array)'
      });
    }

    // Call remote D1 database via MCP
    const result = await callRemoteMCP('/mcp/call', {
      method: 'ingest_hotels',
      params: {
        trip_id,
        hotels,
        site: site || 'voygen-api',
        session_id
      }
    });

    res.json({
      ok: true,
      message: `Ingested ${hotels.length} hotels for trip ${trip_id}`,
      result
    });

  } catch (error) {
    console.error('Hotel extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract hotels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /voygen/extract/rooms - Extract and ingest room data
router.post('/rooms', async (req, res) => {
  try {
    const { trip_id, rooms_by_hotel, site } = req.body;

    if (!trip_id || !rooms_by_hotel) {
      return res.status(400).json({
        error: 'Missing required fields: trip_id, rooms_by_hotel'
      });
    }

    // Call remote D1 database via MCP for room ingestion
    const result = await callRemoteMCP('/mcp/call', {
      method: 'ingest_rooms',
      params: {
        trip_id,
        rooms_by_hotel,
        site: site || 'voygen-api'
      }
    });

    res.json({
      ok: true,
      message: `Ingested rooms for trip ${trip_id}`,
      result
    });

  } catch (error) {
    console.error('Room extraction error:', error);
    res.status(500).json({
      error: 'Failed to extract rooms',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /voygen/extract/status - Health check for extraction service
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    service: 'extract',
    endpoints: [
      'POST /voygen/extract/hotels',
      'POST /voygen/extract/rooms',
      'GET /voygen/extract/status'
    ]
  });
});

export default router;