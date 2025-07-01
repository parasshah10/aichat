# MCP Backend API Implementation

## Overview
Phase 2 implementation of user-defined MCP servers: Backend API endpoints, authentication, merge logic, and integration with existing MCP system.

## API Endpoints Design

### Server Management Endpoints
```
GET    /api/mcp/servers           - List user's MCP servers
POST   /api/mcp/servers           - Create new MCP server
GET    /api/mcp/servers/:id       - Get specific server details
PUT    /api/mcp/servers/:id       - Update server configuration
DELETE /api/mcp/servers/:id       - Delete server
POST   /api/mcp/servers/:id/test  - Test server connection
POST   /api/mcp/servers/:id/toggle - Enable/disable server
```

### Tool Management Endpoints
```
GET    /api/mcp/servers/:id/tools              - List tools for a server
POST   /api/mcp/servers/:id/tools/:name/test   - Test specific tool
PUT    /api/mcp/servers/:id/tools/:name/toggle - Enable/disable tool
POST   /api/mcp/servers/:id/refresh-tools      - Refresh tool cache
```

### System Management Endpoints (Admin)
```
GET    /api/mcp/config/status     - Get merge configuration status
POST   /api/mcp/config/override   - Enable/disable YAML-only mode
GET    /api/mcp/stats             - Get system-wide MCP statistics
POST   /api/mcp/refresh-all       - Refresh all server connections
```

## Implementation Plan

### Step 1: API Routes Structure
- Create `/api/server/routes/mcp/` directory
- Implement individual route files
- Add to main routes index

### Step 2: Middleware & Validation
- Authentication middleware
- Input validation schemas
- Error handling middleware
- Rate limiting for testing endpoints

### Step 3: Service Layer
- MCP server management service
- Configuration merge service
- Connection testing service
- Tool discovery service

### Step 4: Integration
- Modify existing MCP initialization
- Implement real-time server management
- Add configuration override system

## Implementation Log

### 2024-01-XX - Phase 2: Backend API COMPLETED
- [x] Created comprehensive API routes in `api/server/routes/mcp.js`
- [x] Implemented input validation middleware in `api/server/middleware/validate/mcpServer.js`
- [x] Created service layer in `api/server/services/MCPServerService.js`
- [x] Added proper error handling and user isolation
- [x] Created API test script in `scripts/test-mcp-api.js`

#### API Endpoints Implemented:
**Server Management:**
- `GET /api/mcp/servers` - List user's servers with filtering
- `POST /api/mcp/servers` - Create new server with validation
- `GET /api/mcp/servers/:id` - Get specific server details
- `PUT /api/mcp/servers/:id` - Update server configuration
- `DELETE /api/mcp/servers/:id` - Delete server
- `POST /api/mcp/servers/:id/toggle` - Enable/disable server
- `GET /api/mcp/stats` - Get user statistics

**Tool Management:**
- `GET /api/mcp/servers/:id/tools` - List server tools
- `PUT /api/mcp/servers/:id/tools/:name/toggle` - Enable/disable tool
- `POST /api/mcp/servers/:id/refresh-tools` - Refresh tool cache

**Testing & Connection:**
- `POST /api/mcp/servers/:id/test` - Test server connection
- Connection status tracking and error reporting

#### Validation Features:
- Comprehensive input validation using express-validator
- Type-specific validation (stdio vs web-based servers)
- URL protocol validation (ws/wss for WebSocket, http/https for others)
- MongoDB ObjectId validation for server IDs
- OAuth configuration validation
- Timeout and configuration limits

#### Service Layer Features:
- Business logic separation from routes
- Configuration validation and sanitization
- Placeholder for MCP system integration
- Error handling and logging
- User isolation and security

#### Security Features:
- JWT authentication required for all endpoints
- User-scoped operations (users can only access their own servers)
- Input sanitization and validation
- Proper error messages without information leakage

#### Testing:
- Comprehensive API test script with 11 test cases
- Tests all CRUD operations
- Validates error handling and edge cases
- Tests authentication and authorization
- Includes cleanup procedures

### Next Steps - Phase 3: Frontend UI
- [ ] Add "SERVERS" tab to Settings dialog
- [ ] Create server management interface components
- [ ] Implement server add/edit modal
- [ ] Add tool viewing and management UI
- [ ] Integrate with backend API endpoints

### Integration Notes:
- Service layer has placeholders for MCP system integration
- Configuration merging logic ready for implementation
- Tool discovery and connection testing ready for real MCP integration
- All endpoints follow LibreChat patterns and conventions

---

*This document will be updated as implementation progresses*