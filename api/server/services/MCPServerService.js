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
      // TODO: Implement configuration merging
      // 1. Load YAML configuration
      // 2. Load user-defined servers (if userId provided)
      // 3. Merge configurations with proper precedence
      // 4. Return merged configuration
      
      const yamlConfig = await this.getYamlMCPConfig();
      const userServers = userId ? await this.getUserServers(userId, { enabled: true }) : [];
      
      const mergedConfig = this.mergeConfigurations(yamlConfig, userServers);
      
      logger.debug(`[MCPServerService] Merged MCP config: ${Object.keys(mergedConfig).length} servers`);
      
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
   * TODO: Implement real connection testing
   */
  async performConnectionTest(server) {
    // Placeholder implementation
    return new Promise((resolve) => {
      setTimeout(() => {
        const success = Math.random() > 0.3; // 70% success rate for testing
        resolve({
          success,
          error: success ? null : 'Connection timeout or invalid configuration',
          tools: success ? [
            {
              name: 'test-tool',
              description: 'A test tool',
              enabled: true,
              schema: { type: 'object', properties: {} },
              lastUpdated: new Date()
            }
          ] : []
        });
      }, 1000);
    });
  }

  /**
   * Discover tools from server
   * TODO: Implement real tool discovery
   */
  async discoverServerTools(server) {
    // Placeholder implementation
    return [
      {
        name: 'discovered-tool-1',
        description: 'First discovered tool',
        enabled: true,
        schema: { type: 'object', properties: {} },
        lastUpdated: new Date()
      },
      {
        name: 'discovered-tool-2',
        description: 'Second discovered tool',
        enabled: true,
        schema: { type: 'object', properties: {} },
        lastUpdated: new Date()
      }
    ];
  }

  /**
   * Get YAML MCP configuration
   * TODO: Implement YAML config loading
   */
  async getYamlMCPConfig() {
    // Placeholder - return empty config for now
    return {};
  }

  /**
   * Merge YAML and database configurations
   * TODO: Implement configuration merging logic
   */
  mergeConfigurations(yamlConfig, userServers) {
    // Placeholder implementation
    const merged = { ...yamlConfig };
    
    // Add user servers to merged config
    userServers.forEach(server => {
      merged[server.name] = {
        type: server.type,
        ...server.config,
        // Add metadata to identify as user-defined
        _userDefined: true,
        _userId: server.userId
      };
    });
    
    return merged;
  }

  /**
   * Trigger MCP system refresh
   * TODO: Implement MCP system integration
   */
  async refreshMCPSystem() {
    // Placeholder - this will trigger the MCP manager to reload configurations
    logger.debug('[MCPServerService] MCP system refresh triggered');
  }
}

module.exports = new MCPServerService();