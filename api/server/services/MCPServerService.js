const { logger } = require('@librechat/data-schemas');
const {
  createMCPServer,
  getMCPServers,
  getMCPServer,
  updateMCPServer,
  deleteMCPServer,
  updateMCPServerStatus,
  updateMCPServerTools,
  toggleMCPServer,
  getMCPServerStats,
} = require('~/models');

/**
 * MCP Server Management Service
 * 
 * This service handles the business logic for user-defined MCP servers,
 * including configuration merging, validation, and integration with the
 * existing MCP system.
 */
class MCPServerService {
  constructor() {
    this.yamlOverrideEnabled = false; // Admin can enable YAML-only mode
  }

  /**
   * Get all servers for a user with optional filtering
   */
  async getUserServers(userId, filters = {}) {
    try {
      const query = { userId, ...filters };
      const servers = await getMCPServers(query);
      
      logger.debug(`[MCPServerService] Retrieved ${servers.length} servers for user ${userId}`);
      return servers;
    } catch (error) {
      logger.error('[MCPServerService] Error getting user servers:', error);
      throw error;
    }
  }

  /**
   * Create a new MCP server for a user
   */
  async createUserServer(userId, serverData) {
    try {
      // Validate server configuration
      this.validateServerConfig(serverData);
      
      const server = await createMCPServer({
        ...serverData,
        userId,
      });
      
      logger.info(`[MCPServerService] Created server '${server.name}' for user ${userId}`);
      
      // TODO: Trigger MCP system refresh to include new server
      await this.refreshMCPSystem();
      
      return server;
    } catch (error) {
      logger.error('[MCPServerService] Error creating server:', error);
      throw error;
    }
  }

  /**
   * Update an existing MCP server
   */
  async updateUserServer(serverId, userId, updateData) {
    try {
      // Validate update data
      if (updateData.config) {
        this.validateServerConfig({ ...updateData, type: updateData.type });
      }
      
      const server = await updateMCPServer(serverId, userId, updateData);
      
      if (!server) {
        throw new Error('Server not found');
      }
      
      logger.info(`[MCPServerService] Updated server '${server.name}' for user ${userId}`);
      
      // TODO: Trigger MCP system refresh if server is enabled
      if (server.enabled) {
        await this.refreshMCPSystem();
      }
      
      return server;
    } catch (error) {
      logger.error('[MCPServerService] Error updating server:', error);
      throw error;
    }
  }

  /**
   * Delete an MCP server
   */
  async deleteUserServer(serverId, userId) {
    try {
      const deleted = await deleteMCPServer(serverId, userId);
      
      if (!deleted) {
        throw new Error('Server not found');
      }
      
      logger.info(`[MCPServerService] Deleted server ${serverId} for user ${userId}`);
      
      // TODO: Trigger MCP system refresh to remove server
      await this.refreshMCPSystem();
      
      return true;
    } catch (error) {
      logger.error('[MCPServerService] Error deleting server:', error);
      throw error;
    }
  }

  /**
   * Toggle server enabled status
   */
  async toggleUserServer(serverId, userId, enabled) {
    try {
      const server = await toggleMCPServer(serverId, userId, enabled);
      
      if (!server) {
        throw new Error('Server not found');
      }
      
      logger.info(`[MCPServerService] Toggled server '${server.name}' to ${enabled ? 'enabled' : 'disabled'}`);
      
      // TODO: Trigger MCP system refresh
      await this.refreshMCPSystem();
      
      return server;
    } catch (error) {
      logger.error('[MCPServerService] Error toggling server:', error);
      throw error;
    }
  }

  /**
   * Test server connection and discover tools
   */
  async testServerConnection(serverId, userId) {
    try {
      const server = await getMCPServer(serverId, userId);
      
      if (!server) {
        throw new Error('Server not found');
      }
      
      // Update status to connecting
      await updateMCPServerStatus(serverId, userId, {
        status: 'connecting',
        errorMessage: null
      });
      
      logger.info(`[MCPServerService] Testing connection for server '${server.name}'`);
      
      // TODO: Implement actual connection testing
      const testResult = await this.performConnectionTest(server);
      
      // Update server status and tools based on test result
      await updateMCPServerStatus(serverId, userId, {
        status: testResult.success ? 'online' : 'error',
        errorMessage: testResult.success ? null : testResult.error,
        lastConnected: testResult.success ? new Date() : undefined
      });
      
      if (testResult.success && testResult.tools) {
        await updateMCPServerTools(serverId, userId, testResult.tools);
      }
      
      logger.info(`[MCPServerService] Connection test for '${server.name}': ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      return testResult;
    } catch (error) {
      logger.error('[MCPServerService] Error testing server connection:', error);
      
      // Update server status to error
      try {
        await updateMCPServerStatus(serverId, userId, {
          status: 'error',
          errorMessage: error.message
        });
      } catch (updateError) {
        logger.error('[MCPServerService] Error updating server status:', updateError);
      }
      
      throw error;
    }
  }

  /**
   * Refresh tools for a server
   */
  async refreshServerTools(serverId, userId) {
    try {
      const server = await getMCPServer(serverId, userId);
      
      if (!server) {
        throw new Error('Server not found');
      }
      
      logger.info(`[MCPServerService] Refreshing tools for server '${server.name}'`);
      
      // TODO: Implement actual tool discovery
      const discoveredTools = await this.discoverServerTools(server);
      
      const updatedServer = await updateMCPServerTools(serverId, userId, discoveredTools);
      
      logger.info(`[MCPServerService] Refreshed tools for '${server.name}': ${discoveredTools.length} tools discovered`);
      
      return {
        tools: updatedServer.tools,
        toolCount: updatedServer.toolCount,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MCPServerService] Error refreshing tools:', error);
      throw error;
    }
  }

  /**
   * Get merged MCP configuration (YAML + Database)
   * This is used by the MCP system to get all available servers
   */
  async getMergedMCPConfig(userId = null) {
    try {
      logger.debug(`[MCPServerService] Getting merged MCP config for user: ${userId || 'global'}`);
      
      // 1. Load YAML configuration
      const yamlConfig = await this.getYamlMCPConfig();
      
      // 2. Load user-defined servers (if userId provided and not in override mode)
      let userServers = [];
      if (userId && !this.yamlOverrideEnabled) {
        userServers = await this.getUserServers(userId, { enabled: true });
      }
      
      // 3. Merge configurations with proper precedence
      const mergedConfig = this.mergeConfigurations(yamlConfig, userServers);
      
      logger.debug(`[MCPServerService] Merged MCP config: ${Object.keys(mergedConfig).length} servers (${Object.keys(yamlConfig).length} YAML + ${userServers.length} user)`);
      
      return mergedConfig;
    } catch (error) {
      logger.error('[MCPServerService] Error getting merged config:', error);
      throw error;
    }
  }

  /**
   * Enable/disable YAML override mode (admin only)
   */
  async setYamlOverride(enabled) {
    this.yamlOverrideEnabled = enabled;
    logger.info(`[MCPServerService] YAML override mode ${enabled ? 'enabled' : 'disabled'}`);
    
    // TODO: Trigger MCP system refresh
    await this.refreshMCPSystem();
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    try {
      // TODO: Implement system-wide statistics
      // This could include total servers, active connections, etc.
      
      return {
        totalServers: 0,
        activeConnections: 0,
        yamlOverrideEnabled: this.yamlOverrideEnabled,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('[MCPServerService] Error getting system stats:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Validate server configuration
   */
  validateServerConfig(serverData) {
    const { type, config } = serverData;
    
    if (!type || !config) {
      throw new Error('Server type and config are required');
    }
    
    // Type-specific validation
    if (type === 'stdio') {
      if (!config.command) {
        throw new Error('Command is required for stdio type');
      }
      if (!config.args || !Array.isArray(config.args)) {
        throw new Error('Args array is required for stdio type');
      }
    } else if (['websocket', 'sse', 'streamable-http'].includes(type)) {
      if (!config.url) {
        throw new Error('URL is required for web-based types');
      }
      
      // Validate URL format and protocol
      try {
        const url = new URL(config.url);
        if (type === 'websocket' && !['ws:', 'wss:'].includes(url.protocol)) {
          throw new Error('WebSocket servers must use ws:// or wss:// protocol');
        }
        if (['sse', 'streamable-http'].includes(type) && ['ws:', 'wss:'].includes(url.protocol)) {
          throw new Error('SSE/HTTP servers cannot use WebSocket protocols');
        }
      } catch (urlError) {
        throw new Error('Invalid URL format');
      }
    }
  }

  /**
   * Perform actual connection test
   */
  async performConnectionTest(server) {
    try {
      const { getMCPManager } = require('~/config');
      
      logger.info(`[MCPServerService] Testing connection for server '${server.name}' (${server.type})`);
      
      // Create a temporary MCP configuration for testing
      const testConfig = {
        [server.name]: {
          type: server.type,
          ...server.config,
          _userDefined: true,
          _userId: server.userId,
          _serverId: server._id
        }
      };
      
      // Get MCP manager instance
      const mcpManager = getMCPManager();
      
      // Test the connection by attempting to initialize the server
      const testResult = await mcpManager.testServerConnection(server.name, testConfig[server.name]);
      
      if (testResult.success) {
        logger.info(`[MCPServerService] Connection test successful for '${server.name}'`);
        return {
          success: true,
          error: null,
          tools: testResult.tools || []
        };
      } else {
        logger.warn(`[MCPServerService] Connection test failed for '${server.name}': ${testResult.error}`);
        return {
          success: false,
          error: testResult.error || 'Connection test failed',
          tools: []
        };
      }
    } catch (error) {
      logger.error(`[MCPServerService] Error during connection test for '${server.name}':`, error);
      return {
        success: false,
        error: error.message || 'Connection test failed',
        tools: []
      };
    }
  }

  /**
   * Discover tools from server
   */
  async discoverServerTools(server) {
    try {
      const { getMCPManager } = require('~/config');
      
      logger.info(`[MCPServerService] Discovering tools for server '${server.name}'`);
      
      // Get MCP manager instance
      const mcpManager = getMCPManager();
      
      // Create server configuration
      const serverConfig = {
        type: server.type,
        ...server.config,
        _userDefined: true,
        _userId: server.userId,
        _serverId: server._id
      };
      
      // Discover tools from the server
      const discoveredTools = await mcpManager.discoverServerTools(server.name, serverConfig);
      
      // Format tools for database storage
      const formattedTools = discoveredTools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        enabled: true, // Enable all discovered tools by default
        schema: tool.inputSchema || {},
        lastUpdated: new Date()
      }));
      
      logger.info(`[MCPServerService] Discovered ${formattedTools.length} tools for server '${server.name}'`);
      
      return formattedTools;
    } catch (error) {
      logger.error(`[MCPServerService] Error discovering tools for server '${server.name}':`, error);
      
      // Return empty array on error but don't throw
      return [];
    }
  }

  /**
   * Get YAML MCP configuration
   */
  async getYamlMCPConfig() {
    try {
      // Get the current YAML configuration from the app locals or config
      const loadCustomConfig = require('./Config/loadCustomConfig');
      const config = await loadCustomConfig();
      return config?.mcpServers || {};
    } catch (error) {
      logger.error('[MCPServerService] Error loading YAML MCP config:', error);
      return {};
    }
  }

  /**
   * Merge YAML and database configurations
   * Database servers take precedence over YAML servers with the same name
   */
  mergeConfigurations(yamlConfig, userServers) {
    const merged = { ...yamlConfig };
    
    // Add user servers to merged config
    userServers.forEach(server => {
      // Convert database server format to MCP manager format
      const serverConfig = {
        type: server.type,
        ...server.config,
        // Add metadata to identify as user-defined
        _userDefined: true,
        _userId: server.userId,
        _serverId: server._id
      };
      
      // If a YAML server with the same name exists, log the override
      if (merged[server.name]) {
        logger.info(`[MCPServerService] User server '${server.name}' overriding YAML configuration`);
      }
      
      merged[server.name] = serverConfig;
    });
    
    return merged;
  }

  /**
   * Trigger MCP system refresh
   * This reloads the MCP manager with updated configurations
   */
  async refreshMCPSystem() {
    try {
      const { getMCPManager } = require('~/config');
      const { getCachedTools, setCachedTools } = require('./Config');
      
      logger.info('[MCPServerService] Triggering MCP system refresh...');
      
      // Get MCP manager instance
      const mcpManager = getMCPManager();
      
      // Get merged configuration for all users
      // Note: This is a global refresh, so we don't pass a specific userId
      const mergedConfig = await this.getMergedMCPConfig();
      
      // Reinitialize MCP manager with new configuration
      await mcpManager.reinitialize(mergedConfig);
      
      // Refresh the global tools cache
      const availableTools = await getCachedTools();
      if (availableTools) {
        const toolsCopy = { ...availableTools };
        await mcpManager.mapAvailableTools(toolsCopy);
        await setCachedTools(toolsCopy, { isGlobal: true });
      }
      
      logger.info('[MCPServerService] MCP system refresh completed successfully');
    } catch (error) {
      logger.error('[MCPServerService] Error during MCP system refresh:', error);
      throw error;
    }
  }
}

module.exports = new MCPServerService();