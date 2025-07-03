const { logger } = require('@librechat/data-schemas');
const { CacheKeys } = require('librechat-data-provider');
const { getMCPManager, getFlowStateManager } = require('~/config');
const { getLogStores } = require('~/cache');
const { getCachedTools, setCachedTools, ToolCacheKeys } = require('~/server/services/Config');

/**
 * Refresh a specific MCP server
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const refreshMCPServer = async (req, res) => {
  try {
    const { serverName } = req.params;
    
    if (!serverName) {
      return res.status(400).json({ 
        message: 'Server name is required',
        error: 'MISSING_SERVER_NAME'
      });
    }

    logger.info(`[MCP] Refreshing server: ${serverName}`);
    const mcpManager = getMCPManager();
    
    // Check if server exists in connections
    const connection = mcpManager.getConnection(serverName);
    if (!connection) {
      return res.status(404).json({ 
        message: `MCP server '${serverName}' not found`,
        error: 'SERVER_NOT_FOUND'
      });
    }

    // **CRITICAL: Clear the CORRECT cache that the model uses**
    const configCache = getLogStores(CacheKeys.CONFIG_STORE);
    if (configCache) {
      await configCache.delete(ToolCacheKeys.GLOBAL);
      await configCache.delete(CacheKeys.TOOLS);
      await configCache.delete(CacheKeys.PLUGINS);
      logger.info(`[MCP] Cleared global tools cache (model cache) before refresh for server: ${serverName}`);
    }

    // Clear MCP tools cache for this server
    const mcpToolsCache = getLogStores(CacheKeys.MCP_TOOLS);
    if (mcpToolsCache) {
      await mcpToolsCache.delete(serverName);
      logger.info(`[MCP] Cleared MCP tools cache for server: ${serverName}`);
    }

    // Disconnect the existing server
    await mcpManager.disconnectServer(serverName);
    logger.info(`[MCP] Disconnected server: ${serverName}`);

    // Get the server configuration from the manager's stored configs
    const serverConfig = mcpManager.mcpConfigs?.[serverName];
    
    if (!serverConfig) {
      return res.status(404).json({ 
        message: `Configuration for server '${serverName}' not found`,
        error: 'CONFIG_NOT_FOUND'
      });
    }

    // Re-initialize the specific server
    const flowsCache = getLogStores(CacheKeys.FLOWS);
    const flowManager = flowsCache ? getFlowStateManager(flowsCache) : null;
    
    await mcpManager.initializeMCP({
      mcpServers: { [serverName]: serverConfig },
      flowManager,
    });

    // **CRITICAL: Get fresh tools from ToolService, not from cache**
    const { loadAndFormatTools } = require('~/server/services/ToolService');
    const paths = require('~/config/paths');
    const freshTools = loadAndFormatTools({
      adminFilter: [],
      adminIncluded: [],
      directory: paths.structuredTools,
    });
    if (freshTools) {
      // Start with completely fresh tools - no old cache data
      const cleanToolsCopy = { ...freshTools };
      await mcpManager.mapAvailableTools(cleanToolsCopy, flowManager);
      await setCachedTools(cleanToolsCopy, { isGlobal: true });
      logger.info(`[MCP] Completely rebuilt tools cache for server: ${serverName}`);
    }


    logger.info(`[MCP] Successfully refreshed server: ${serverName}`);
    res.status(200).json({ 
      message: `Server '${serverName}' refreshed successfully`,
      serverName,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`[MCP] Failed to refresh server ${req.params.serverName}:`, error);
    res.status(500).json({ 
      message: `Failed to refresh server: ${error.message}`,
      error: 'REFRESH_FAILED'
    });
  }
};

/**
 * Refresh all MCP servers
 * @param {import('express').Request} req 
 * @param {import('express').Response} res 
 */
const refreshAllMCPServers = async (req, res) => {
  try {
    logger.info('[MCP] Refreshing all MCP servers...');
    const mcpManager = getMCPManager();
    
    // Get all current connections
    const allConnections = mcpManager.getAllConnections();
    const serverNames = Array.from(allConnections.keys());
    
    if (serverNames.length === 0) {
      return res.status(200).json({ 
        message: 'No MCP servers found to refresh',
        refreshedServers: [],
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`[MCP] Found ${serverNames.length} servers to refresh: ${serverNames.join(', ')}`);

    // **CRITICAL: Clear the CORRECT cache that the model uses**
    const configCache = getLogStores(CacheKeys.CONFIG_STORE);
    if (configCache) {
      await configCache.delete(ToolCacheKeys.GLOBAL);
      await configCache.delete(CacheKeys.TOOLS);
      await configCache.delete(CacheKeys.PLUGINS);
      logger.info('[MCP] Cleared global tools cache (model cache) before refresh');
    }

    // Clear all MCP tools cache
    const mcpToolsCache = getLogStores(CacheKeys.MCP_TOOLS);
    if (mcpToolsCache) {
      for (const serverName of serverNames) {
        await mcpToolsCache.delete(serverName);
      }
      logger.info('[MCP] Cleared all MCP tools cache before refresh');
    }

    // Disconnect all servers
    await mcpManager.disconnectAll();
    logger.info('[MCP] Disconnected all servers');

    // Get the original MCP configuration from the manager's stored configs
    const mcpConfigs = mcpManager.mcpConfigs || {};
    
    if (Object.keys(mcpConfigs).length === 0) {
      return res.status(500).json({ 
        message: 'No MCP server configurations found',
        error: 'NO_CONFIGS_FOUND'
      });
    }

    // Re-initialize all servers
    const flowsCache = getLogStores(CacheKeys.FLOWS);
    const flowManager = flowsCache ? getFlowStateManager(flowsCache) : null;
    
    await mcpManager.initializeMCP({
      mcpServers: mcpConfigs,
      flowManager,
    });

    // **CRITICAL: Get completely fresh tools from ToolService, not from cache**
    const { loadAndFormatTools } = require('~/server/services/ToolService');
    const paths = require('~/config/paths');
    const freshTools = loadAndFormatTools({
      adminFilter: [],
      adminIncluded: [],
      directory: paths.structuredTools,
    });
    if (freshTools) {
      // Start with completely fresh tools - no old cache data
      const cleanToolsCopy = { ...freshTools };
      await mcpManager.mapAvailableTools(cleanToolsCopy, flowManager);
      await setCachedTools(cleanToolsCopy, { isGlobal: true });
      logger.info('[MCP] Completely rebuilt tools cache for all servers from scratch');
    }

    // Get the refreshed connections to verify success
    const refreshedConnections = mcpManager.getAllConnections();
    const refreshedServerNames = Array.from(refreshedConnections.keys());

    logger.info(`[MCP] Successfully refreshed ${refreshedServerNames.length}/${serverNames.length} servers`);
    
    res.status(200).json({ 
      message: `Successfully refreshed ${refreshedServerNames.length} MCP servers`,
      refreshedServers: refreshedServerNames,
      failedServers: serverNames.filter(name => !refreshedServerNames.includes(name)),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('[MCP] Failed to refresh all servers:', error);
    res.status(500).json({ 
      message: `Failed to refresh all servers: ${error.message}`,
      error: 'REFRESH_ALL_FAILED'
    });
  }
};

module.exports = {
  refreshMCPServer,
  refreshAllMCPServers,
};