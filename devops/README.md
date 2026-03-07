# TheGame - DevOps Configuration

## Overview
This directory contains deployment configuration for TheGame application on the Swarm cluster.

## Prerequisites
- Docker and Docker Compose installed locally
- Access to the Swarm cluster
- GitHub repository with SSH access

## Directory Structure
- `docker-compose.swarm.yml` - Swarm stack definition
- `Dockerfile` - Container image definition
- `.env` - Environment variables for deployment

## Deployment Steps

### 1. Build the Stack
```bash
# Set environment variables
export SSH_URL=git@github.com:gvinsot/thegame.git
export VERSION=1.0.0

# Build via Swarm Manager
# (Use MCP tool: build_stack)
```

### 2. Deploy the Stack
```bash
# Deploy via Swarm Manager
# (Use MCP tool: deploy_stack)
```

### 3. Verify Deployment
```bash
# Check stack status
mcp_call Swarm Manager, list_stacks, {}

# Check containers
mcp_call Swarm Manager, list_containers, {}

# Check logs
mcp_call Swarm Manager, search_logs, {"compose_projects":"thegame"}
```

## Domain Configuration
The application is configured for: `thegame.vinsot.fr`

## Notes
- This is an Android application - the Docker configuration assumes a web-based wrapper or backend service
- For full Android app deployment, consider using Android Emulator in container or webview-based approach
- Update the Dockerfile and docker-compose.swarm.yml based on actual application architecture

## Troubleshooting
- Check logs: `mcp_call Swarm Manager, search_logs, {}`
- Verify node status: `mcp_call Swarm Manager, list_computers, {}`
- Check build status: `mcp_call Swarm Manager, get_action_status, {"action_id":"<id>"}`