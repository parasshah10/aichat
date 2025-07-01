const { logger } = require('@librechat/data-schemas');
const { CacheKeys } = require('librechat-data-provider');
const { findToken, updateToken, createToken, deleteTokens } = require('~/models');
const { getMCPManager, getFlowStateManager } = require('~/config');
const { getCachedTools, setCachedTools } = require('./Config');
const { getLogStores } = require('~/cache');
const MCPServerService = require('./MCPServerService');

/**
 * Initialize MCP servers
 * @param {import('express').Application} app - Express app instance
 */
async function initializeMCP(app) {
  const yamlMcpServers = app.locals.mcpConfig;
  
  logger.info('Initializing MCP servers (YAML + Database)...');
  const mcpManager = getMCPManager();
  const flowsCache = getLogStores(CacheKeys.FLOWS);
  const flowManager = flowsCache ? getFlowStateManager(flowsCache) : null;

  try {
    // Get merged configuration (YAML + all user-defined servers)
    const mergedMcpServers = await MCPServerService.getMergedMCPConfig();
    
    // Log configuration summary
    const yamlCount = yamlMcpServers ? Object.keys(yamlMcpServers).length : 0;
    const totalCount = Object.keys(mergedMcpServers).length;
    const userCount = totalCount - yamlCount;
    
    logger.info(`MCP Configuration: ${totalCount} total servers (${yamlCount} YAML + ${userCount} user-defined)`);

    await mcpManager.initializeMCP({
      mcpServers: mergedMcpServers,
      flowManager,
      tokenMethods: {
        findToken,
        updateToken,
        createToken,
        deleteTokens,
      },
    });

    // Clean up the YAML config from app locals
    delete app.locals.mcpConfig;
    
    const availableTools = await getCachedTools();

    if (!availableTools) {
      logger.warn('No available tools found in cache during MCP initialization');
      return;
    }

    const toolsCopy = { ...availableTools };
    await mcpManager.mapAvailableTools(toolsCopy, flowManager);
    await setCachedTools(toolsCopy, { isGlobal: true });

    // Clear the tools cache so that getAvailableTools will rebuild it with MCP tools
    const cache = getLogStores(CacheKeys.CONFIG_STORE);
    if (cache) {
      await cache.delete(CacheKeys.TOOLS);
      logger.info('Cleared tools cache to include MCP tools');
    }

    logger.info('MCP servers initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize MCP servers:', error);
  }
}

module.exports = initializeMCP;
