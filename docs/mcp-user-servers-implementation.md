# MCP User Servers Implementation

## Overview
This document tracks the implementation of user-defined MCP (Model Context Protocol) servers in LibreChat. This feature allows users to configure their own MCP servers through the UI, stored in the database, while maintaining compatibility with existing YAML-based configurations.

## Background
- **MCP Servers** expose tools, resources, and prompts via the MCP protocol
- **Tools are inherent to MCP servers**, not to agents/assistants
- **LibreChat acts as an MCP Client** connecting to multiple MCP servers
- **Current Implementation**: MCP servers are configured only via `librechat.yaml`
- **Goal**: Allow users to define their own MCP servers through the UI

## Architecture Overview

### Current MCP Flow
1. MCP servers configured in `librechat.yaml`
2. `initializeMCP()` reads config and initializes servers
3. `mcpManager.mapAvailableTools()` discovers tools from servers
4. Tools cached globally and available to all agents
5. Agents call tools via `createMCPTool()` which routes to appropriate server

### Proposed MCP Flow
1. MCP servers from **both** `librechat.yaml` AND database
2. Merge configurations with database taking precedence (unless override enabled)
3. User-specific servers only visible to that user
4. Same tool discovery and caching mechanism
5. UI for managing servers, viewing tools, testing tools

## Implementation Plan

### Phase 1: Database Schema & Models
- [x] Create `MCPServer` database model
- [x] Add migration scripts (with rollback)
- [x] Create CRUD operations for MCP servers

### Phase 2: Backend API
- [ ] Create API endpoints for MCP server management
- [ ] Implement merge logic for YAML + database configs
- [ ] Add user-specific server filtering
- [ ] Add override mechanism for admin control

### Phase 3: Frontend UI
- [ ] Add "SERVERS" tab to Settings
- [ ] Create server management interface
- [ ] Add server add/edit modal
- [ ] Implement tool viewing and testing

### Phase 4: Integration & Testing
- [ ] Integrate with existing MCP initialization
- [ ] Test server lifecycle (add/edit/delete/disable)
- [ ] Test tool discovery and execution
- [ ] Test merge logic and override mechanism

## Implementation Log

### 2024-01-XX - Phase 1: Database Schema & Models COMPLETED
- [x] Created MCP server types in `packages/data-schemas/src/types/mcpServer.ts`
- [x] Created MCP server schema in `packages/data-schemas/src/schema/mcpServer.ts`
- [x] Created MCP server model in `packages/data-schemas/src/models/mcpServer.ts`
- [x] Updated data-schemas index files to export new types and models
- [x] Created migration runner utility in `api/migrations/utils/migration-runner.js`
- [x] Created first migration `001-create-mcp-servers.js`
- [x] Created migration script `scripts/migrate-mcp.js`
- [x] Created MCP server CRUD operations in `api/models/MCPServer.js`
- [x] Updated models index to export MCP server methods
- [x] Created test script `scripts/test-mcp-migration.js`

#### Database Schema Features Implemented:
- User-scoped MCP servers with unique name constraint per user
- Support for all 4 MCP transport types (stdio, websocket, sse, streamable-http)
- Flexible configuration object supporting type-specific settings
- OAuth configuration support
- Tool caching with enable/disable per tool
- Server status tracking and error handling
- Comprehensive indexing for performance
- Full validation with reversible migrations

#### CRUD Operations Implemented:
- `createMCPServer()` - Create new server with validation
- `getMCPServers()` - Get servers with filtering options
- `getMCPServer()` - Get specific server by ID
- `updateMCPServer()` - Update server configuration
- `deleteMCPServer()` - Delete server
- `updateMCPServerStatus()` - Update connection status
- `updateMCPServerTools()` - Update tool cache
- `toggleMCPServer()` - Enable/disable server
- `getMCPServersByStatus()` - Get servers by status (monitoring)
- `getMCPServerStats()` - Get user statistics

#### Migration Safety Features:
- Reversible migrations with up/down methods
- Migration tracking in database
- Comprehensive validation and constraints
- Safe rollback procedures
- Test scripts for verification

### Phase 2: Backend API COMPLETED
- [x] Create API routes for MCP server management
- [x] Implement comprehensive input validation
- [x] Add user authentication middleware
- [x] Create server connection testing endpoints
- [x] Add service layer for business logic
- [x] Implement proper error handling and security

### Phase 3: Frontend UI COMPLETED
- [x] Add "SERVERS" tab to Settings dialog
- [x] Create server management interface components
- [x] Implement server add/edit modal
- [x] Add tool viewing and management UI
- [x] Integrate with backend API endpoints
- [x] Add comprehensive React Query hooks
- [x] Implement real-time status updates
- [x] Add localization support

### Next Steps - Phase 4: Integration & Testing
- [ ] Connect to real MCP system for server testing
- [ ] Implement actual tool discovery and execution
- [ ] Add configuration merging with YAML files
- [ ] Performance optimization and testing
- [ ] End-to-end testing

## How to Test the Implementation

### 1. Run the Migration
```bash
# Check migration status
node scripts/migrate-mcp.js status

# Run the migration
node scripts/migrate-mcp.js up

# Test the implementation
node scripts/test-mcp-migration.js
```

### 2. Rollback if Needed
```bash
# Rollback the migration
node scripts/migrate-mcp.js down 001-create-mcp-servers

# Verify rollback
node scripts/migrate-mcp.js status
```

### 3. API Testing
```bash
# Test the API endpoints
export TEST_JWT_TOKEN="your-jwt-token"
node scripts/test-mcp-api.js
```

### 4. Manual API Testing
```bash
# Get servers (requires JWT token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3080/api/mcp/servers

# Create a server
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "my-test-server",
       "type": "stdio",
       "config": {
         "command": "node",
         "args": ["my-mcp-server.js"]
       }
     }' \
     http://localhost:3080/api/mcp/servers

# Test server connection
curl -X POST \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:3080/api/mcp/servers/SERVER_ID/test
```

### 5. Database Testing
```javascript
// Example usage in Node.js REPL or script
const { createMCPServer, getMCPServers } = require('./api/models');

// Create a test server
const server = await createMCPServer({
  userId: 'your-user-id',
  name: 'my-test-server',
  type: 'stdio',
  config: {
    command: 'node',
    args: ['my-mcp-server.js']
  }
});

// Get user's servers
const servers = await getMCPServers({ userId: 'your-user-id' });
```

---

*This document will be updated as implementation progresses*