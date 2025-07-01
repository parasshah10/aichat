const { body, param, query, validationResult } = require('express-validator');
const { logger } = require('@librechat/data-schemas');

/**
 * Validation middleware for MCP server creation
 */
const validateCreateMCPServer = [
  body('name')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('type')
    .isIn(['stdio', 'websocket', 'sse', 'streamable-http'])
    .withMessage('Type must be one of: stdio, websocket, sse, streamable-http'),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  
  body('config')
    .isObject()
    .withMessage('Config must be an object'),
  
  // stdio specific validation
  body('config.command')
    .if(body('type').equals('stdio'))
    .notEmpty()
    .withMessage('Command is required for stdio type'),
  
  body('config.args')
    .if(body('type').equals('stdio'))
    .isArray()
    .withMessage('Args must be an array for stdio type'),
  
  // web-based type validation
  body('config.url')
    .if(body('type').isIn(['websocket', 'sse', 'streamable-http']))
    .isURL()
    .withMessage('Valid URL is required for web-based types'),
  
  // OAuth validation (optional)
  body('config.oauth.authorization_url')
    .optional()
    .isURL()
    .withMessage('Authorization URL must be valid'),
  
  body('config.oauth.token_url')
    .optional()
    .isURL()
    .withMessage('Token URL must be valid'),
  
  body('config.oauth.client_id')
    .optional()
    .isString()
    .trim()
    .withMessage('Client ID must be a string'),
  
  body('config.oauth.client_secret')
    .optional()
    .isString()
    .trim()
    .withMessage('Client secret must be a string'),
  
  body('config.oauth.token_exchange_method')
    .optional()
    .isIn(['DefaultPost', 'BasicAuthHeader'])
    .withMessage('Token exchange method must be DefaultPost or BasicAuthHeader'),
  
  // Timeout validation
  body('config.timeout')
    .optional()
    .isInt({ min: 1000, max: 300000 })
    .withMessage('Timeout must be between 1000 and 300000 milliseconds'),
  
  body('config.initTimeout')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('Init timeout must be between 1000 and 60000 milliseconds'),
  
  handleValidationErrors,
];

/**
 * Validation middleware for MCP server updates
 */
const validateUpdateMCPServer = [
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Name must be between 1 and 100 characters'),
  
  body('type')
    .optional()
    .isIn(['stdio', 'websocket', 'sse', 'streamable-http'])
    .withMessage('Type must be one of: stdio, websocket, sse, streamable-http'),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  
  body('enabled')
    .optional()
    .isBoolean()
    .withMessage('Enabled must be a boolean'),
  
  body('config')
    .optional()
    .isObject()
    .withMessage('Config must be an object'),
  
  handleValidationErrors,
];

/**
 * Validation middleware for server ID parameter
 */
const validateServerId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid server ID'),
  
  handleValidationErrors,
];

/**
 * Validation middleware for tool name parameter
 */
const validateToolName = [
  param('toolName')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tool name must be between 1 and 100 characters'),
  
  handleValidationErrors,
];

/**
 * Validation middleware for toggle operations
 */
const validateToggle = [
  body('enabled')
    .isBoolean()
    .withMessage('Enabled field must be a boolean'),
  
  handleValidationErrors,
];

/**
 * Validation middleware for query parameters
 */
const validateServerQuery = [
  query('enabled')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('Enabled must be true or false'),
  
  query('type')
    .optional()
    .isIn(['stdio', 'websocket', 'sse', 'streamable-http'])
    .withMessage('Type must be one of: stdio, websocket, sse, streamable-http'),
  
  query('status')
    .optional()
    .isIn(['online', 'offline', 'error', 'connecting', 'unknown'])
    .withMessage('Status must be one of: online, offline, error, connecting, unknown'),
  
  handleValidationErrors,
];

/**
 * Custom validation for URL protocols based on server type
 */
const validateUrlProtocol = (req, res, next) => {
  const { type, config } = req.body;
  
  if (!type || !config?.url) {
    return next();
  }
  
  try {
    const url = new URL(config.url);
    
    if (type === 'websocket') {
      if (!['ws:', 'wss:'].includes(url.protocol)) {
        return res.status(400).json({
          error: 'WebSocket servers must use ws:// or wss:// protocol'
        });
      }
    } else if (['sse', 'streamable-http'].includes(type)) {
      if (['ws:', 'wss:'].includes(url.protocol)) {
        return res.status(400).json({
          error: 'SSE/HTTP servers cannot use WebSocket protocols'
        });
      }
    }
    
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid URL format'
    });
  }
};

/**
 * Handle validation errors
 */
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    logger.warn('[MCP Validation] Validation errors:', errorMessages);
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errorMessages
    });
  }
  
  next();
}

module.exports = {
  validateCreateMCPServer,
  validateUpdateMCPServer,
  validateServerId,
  validateToolName,
  validateToggle,
  validateServerQuery,
  validateUrlProtocol,
};