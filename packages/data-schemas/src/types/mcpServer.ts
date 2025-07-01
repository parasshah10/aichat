import { Document, Types } from 'mongoose';
import { TokenExchangeMethodEnum } from './agents';

export interface IMCPServerTool {
  name: string;
  description?: string;
  enabled: boolean;
  schema?: Record<string, unknown>;
  lastUpdated?: Date;
}

export interface IMCPServerOAuth {
  authorization_url?: string;
  token_url?: string;
  client_id?: string;
  client_secret?: string;
  scope?: string;
  redirect_uri?: string;
  token_exchange_method?: TokenExchangeMethodEnum;
}

export interface IMCPServerConfig {
  // For stdio type
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  stderr?: any; // Matches Node.js child_process.spawn IOType
  
  // For web-based types (websocket, sse, streamable-http)
  url?: string;
  headers?: Record<string, string>;
  
  // OAuth configuration
  oauth?: IMCPServerOAuth;
  
  // Timeouts and options
  timeout?: number;
  initTimeout?: number;
  iconPath?: string;
  chatMenu?: boolean;
  serverInstructions?: string | boolean;
  customUserVars?: Record<string, {
    title: string;
    description: string;
  }>;
}

export interface IMCPServer extends Document {
  userId: Types.ObjectId;
  name: string;
  type: 'stdio' | 'websocket' | 'sse' | 'streamable-http';
  enabled: boolean;
  config: IMCPServerConfig;
  description?: string;
  lastConnected?: Date;
  status: 'online' | 'offline' | 'error' | 'connecting' | 'unknown';
  errorMessage?: string;
  toolCount: number;
  tools: IMCPServerTool[];
  createdAt: Date;
  updatedAt: Date;
}

export type MCPServerType = 'stdio' | 'websocket' | 'sse' | 'streamable-http';
export type MCPServerStatus = 'online' | 'offline' | 'error' | 'connecting' | 'unknown';

export interface CreateMCPServerParams {
  userId: string;
  name: string;
  type: MCPServerType;
  config: IMCPServerConfig;
  description?: string;
  enabled?: boolean;
}

export interface UpdateMCPServerParams {
  name?: string;
  type?: MCPServerType;
  config?: Partial<IMCPServerConfig>;
  description?: string;
  enabled?: boolean;
  status?: MCPServerStatus;
  errorMessage?: string;
  tools?: IMCPServerTool[];
  toolCount?: number;
  lastConnected?: Date;
}

export interface MCPServerQuery {
  userId: string;
  enabled?: boolean;
  type?: MCPServerType;
  status?: MCPServerStatus;
}