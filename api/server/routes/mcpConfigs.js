const { Router } = require('express');
const { requireJwtAuth } = require('~/server/middleware');
const {
  createMcpServerConfig,
  getMcpServerConfigById,
  getMcpServerConfigsByUser,
  updateMcpServerConfig,
  deleteMcpServerConfig,
} = require('~/models/McpServerConfig');
const { logger } = require('@librechat/data-schemas');

const router = Router();
router.use(requireJwtAuth);

// Create a new MCP Server Configuration
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const configData = req.body;
    // Basic validation (more comprehensive validation can be added with a library like Joi or Zod)
    if (!configData.name || !configData.type) {
      return res.status(400).json({ error: 'Server name and type are required.' });
    }
    const newConfig = await createMcpServerConfig(userId, configData);
    res.status(201).json(newConfig);
  } catch (error) {
    logger.error('[API_MCP_Configs] Error creating MCP server config:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create MCP server configuration.' });
  }
});

// Get all MCP Server Configurations for the authenticated user
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const configs = await getMcpServerConfigsByUser(userId);
    res.status(200).json(configs);
  } catch (error) {
    logger.error('[API_MCP_Configs] Error fetching MCP server configs:', error);
    res.status(500).json({ error: 'Failed to fetch MCP server configurations.' });
  }
});

// Get a specific MCP Server Configuration by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const config = await getMcpServerConfigById(userId, id);
    if (!config) {
      return res.status(404).json({ error: 'MCP server configuration not found or not authorized.' });
    }
    res.status(200).json(config);
  } catch (error) {
    logger.error('[API_MCP_Configs] Error fetching MCP server config by ID:', error);
    res.status(500).json({ error: 'Failed to fetch MCP server configuration.' });
  }
});

// Update an MCP Server Configuration by ID
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updateData = req.body;

    if (updateData.name !== undefined && (typeof updateData.name !== 'string' || updateData.name.trim() === '')) {
      return res.status(400).json({ error: 'Server name cannot be empty.' });
    }

    const updatedConfig = await updateMcpServerConfig(userId, id, updateData);
    if (!updatedConfig) {
      return res.status(404).json({ error: 'MCP server configuration not found or not authorized for update.' });
    }
    res.status(200).json(updatedConfig);
  } catch (error) {
    logger.error('[API_MCP_Configs] Error updating MCP server config:', error);
    if (error.message.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    if (error.message.includes('Server name cannot be empty')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to update MCP server configuration.' });
  }
});

// Delete an MCP Server Configuration by ID
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const result = await deleteMcpServerConfig(userId, id);
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'MCP server configuration not found or not authorized for deletion.' });
    }
    res.status(204).send(); // No content
  } catch (error) {
    logger.error('[API_MCP_Configs] Error deleting MCP server config:', error);
    res.status(500).json({ error: 'Failed to delete MCP server configuration.' });
  }
});

// Route to check status of multiple MCP servers
router.post('/status', async (req, res) => {
  const { servers } = req.body;

  if (!Array.isArray(servers) || servers.length === 0) {
    return res.status(400).json({ error: 'Request body must be an array of server configurations.' });
  }

  const statuses = await Promise.allSettled(servers.map(async (serverConfig) => {
    if (!serverConfig || !serverConfig.name || !serverConfig.type) {
      return { name: serverConfig?.name || 'Unknown', status: 'Error', details: 'Invalid server config provided for status check.' };
    }

    const { name, type, url } = serverConfig;

    try {
      if (type === 'stdio') {
        // For STDIO, true status is hard without interacting with MCPManager's active processes.
        // We can enhance this later if MCPManager exposes process status.
        return { name, status: 'Configured', details: 'STDIO server status cannot be actively probed by this endpoint.' };
      } else if (type === 'sse' || type === 'streamable-http' || type === 'websocket') {
        if (!url) {
          return { name, status: 'Error', details: `URL is required for ${type} server type.` };
        }
        // Basic check: try to fetch the URL for HTTP based, or establish a quick WebSocket connection.
        // This is a simplified check. Real-world checks might need more nuance (e.g. specific health endpoints).
        // For WebSockets, a proper library would be needed for handshake. For HTTP, a HEAD/GET.
        // Using a simple fetch with timeout for HTTP-based ones.
        if (type === 'sse' || type === 'streamable-http') {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

          try {
            const response = await fetch(url, { signal: controller.signal, method: 'HEAD' }); // HEAD request
            clearTimeout(timeoutId);
            // Allow common success/redirect codes. Some servers might not support HEAD well.
            if (response.ok || (response.status >= 300 && response.status < 400) || response.status === 405) { // 405 Method Not Allowed if HEAD isn't supported but server is up
              return { name, status: 'Online' };
            } else {
              return { name, status: 'Offline', details: `HTTP status ${response.status}` };
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            logger.debug(`[MCP Status Check] Error pinging ${name} (${url}): ${fetchError.message}`);
            return { name, status: 'Offline', details: fetchError.message };
          }
        } else if (type === 'websocket') {
          // WebSocket status check is more complex and typically requires a client library.
          // Placeholder for now.
          return { name, status: 'Unsupported', details: 'WebSocket active status check not yet implemented by this endpoint.' };
        }
      }
      return { name, status: 'Unsupported', details: `Status check for type '${type}' is not fully supported.` };
    } catch (e) {
      logger.error(`[MCP Status Check] Error checking status for ${name}:`, e);
      return { name, status: 'Error', details: e.message };
    }
  }));

  res.status(200).json({
    statuses: statuses.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        // Should ideally not happen if individual checks catch errors, but as a fallback:
        return { name: 'Unknown', status: 'Error', details: result.reason?.message || 'Failed to check status.' };
      }
    }),
  });
});

module.exports = router;
