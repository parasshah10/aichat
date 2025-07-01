const { McpServerConfig } = require('~/db/models');
const { logger } = require('@librechat/data-schemas');

/**
 * Creates a new MCP Server Configuration for a user.
 * @param {string} userId - The ID of the user creating the configuration.
 * @param {object} configData - The data for the new MCP server configuration.
 * @returns {Promise<object|null>} The created configuration object or null if creation fails.
 */
async function createMcpServerConfig(userId, configData) {
  try {
    const newConfig = await McpServerConfig.create({
      user: userId,
      ...configData,
    });
    return newConfig.toObject();
  } catch (error) {
    logger.error('[McpServerConfig] Error creating MCP server config:', error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern['user'] === 1 && error.keyPattern['name'] === 1) {
      throw new Error('An MCP server with this name already exists for your account.');
    }
    throw error;
  }
}

/**
 * Retrieves a specific MCP Server Configuration by its ID and user ID.
 * @param {string} userId - The ID of the user who owns the configuration.
 * @param {string} configId - The ID of the configuration to retrieve.
 * @returns {Promise<object|null>} The configuration object or null if not found or not owned by the user.
 */
async function getMcpServerConfigById(userId, configId) {
  try {
    const config = await McpServerConfig.findOne({ _id: configId, user: userId }).lean();
    return config;
  } catch (error) {
    logger.error('[McpServerConfig] Error getting MCP server config by ID:', error);
    throw error;
  }
}

/**
 * Retrieves all MCP Server Configurations for a specific user.
 * @param {string} userId - The ID of the user whose configurations to retrieve.
 * @returns {Promise<Array<object>>} An array of configuration objects.
 */
async function getMcpServerConfigsByUser(userId) {
  try {
    const configs = await McpServerConfig.find({ user: userId }).sort({ name: 1 }).lean(); // Sort by name
    return configs;
  } catch (error) {
    logger.error('[McpServerConfig] Error getting MCP server configs by user:', error);
    throw error;
  }
}

/**
 * Updates an existing MCP Server Configuration.
 * @param {string} userId - The ID of the user who owns the configuration.
 * @param {string} configId - The ID of the configuration to update.
 * @param {object} updateData - An object containing the fields to update.
 * @returns {Promise<object|null>} The updated configuration object or null if not found or not owned by the user.
 */
async function updateMcpServerConfig(userId, configId, updateData) {
  try {
    // Ensure 'user' field cannot be changed and 'name' is not empty if provided
    const { user, name, ...restUpdateData } = updateData;
    const safeUpdateData = { ...restUpdateData };

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        throw new Error('Server name cannot be empty.');
      }
      safeUpdateData.name = name.trim();
    }

    const updatedConfig = await McpServerConfig.findOneAndUpdate(
      { _id: configId, user: userId },
      { $set: safeUpdateData },
      { new: true, runValidators: true },
    ).lean();

    if (!updatedConfig) {
      // Check if it's because the name became a duplicate for that user
      if (safeUpdateData.name) {
        const existingByName = await McpServerConfig.findOne({ name: safeUpdateData.name, user: userId, _id: { $ne: configId } }).lean();
        if (existingByName) {
          throw new Error('An MCP server with this name already exists for your account.');
        }
      }
    }
    return updatedConfig;
  } catch (error) {
    logger.error('[McpServerConfig] Error updating MCP server config:', error);
    if (error.code === 11000 && error.keyPattern && error.keyPattern['user'] === 1 && error.keyPattern['name'] === 1) {
      throw new Error('An MCP server with this name already exists for your account.');
    }
    throw error;
  }
}

/**
 * Deletes an MCP Server Configuration.
 * @param {string} userId - The ID of the user who owns the configuration.
 * @param {string} configId - The ID of the configuration to delete.
 * @returns {Promise<{deletedCount: number}>} An object indicating the number of deleted documents.
 */
async function deleteMcpServerConfig(userId, configId) {
  try {
    const result = await McpServerConfig.deleteOne({ _id: configId, user: userId });
    return result;
  } catch (error) {
    logger.error('[McpServerConfig] Error deleting MCP server config:', error);
    throw error;
  }
}

module.exports = {
  createMcpServerConfig,
  getMcpServerConfigById,
  getMcpServerConfigsByUser,
  updateMcpServerConfig,
  deleteMcpServerConfig,
};
