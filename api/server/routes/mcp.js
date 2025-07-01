const { Router } = require('express');
const { MCPOAuthHandler } = require('@librechat/api');
const { logger } = require('@librechat/data-schemas');
const { CacheKeys } = require('librechat-data-provider');
const { requireJwtAuth } = require('~/server/middleware');
const { getFlowStateManager } = require('~/config');
const { getLogStores } = require('~/cache');
const {
  validateCreateMCPServer,
  validateUpdateMCPServer,
  validateServerId,
  validateToolName,
  validateToggle,
  validateServerQuery,
  validateUrlProtocol,
} = require('~/server/middleware/validate/mcpServer');
const {
  getMCPServer,
  getMCPServerStats,
} = require('~/models');
const MCPServerService = require('~/server/services/MCPServerService');

const router = Router();

// ============================================================================
// USER-DEFINED MCP SERVER MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get all MCP servers for the authenticated user
 * GET /api/mcp/servers
 */
router.get('/servers', requireJwtAuth, validateServerQuery, async (req, res) => {
  try {
    const userId = req.user.id;
    const { enabled, type, status } = req.query;

    const filters = {};
    if (enabled !== undefined) filters.enabled = enabled === 'true';
    if (type) filters.type = type;
    if (status) filters.status = status;

    const servers = await MCPServerService.getUserServers(userId, filters);
    
    res.json({ servers });
  } catch (error) {
    logger.error('[MCP Servers] Error getting servers:', error);
    res.status(500).json({ error: 'Failed to retrieve servers' });
  }
});

/**
 * Create a new MCP server
 * POST /api/mcp/servers
 */
router.post('/servers', requireJwtAuth, validateCreateMCPServer, validateUrlProtocol, async (req, res) => {
  try {
    const userId = req.user.id;
    const serverData = req.body;

    const server = await MCPServerService.createUserServer(userId, serverData);
    
    res.status(201).json({ server });
  } catch (error) {
    logger.error('[MCP Servers] Error creating server:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to create server' });
  }
});

/**
 * Get a specific MCP server
 * GET /api/mcp/servers/:id
 */
router.get('/servers/:id', requireJwtAuth, validateServerId, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const server = await getMCPServer(id, userId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json({ server });
  } catch (error) {
    logger.error('[MCP Servers] Error getting server:', error);
    res.status(500).json({ error: 'Failed to retrieve server' });
  }
});

/**
 * Update an MCP server
 * PUT /api/mcp/servers/:id
 */
router.put('/servers/:id', requireJwtAuth, validateServerId, validateUpdateMCPServer, validateUrlProtocol, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    // Don't allow updating userId
    delete updateData.userId;

    const server = await MCPServerService.updateUserServer(id, userId, updateData);
    
    res.json({ server });
  } catch (error) {
    logger.error('[MCP Servers] Error updating server:', error);
    
    if (error.message.includes('Server not found')) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update server' });
  }
});

/**
 * Delete an MCP server
 * DELETE /api/mcp/servers/:id
 */
router.delete('/servers/:id', requireJwtAuth, validateServerId, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    await MCPServerService.deleteUserServer(id, userId);
    
    res.json({ success: true });
  } catch (error) {
    logger.error('[MCP Servers] Error deleting server:', error);
    
    if (error.message.includes('Server not found')) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

/**
 * Toggle server enabled status
 * POST /api/mcp/servers/:id/toggle
 */
router.post('/servers/:id/toggle', requireJwtAuth, validateServerId, validateToggle, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { enabled } = req.body;

    const server = await MCPServerService.toggleUserServer(id, userId, enabled);
    
    res.json({ server });
  } catch (error) {
    logger.error('[MCP Servers] Error toggling server:', error);
    
    if (error.message.includes('Server not found')) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.status(500).json({ error: 'Failed to toggle server' });
  }
});

/**
 * Get user's MCP server statistics
 * GET /api/mcp/stats
 */
router.get('/stats', requireJwtAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await getMCPServerStats(userId);
    
    res.json({ stats });
  } catch (error) {
    logger.error('[MCP Servers] Error getting stats:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// ============================================================================
// TOOL MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * Get tools for a specific server
 * GET /api/mcp/servers/:id/tools
 */
router.get('/servers/:id/tools', requireJwtAuth, validateServerId, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const server = await getMCPServer(id, userId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    res.json({ 
      tools: server.tools,
      toolCount: server.toolCount,
      serverName: server.name,
      serverStatus: server.status
    });
  } catch (error) {
    logger.error('[MCP Servers] Error getting tools:', error);
    res.status(500).json({ error: 'Failed to retrieve tools' });
  }
});

/**
 * Toggle tool enabled status
 * PUT /api/mcp/servers/:id/tools/:toolName/toggle
 */
router.put('/servers/:id/tools/:toolName/toggle', requireJwtAuth, validateServerId, validateToolName, validateToggle, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id, toolName } = req.params;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled field must be a boolean' });
    }

    const server = await getMCPServer(id, userId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Find and update the tool
    const toolIndex = server.tools.findIndex(tool => tool.name === toolName);
    if (toolIndex === -1) {
      return res.status(404).json({ error: 'Tool not found' });
    }

    server.tools[toolIndex].enabled = enabled;
    server.tools[toolIndex].lastUpdated = new Date();

    const updatedServer = await updateMCPServerTools(id, userId, server.tools);
    
    logger.info(`[MCP Tools] Toggled tool '${toolName}' to ${enabled ? 'enabled' : 'disabled'} for server '${server.name}'`);
    res.json({ 
      tool: updatedServer.tools.find(t => t.name === toolName),
      server: updatedServer
    });
  } catch (error) {
    logger.error('[MCP Tools] Error toggling tool:', error);
    res.status(500).json({ error: 'Failed to toggle tool' });
  }
});

// ============================================================================
// SERVER TESTING & CONNECTION ENDPOINTS
// ============================================================================

/**
 * Test server connection
 * POST /api/mcp/servers/:id/test
 */
router.post('/servers/:id/test', requireJwtAuth, validateServerId, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const testResult = await MCPServerService.testServerConnection(id, userId);
    
    res.json({
      success: testResult.success,
      status: testResult.success ? 'online' : 'error',
      error: testResult.error,
      tools: testResult.tools || [],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('[MCP Test] Error testing server connection:', error);
    
    if (error.message.includes('Server not found')) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.status(500).json({ error: 'Failed to test server connection' });
  }
});

/**
 * Refresh server tools
 * POST /api/mcp/servers/:id/refresh-tools
 */
router.post('/servers/:id/refresh-tools', requireJwtAuth, validateServerId, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const result = await MCPServerService.refreshServerTools(id, userId);
    
    res.json(result);
  } catch (error) {
    logger.error('[MCP Tools] Error refreshing tools:', error);
    
    if (error.message.includes('Server not found')) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    res.status(500).json({ error: 'Failed to refresh tools' });
  }
});


// ============================================================================
// OAUTH ENDPOINTS (EXISTING)
// ============================================================================

/**
 * Initiate OAuth flow
 * This endpoint is called when the user clicks the auth link in the UI
 */
router.get('/:serverName/oauth/initiate', requireJwtAuth, async (req, res) => {
  try {
    const { serverName } = req.params;
    const { userId, flowId } = req.query;
    const user = req.user;

    // Verify the userId matches the authenticated user
    if (userId !== user.id) {
      return res.status(403).json({ error: 'User mismatch' });
    }

    logger.debug('[MCP OAuth] Initiate request', { serverName, userId, flowId });

    const flowsCache = getLogStores(CacheKeys.FLOWS);
    const flowManager = getFlowStateManager(flowsCache);

    /** Flow state to retrieve OAuth config */
    const flowState = await flowManager.getFlowState(flowId, 'mcp_oauth');
    if (!flowState) {
      logger.error('[MCP OAuth] Flow state not found', { flowId });
      return res.status(404).json({ error: 'Flow not found' });
    }

    const { serverUrl, oauth: oauthConfig } = flowState.metadata || {};
    if (!serverUrl || !oauthConfig) {
      logger.error('[MCP OAuth] Missing server URL or OAuth config in flow state');
      return res.status(400).json({ error: 'Invalid flow state' });
    }

    const { authorizationUrl, flowId: oauthFlowId } = await MCPOAuthHandler.initiateOAuthFlow(
      serverName,
      serverUrl,
      userId,
      oauthConfig,
    );

    logger.debug('[MCP OAuth] OAuth flow initiated', { oauthFlowId, authorizationUrl });

    // Redirect user to the authorization URL
    res.redirect(authorizationUrl);
  } catch (error) {
    logger.error('[MCP OAuth] Failed to initiate OAuth', error);
    res.status(500).json({ error: 'Failed to initiate OAuth' });
  }
});

/**
 * OAuth callback handler
 * This handles the OAuth callback after the user has authorized the application
 */
router.get('/:serverName/oauth/callback', async (req, res) => {
  try {
    const { serverName } = req.params;
    const { code, state, error: oauthError } = req.query;

    logger.debug('[MCP OAuth] Callback received', {
      serverName,
      code: code ? 'present' : 'missing',
      state,
      error: oauthError,
    });

    if (oauthError) {
      logger.error('[MCP OAuth] OAuth error received', { error: oauthError });
      return res.redirect(`/oauth/error?error=${encodeURIComponent(String(oauthError))}`);
    }

    if (!code || typeof code !== 'string') {
      logger.error('[MCP OAuth] Missing or invalid code');
      return res.redirect('/oauth/error?error=missing_code');
    }

    if (!state || typeof state !== 'string') {
      logger.error('[MCP OAuth] Missing or invalid state');
      return res.redirect('/oauth/error?error=missing_state');
    }

    // Extract flow ID from state
    const flowId = state;
    logger.debug('[MCP OAuth] Using flow ID from state', { flowId });

    const flowsCache = getLogStores(CacheKeys.FLOWS);
    const flowManager = getFlowStateManager(flowsCache);

    logger.debug('[MCP OAuth] Getting flow state for flowId: ' + flowId);
    const flowState = await MCPOAuthHandler.getFlowState(flowId, flowManager);

    if (!flowState) {
      logger.error('[MCP OAuth] Flow state not found for flowId:', flowId);
      return res.redirect('/oauth/error?error=invalid_state');
    }

    logger.debug('[MCP OAuth] Flow state details', {
      serverName: flowState.serverName,
      userId: flowState.userId,
      hasMetadata: !!flowState.metadata,
      hasClientInfo: !!flowState.clientInfo,
      hasCodeVerifier: !!flowState.codeVerifier,
    });

    // Complete the OAuth flow
    logger.debug('[MCP OAuth] Completing OAuth flow');
    const tokens = await MCPOAuthHandler.completeOAuthFlow(flowId, code, flowManager);
    logger.info('[MCP OAuth] OAuth flow completed, tokens received in callback route');

    // For system-level OAuth, we need to store the tokens and retry the connection
    if (flowState.userId === 'system') {
      logger.debug(`[MCP OAuth] System-level OAuth completed for ${serverName}`);
    }

    /** ID of the flow that the tool/connection is waiting for */
    const toolFlowId = flowState.metadata?.toolFlowId;
    if (toolFlowId) {
      logger.debug('[MCP OAuth] Completing tool flow', { toolFlowId });
      await flowManager.completeFlow(toolFlowId, 'mcp_oauth', tokens);
    }

    /** Redirect to success page with flowId and serverName */
    const redirectUrl = `/oauth/success?serverName=${encodeURIComponent(serverName)}`;
    res.redirect(redirectUrl);
  } catch (error) {
    logger.error('[MCP OAuth] OAuth callback error', error);
    res.redirect('/oauth/error?error=callback_failed');
  }
});

/**
 * Get OAuth tokens for a completed flow
 * This is primarily for user-level OAuth flows
 */
router.get('/oauth/tokens/:flowId', requireJwtAuth, async (req, res) => {
  try {
    const { flowId } = req.params;
    const user = req.user;

    if (!user?.id) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Allow system flows or user-owned flows
    if (!flowId.startsWith(`${user.id}:`) && !flowId.startsWith('system:')) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const flowsCache = getLogStores(CacheKeys.FLOWS);
    const flowManager = getFlowStateManager(flowsCache);

    const flowState = await flowManager.getFlowState(flowId, 'mcp_oauth');
    if (!flowState) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    if (flowState.status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Flow not completed' });
    }

    res.json({ tokens: flowState.result });
  } catch (error) {
    logger.error('[MCP OAuth] Failed to get tokens', error);
    res.status(500).json({ error: 'Failed to get tokens' });
  }
});

/**
 * Check OAuth flow status
 * This endpoint can be used to poll the status of an OAuth flow
 */
router.get('/oauth/status/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const flowsCache = getLogStores(CacheKeys.FLOWS);
    const flowManager = getFlowStateManager(flowsCache);

    const flowState = await flowManager.getFlowState(flowId, 'mcp_oauth');
    if (!flowState) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    res.json({
      status: flowState.status,
      completed: flowState.status === 'COMPLETED',
      failed: flowState.status === 'FAILED',
      error: flowState.error,
    });
  } catch (error) {
    logger.error('[MCP OAuth] Failed to get flow status', error);
    res.status(500).json({ error: 'Failed to get flow status' });
  }
});

module.exports = router;
