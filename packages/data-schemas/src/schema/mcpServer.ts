import { Schema } from 'mongoose';
import { TokenExchangeMethodEnum } from '~/types';
import type { IMCPServer } from '~/types';

const mcpServerToolSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  enabled: {
    type: Boolean,
    default: true,
  },
  schema: {
    type: Schema.Types.Mixed,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
}, { _id: false });

const mcpServerOAuthSchema = new Schema({
  authorization_url: {
    type: String,
  },
  token_url: {
    type: String,
  },
  client_id: {
    type: String,
  },
  client_secret: {
    type: String,
    // Note: This should be encrypted in production
  },
  scope: {
    type: String,
  },
  redirect_uri: {
    type: String,
  },
  token_exchange_method: {
    type: String,
    enum: Object.values(TokenExchangeMethodEnum),
  },
}, { _id: false });

const mcpServerConfigSchema = new Schema({
  // For stdio type
  command: {
    type: String,
  },
  args: {
    type: [String],
  },
  env: {
    type: Schema.Types.Mixed,
  },
  stderr: {
    type: Schema.Types.Mixed,
  },
  
  // For web-based types
  url: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true; // Optional field
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
      message: 'Invalid URL format'
    }
  },
  headers: {
    type: Schema.Types.Mixed,
  },
  
  // OAuth configuration
  oauth: {
    type: mcpServerOAuthSchema,
  },
  
  // Timeouts and options
  timeout: {
    type: Number,
    default: 30000,
  },
  initTimeout: {
    type: Number,
    default: 10000,
  },
  iconPath: {
    type: String,
  },
  chatMenu: {
    type: Boolean,
    default: true,
  },
  serverInstructions: {
    type: Schema.Types.Mixed,
  },
  customUserVars: {
    type: Schema.Types.Mixed,
  },
}, { _id: false });

const mcpServerSchema = new Schema<IMCPServer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    type: {
      type: String,
      required: true,
      enum: ['stdio', 'websocket', 'sse', 'streamable-http'],
    },
    enabled: {
      type: Boolean,
      default: true,
      index: true,
    },
    config: {
      type: mcpServerConfigSchema,
      required: true,
    },
    description: {
      type: String,
      maxlength: 500,
    },
    lastConnected: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'error', 'connecting', 'unknown'],
      default: 'unknown',
      index: true,
    },
    errorMessage: {
      type: String,
    },
    toolCount: {
      type: Number,
      default: 0,
    },
    tools: {
      type: [mcpServerToolSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

// Compound indexes
mcpServerSchema.index({ userId: 1, name: 1 }, { unique: true });
mcpServerSchema.index({ userId: 1, enabled: 1 });
mcpServerSchema.index({ userId: 1, type: 1 });
mcpServerSchema.index({ userId: 1, lastConnected: 1 });
mcpServerSchema.index({ 'tools.name': 1 });

// Validation middleware
mcpServerSchema.pre('validate', function() {
  // Validate required fields based on type
  if (this.type === 'stdio') {
    if (!this.config.command) {
      this.invalidate('config.command', 'Command is required for stdio type');
    }
    if (!this.config.args || !Array.isArray(this.config.args)) {
      this.invalidate('config.args', 'Args array is required for stdio type');
    }
  } else if (['websocket', 'sse', 'streamable-http'].includes(this.type)) {
    if (!this.config.url) {
      this.invalidate('config.url', 'URL is required for web-based types');
    } else {
      // Validate URL protocol based on type
      try {
        const url = new URL(this.config.url);
        if (this.type === 'websocket') {
          if (!['ws:', 'wss:'].includes(url.protocol)) {
            this.invalidate('config.url', 'WebSocket URL must start with ws:// or wss://');
          }
        } else if (['sse', 'streamable-http'].includes(this.type)) {
          if (['ws:', 'wss:'].includes(url.protocol)) {
            this.invalidate('config.url', 'SSE/HTTP URL must not start with ws:// or wss://');
          }
        }
      } catch (error) {
        this.invalidate('config.url', 'Invalid URL format');
      }
    }
  }
});

// Update toolCount when tools array changes
mcpServerSchema.pre('save', function() {
  this.toolCount = this.tools.length;
});

export default mcpServerSchema;