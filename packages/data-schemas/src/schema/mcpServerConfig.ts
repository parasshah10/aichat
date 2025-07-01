import mongoose from 'mongoose';
import type { MCPOptions } from 'librechat-data-provider';

// Define the Mongoose schema for MCP Server Configuration
const mcpServerConfigSchema = new mongoose.Schema<MCPOptions & { user: mongoose.Schema.Types.ObjectId }>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      unique: true, // Assuming server names should be unique per user, will need compound index with user
      trim: true,
    },
    type: {
      type: String,
      enum: ['stdio', 'websocket', 'sse', 'streamable-http'],
      required: true,
    },
    // StdioOptions
    command: {
      type: String,
      required: function () {
        return this.type === 'stdio';
      },
    },
    args: {
      type: [String],
      required: function () {
        return this.type === 'stdio';
      },
    },
    env: {
      type: Map,
      of: String,
    },
    stderr: {
      type: mongoose.Schema.Types.Mixed, // Can be string or number
    },
    // WebSocketOptions, SSEOptions, StreamableHTTPOptions
    url: {
      type: String,
      required: function () {
        return ['websocket', 'sse', 'streamable-http'].includes(this.type);
      },
    },
    // SSEOptions, StreamableHTTPOptions
    headers: {
      type: Map,
      of: String,
    },
    // BaseOptions
    iconPath: String,
    timeout: Number,
    initTimeout: Number,
    chatMenu: Boolean,
    serverInstructions: mongoose.Schema.Types.Mixed, // Can be boolean or string
    oauth: {
      authorization_url: String,
      token_url: String,
      client_id: String,
      client_secret: String,
      scope: String,
      redirect_uri: String,
      token_exchange_method: String,
    },
    customUserVars: {
      type: Map,
      of: new mongoose.Schema(
        {
          title: String,
          description: String,
        },
        { _id: false },
      ),
    },
    // Fields for UI management
    enabled: {
      type: Boolean,
      default: true,
    },
    disabledTools: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

// Compound index for unique server name per user
mcpServerConfigSchema.index({ user: 1, name: 1 }, { unique: true });

export default mcpServerConfigSchema;
