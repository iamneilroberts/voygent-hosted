import express from "express";
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

// Remote GitHub MCP API helper function
async function callGitHubMCP(endpoint: string, data: any) {
  const GITHUB_MCP_URL = process.env.GITHUB_MCP_URL;
  const GITHUB_AUTH_KEY = process.env.GITHUB_AUTH_KEY;

  if (!GITHUB_MCP_URL) {
    throw new Error('GITHUB_MCP_URL not configured');
  }

  const response = await fetch(`${GITHUB_MCP_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(GITHUB_AUTH_KEY ? { 'Authorization': `Bearer ${GITHUB_AUTH_KEY}` } : {})
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`GitHub MCP call failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

// POST /voygen/publish/proposal - Generate and publish travel proposal
router.post('/proposal', async (req, res) => {
  try {
    const { trip_id, template = 'standard', publish_to_github = false } = req.body;

    if (!trip_id) {
      return res.status(400).json({
        error: 'Missing required field: trip_id'
      });
    }

    // Generate proposal via MCP
    const proposalResult = await callRemoteMCP('/mcp/call', {
      method: 'generate_proposal',
      params: {
        trip_id,
        template,
        options: {
          include_images: true,
          image_quality: 85
        }
      }
    });

    let publishResult = null;
    if (publish_to_github && proposalResult && typeof proposalResult === 'object' && 'html_content' in proposalResult) {
      // Publish to GitHub Pages via GitHub MCP
      publishResult = await callGitHubMCP('/mcp/call', {
        method: 'publish_travel_document_with_dashboard_update',
        params: {
          trip_id,
          html_content: (proposalResult as any).html_content,
          filename: `trip-${trip_id}-proposal`,
          trip_metadata: {
            title: (proposalResult as any).title || `Trip ${trip_id}`,
            dates: (proposalResult as any).dates || 'TBD',
            status: 'proposal' as const,
            description: (proposalResult as any).description || 'Travel proposal'
          }
        }
      });
    }

    res.json({
      ok: true,
      trip_id,
      template,
      proposal: proposalResult,
      published: publish_to_github,
      publishResult
    });

  } catch (error) {
    console.error('Proposal generation error:', error);
    res.status(500).json({
      error: 'Failed to generate proposal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// POST /voygen/publish/preview - Preview proposal without publishing
router.post('/preview', async (req, res) => {
  try {
    const { trip_id, template = 'standard' } = req.body;

    if (!trip_id) {
      return res.status(400).json({
        error: 'Missing required field: trip_id'
      });
    }

    // Preview proposal via MCP
    const previewResult = await callRemoteMCP('/mcp/call', {
      method: 'preview_proposal',
      params: {
        trip_id,
        template
      }
    });

    res.json({
      ok: true,
      trip_id,
      template,
      preview: previewResult
    });

  } catch (error) {
    console.error('Proposal preview error:', error);
    res.status(500).json({
      error: 'Failed to preview proposal',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /voygen/publish/templates - List available templates
router.get('/templates', async (req, res) => {
  try {
    const templatesResult = await callRemoteMCP('/mcp/call', {
      method: 'list_templates',
      params: {}
    });

    res.json({
      ok: true,
      templates: templatesResult
    });

  } catch (error) {
    console.error('Templates list error:', error);
    res.status(500).json({
      error: 'Failed to list templates',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /voygen/publish/status - Health check for publish service
router.get('/status', (req, res) => {
  res.json({
    ok: true,
    service: 'publish',
    endpoints: [
      'POST /voygen/publish/proposal',
      'POST /voygen/publish/preview',
      'GET /voygen/publish/templates',
      'GET /voygen/publish/status'
    ]
  });
});

export default router;