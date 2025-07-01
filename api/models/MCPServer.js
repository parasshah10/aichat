const { logger } = require('@librechat/data-schemas');
const { MCPServer } = require('~/db/models');

/**
 * Create a new MCP server for a user
 * @param {Object} serverData - The MCP server data
 * @param {string} serverData.userId - User ID who owns the server
 * @param {string} serverData.name - Server name (unique per user)
 * @param {string} serverData.type - Server type (stdio, websocket, sse, streamable-http)
 * @param {Object} serverData.config - Server configuration
 * @param {string} [serverData.description] - Optional description
 * @param {boolean} [serverData.enabled=true] - Whether server is enabled
 * @returns {Promise<Object>} The created MCP server
 */
async function createMCPServer(serverData) {
  try {
    const mcpServer = new MCPServer({
      ...serverData,
      enabled: serverData.enabled !== undefined ? serverData.enabled : true,
      status: 'unknown',
      toolCount: 0,
      tools: [],
    });

    const savedServer = await mcpServer.save();
    logger.info(`Created MCP server: ${savedServer.name} for user: ${savedServer.userId}`);
    return savedServer.toObject();
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      throw new Error(`MCP server with name "${serverData.name}" already exists for this user`);
    }
    logger.error('Error creating MCP server:', error);
    throw error;
  }
}

/**
 * Get MCP servers for a user
 * @param {Object} query - Query parameters
 * @param {string} query.userId - User ID
 * @param {boolean} [query.enabled] - Filter by enabled status
 * @param {string} [query.type] - Filter by server type
 * @param {string} [query.status] - Filter by server status
 * @returns {Promise<Array>} Array of MCP servers
 */
async function getMCPServers(query) {
  try {
    const filter = { userId: query.userId };
    
    if (query.enabled !== undefined) {
      filter.enabled = query.enabled;
    }
    if (query.type) {
      filter.type = query.type;
    }
    if (query.status) {
      filter.status = query.status;
    }

    const servers = await MCPServer.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return servers;
  } catch (error) {
    logger.error('Error getting MCP servers:', error);
    throw error;
  }
}

/**
 * Get a specific MCP server by ID
 * @param {string} serverId - Server ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<Object|null>} The MCP server or null if not found
 */
async function getMCPServer(serverId, userId) {
  try {
    const server = await MCPServer.findOne({
      _id: serverId,
      userId: userId,
    }).lean();

    return server;
  } catch (error) {
    logger.error('Error getting MCP server:', error);
    throw error;
  }
}

/**
 * Update an MCP server
 * @param {string} serverId - Server ID
 * @param {string} userId - User ID (for ownership verification)
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object|null>} The updated MCP server or null if not found
 */
async function updateMCPServer(serverId, userId, updateData) {
  try {
    const updatedServer = await MCPServer.findOneAndUpdate(
      { _id: serverId, userId: userId },
      { 
        ...updateData,
        updatedAt: new Date(),
      },
      { 
        new: true,
        runValidators: true,
      }
    ).lean();

    if (updatedServer) {
      logger.info(`Updated MCP server: ${updatedServer.name} for user: ${userId}`);
    }

    return updatedServer;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`MCP server with name "${updateData.name}" already exists for this user`);
    }
    logger.error('Error updating MCP server:', error);
    throw error;
  }
}

/**
 * Delete an MCP server
 * @param {string} serverId - Server ID
 * @param {string} userId - User ID (for ownership verification)
 * @returns {Promise<boolean>} True if deleted, false if not found
 */
async function deleteMCPServer(serverId, userId) {
  try {
    const result = await MCPServer.deleteOne({
      _id: serverId,
      userId: userId,
    });

    const deleted = result.deletedCount > 0;
    if (deleted) {
      logger.info(`Deleted MCP server: ${serverId} for user: ${userId}`);
    }

    return deleted;
  } catch (error) {
    logger.error('Error deleting MCP server:', error);
    throw error;
  }
}

/**
 * Update server status and connection info
 * @param {string} serverId - Server ID
 * @param {string} userId - User ID
 * @param {Object} statusData - Status update data
 * @param {string} statusData.status - New status
 * @param {string} [statusData.errorMessage] - Error message if status is 'error'
 * @param {Date} [statusData.lastConnected] - Last connection timestamp
 * @returns {Promise<Object|null>} Updated server or null if not found
 */
async function updateMCPServerStatus(serverId, userId, statusData) {
  try {
    const updateFields = {
      status: statusData.status,
      updatedAt: new Date(),
    };

    if (statusData.errorMessage !== undefined) {
      updateFields.errorMessage = statusData.errorMessage;
    }

    if (statusData.lastConnected) {
      updateFields.lastConnected = statusData.lastConnected;
    }

    // Clear error message if status is not 'error'
    if (statusData.status !== 'error') {
      updateFields.errorMessage = null;
    }

    const updatedServer = await MCPServer.findOneAndUpdate(
      { _id: serverId, userId: userId },
      updateFields,
      { new: true }
    ).lean();

    return updatedServer;
  } catch (error) {
    logger.error('Error updating MCP server status:', error);
    throw error;
  }
}

/**
 * Update server tools
 * @param {string} serverId - Server ID
 * @param {string} userId - User ID
 * @param {Array} tools - Array of tool objects
 * @returns {Promise<Object|null>} Updated server or null if not found
 */
async function updateMCPServerTools(serverId, userId, tools) {
  try {
    const updatedServer = await MCPServer.findOneAndUpdate(
      { _id: serverId, userId: userId },
      {
        tools: tools,
        toolCount: tools.length,
        updatedAt: new Date(),
      },
      { new: true }
    ).lean();

    if (updatedServer) {
      logger.info(`Updated tools for MCP server: ${updatedServer.name}, tool count: ${tools.length}`);
    }

    return updatedServer;
  } catch (error) {
    logger.error('Error updating MCP server tools:', error);
    throw error;
  }
}

/**
 * Toggle server enabled status
 * @param {string} serverId - Server ID
 * @param {string} userId - User ID
 * @param {boolean} enabled - New enabled status
 * @returns {Promise<Object|null>} Updated server or null if not found
 */
async function toggleMCPServer(serverId, userId, enabled) {
  try {
    const updatedServer = await MCPServer.findOneAndUpdate(
      { _id: serverId, userId: userId },
      {
        enabled: enabled,
        updatedAt: new Date(),
        // Reset status when disabling
        ...(enabled === false && { status: 'offline' }),
      },
      { new: true }
    ).lean();

    if (updatedServer) {
      logger.info(`Toggled MCP server: ${updatedServer.name} to ${enabled ? 'enabled' : 'disabled'}`);
    }

    return updatedServer;
  } catch (error) {
    logger.error('Error toggling MCP server:', error);
    throw error;
  }
}

/**
 * Get servers by status (for monitoring/health checks)
 * @param {string} status - Status to filter by
 * @returns {Promise<Array>} Array of servers with the specified status
 */
async function getMCPServersByStatus(status) {
  try {
    const servers = await MCPServer.find({
      status: status,
      enabled: true,
    })
    .select('_id userId name type status lastConnected')
    .lean();

    return servers;
  } catch (error) {
    logger.error('Error getting MCP servers by status:', error);
    throw error;
  }
}

/**
 * Get server statistics for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} Statistics object
 */
async function getMCPServerStats(userId) {
  try {
    const stats = await MCPServer.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          enabled: { $sum: { $cond: ['$enabled', 1, 0] } },
          online: { $sum: { $cond: [{ $eq: ['$status', 'online'] }, 1, 0] } },
          offline: { $sum: { $cond: [{ $eq: ['$status', 'offline'] }, 1, 0] } },
          error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          totalTools: { $sum: '$toolCount' },
        },
      },
    ]);

    return stats[0] || {
      total: 0,
      enabled: 0,
      online: 0,
      offline: 0,
      error: 0,
      totalTools: 0,
    };
  } catch (error) {
    logger.error('Error getting MCP server stats:', error);
    throw error;
  }
}

module.exports = {
  createMCPServer,
  getMCPServers,
  getMCPServer,
  updateMCPServer,
  deleteMCPServer,
  updateMCPServerStatus,
  updateMCPServerTools,
  toggleMCPServer,
  getMCPServersByStatus,
  getMCPServerStats,
};