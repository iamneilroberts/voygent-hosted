# Voygen API

A lightweight Express.js API server for the Voygen travel assistant platform, designed for easy deployment on Render.com and other cloud platforms.

## Overview

This API provides three main service endpoints extracted from the VoygentCE orchestrator:

- **Extract**: Hotel and room data extraction and ingestion
- **Import-from-URL**: Web content scraping and trip data parsing
- **Publish**: Travel proposal generation and GitHub Pages publishing

## Architecture

- **Native Node.js**: Optimized for Render.com's native runtime (no Docker required)
- **TypeScript**: Type-safe development with ES modules
- **Remote MCP Integration**: Connects to Cloudflare D1 database and GitHub via MCP protocol
- **Modular Routes**: Clean separation of concerns with dedicated route handlers

## Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required environment variables:
```bash
# Remote MCP Database (D1) Configuration
MCP_D1_DATABASE_URL=https://d1-database-improved.somotravel.workers.dev
MCP_AUTH_KEY=your-mcp-auth-key-here

# GitHub MCP Configuration (for publishing)
GITHUB_MCP_URL=https://github-mcp-cta.somotravel.workers.dev
GITHUB_AUTH_KEY=your-github-auth-key-here
```

### 3. Development

```bash
# Build TypeScript
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

### 4. Testing

The API will be available at `http://localhost:3000`

Test endpoints:
- Health check: `GET /health`
- Extract status: `GET /voygen/extract/status`
- Import status: `GET /voygen/import-from-url/status`
- Publish status: `GET /voygen/publish/status`

## API Endpoints

### Extract Service (`/voygen/extract`)

#### `POST /voygen/extract/hotels`
Extract and ingest hotel data for a trip.

**Request body:**
```json
{
  "trip_id": "string",
  "city": "string",
  "hotels": ["array of hotel objects"],
  "site": "string (optional)",
  "session_id": "string (optional)"
}
```

#### `POST /voygen/extract/rooms`
Extract and ingest room data for hotels.

**Request body:**
```json
{
  "trip_id": "string",
  "rooms_by_hotel": ["array of room objects by hotel"],
  "site": "string (optional)"
}
```

### Import Service (`/voygen/import-from-url`)

#### `POST /voygen/import-from-url/content`
Import and parse content from any URL using readability.

**Request body:**
```json
{
  "url": "string",
  "trip_id": "string (optional)",
  "save_to_database": "boolean (optional)"
}
```

#### `POST /voygen/import-from-url/parse`
Import URL content and parse into structured trip data.

**Request body:**
```json
{
  "url": "string",
  "trip_id": "string",
  "parse_strategy": "schedule_first|full_text (optional)"
}
```

### Publish Service (`/voygen/publish`)

#### `POST /voygen/publish/proposal`
Generate and optionally publish travel proposals.

**Request body:**
```json
{
  "trip_id": "string",
  "template": "standard|luxury|family (optional)",
  "publish_to_github": "boolean (optional)"
}
```

#### `POST /voygen/publish/preview`
Preview proposal without publishing.

**Request body:**
```json
{
  "trip_id": "string",
  "template": "standard|luxury|family (optional)"
}
```

#### `GET /voygen/publish/templates`
List available proposal templates.

## Deployment on Render.com

### 1. Repository Setup

Push your code to GitHub repository: `https://github.com/iamneilroberts/voygent-hosted`

### 2. Render.com Configuration

Create a new Web Service with these settings:

**Build Command:**
```bash
npm run build
```

**Start Command:**
```bash
npm start
```

**Environment Variables:**
- `NODE_ENV=production`
- `MCP_D1_DATABASE_URL=https://d1-database-improved.somotravel.workers.dev`
- `MCP_AUTH_KEY=your-mcp-auth-key`
- `GITHUB_MCP_URL=https://github-mcp-cta.somotravel.workers.dev`
- `GITHUB_AUTH_KEY=your-github-auth-key`

### 3. Auto-Deploy

Render.com will automatically deploy on every push to the main branch.

## Why Native Node.js over Docker?

✅ **Faster Deployments**: No container build time
✅ **Auto-Deploy**: Git-based continuous deployment
✅ **Zero-Downtime**: Native runtime updates seamlessly
✅ **Cost Effective**: More efficient resource usage
✅ **Simplicity**: No Docker complexity to manage

## Dependencies

**Core:**
- `express` - Web framework
- `cors` - Cross-origin resource sharing
- `body-parser` - Request body parsing
- `dotenv` - Environment configuration

**Web Scraping:**
- `jsdom` - DOM implementation
- `@mozilla/readability` - Content extraction
- `node-fetch` - HTTP requests

**Development:**
- `typescript` - Type safety
- `ts-node` - TypeScript execution
- `@types/*` - Type definitions

## Development Notes

### MCP Integration

The API acts as a bridge between HTTP requests and the MCP (Model Context Protocol) ecosystem:

- **D1 Database**: Remote Cloudflare Workers database via MCP
- **GitHub Pages**: Document publishing via GitHub MCP server
- **Stateless**: No local database dependencies

### Error Handling

- Comprehensive error responses with development/production modes
- MCP connection failure handling
- Request validation with descriptive error messages

### TypeScript Configuration

- ES modules with Node.js 18+ target
- Strict type checking enabled
- Source maps for debugging
- Declaration files generated

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | No | Environment mode (development/production) |
| `PORT` | No | Server port (default: 3000) |
| `MCP_D1_DATABASE_URL` | Yes | Remote D1 database MCP endpoint |
| `MCP_AUTH_KEY` | Yes | Authentication key for D1 MCP |
| `GITHUB_MCP_URL` | Yes | GitHub MCP server endpoint |
| `GITHUB_AUTH_KEY` | Yes | Authentication key for GitHub MCP |
| `ALLOWED_ORIGINS` | No | CORS allowed origins |

## Monitoring and Health Checks

- Health endpoint: `GET /health` returns service status
- Each service has its own status endpoint
- JSON responses with timestamp and version info
- Error logging with environment-appropriate detail levels

## Support

For issues and questions:
- VoygentCE Documentation
- MCP Server Status: Check individual MCP endpoints
- Render.com Logs: Monitor deployment and runtime logs