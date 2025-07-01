const { logger } = require('@librechat/data-schemas');
const { CacheKeys } = require('librechat-data-provider');
const { findToken, updateToken, createToken, deleteTokens } = require('~/models');
const { getMCPManager, getFlowStateManager } = require('~/config');
const { getCachedTools, setCachedTools } = require('./Config');
const { getLogStores } = require('~/cache');

let yamlConfiguredMCPs = null;

/**
 * Returns the MCP server configurations loaded from the YAML file.
 * @returns {object | null} The YAML-configured MCP servers, or null if not initialized.
 */
function getYAMLConfiguredMCPs() {
  return yamlConfiguredMCPs;
}

/**
 * Initialize MCP servers
 * @param {import('express').Application} app - Express app instance
 */
async function initializeMCP(app) {
  const mcpServersFromApp = app.locals.mcpConfig;
  if (!mcpServersFromApp) {
    logger.info('No MCP servers found in app.locals.mcpConfig to initialize.');
    return;
  }

  // Store for later retrieval by other services (e.g., for merging with DB configs)
  yamlConfiguredMCPs = JSON.parse(JSON.stringify(mcpServersFromApp)); // Deep copy

  logger.info('Initializing MCP servers from YAML...');
  const mcpManager = getMCPManager();
  const flowsCache = getLogStores(CacheKeys.FLOWS);
  const flowManager = flowsCache ? getFlowStateManager(flowsCache) : null;

  try {
    // Use the original mcpServersFromApp for initialization as it's the direct data
    await mcpManager.initializeMCP({
      mcpServers: mcpServersFromApp,
      flowManager,
      tokenMethods: {
        findToken,
        updateToken,
        createToken,
        deleteTokens,
      },
    });

    // Delete from app.locals after it has been processed and copied
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

module.exports = {
  initializeMCP,
  getYAMLConfiguredMCPs,
};
