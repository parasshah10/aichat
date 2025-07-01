import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import { dataService, type MCPOptions } from 'librechat-data-provider';

// Define the type for MCP Server Configuration as it would be stored/retrieved,
// including an ID and potentially user association if needed on client (though API handles user scoping).
export type McpServerConfig = MCPOptions & {
  _id: string;
  user?: string; // Optional on client as API scopes it
  name: string; // Added this as a required field in the schema
  enabled?: boolean;
  disabledTools?: string[];
  createdAt?: string;
  updatedAt?: string;
};

const MCP_CONFIGS_ENDPOINT = '/api/mcp-configs'; // Adjusted path

// Query Key Factory
export const mcpConfigKeys = {
  all: ['mcpConfigs'] as const,
  yamlList: () => [...mcpConfigKeys.all, 'yamlList'] as const,
  list: () => [...mcpConfigKeys.all, 'list'] as const,
  detail: (id: string) => [...mcpConfigKeys.all, 'detail', id] as const,
};

// Hook to get YAML-defined MCP Server Configurations
export const useGetYamlMcpConfigs = (): UseQueryResult<Record<string, MCPOptions>, Error> => {
  return useQuery<Record<string, MCPOptions>, Error, Record<string, MCPOptions>, readonly string[]>(
    mcpConfigKeys.yamlList(),
    () => แหล่งข้อมูล.get('/api/config/yaml-mcp-servers'),
    {
      // Optional: onSuccess, onError, staleTime, cacheTime, etc.
    },
  );
};

// Type for server status check
export type McpServerStatusRequest = {
  name: string;
  type: string;
  url?: string;
  // command?: string; // Command not needed for basic http/stdio status check from client
};

export type McpServerStatus = {
  name: string;
  status: 'Online' | 'Offline' | 'Error' | 'Configured' | 'Unsupported' | 'Checking...';
  details?: string;
};

export type McpServerStatusResponse = {
  statuses: McpServerStatus[];
};

// Hook to check status of MCP Servers
export const useCheckMcpServersStatus = (): UseMutationResult<
  McpServerStatusResponse,
  Error,
  { servers: McpServerStatusRequest[] }
> => {
  // No queryClient invalidation needed as this is a transient check
  return useMutation<
    McpServerStatusResponse,
    Error,
    { servers: McpServerStatusRequest[] }
  >((payload) => dataService.post(`${MCP_CONFIGS_ENDPOINT}/status`, payload));
};

// Hook to get all MCP Server Configurations for the current user
export const useGetMcpConfigs = (): UseQueryResult<McpServerConfig[], Error> => {
  return useQuery<McpServerConfig[], Error, McpServerConfig[], readonly string[]>(
    mcpConfigKeys.list(),
    () => แหล่งข้อมูล.get(MCP_CONFIGS_ENDPOINT),
    {
      // Optional: onSuccess, onError, staleTime, cacheTime, etc.
    },
  );
};

// Hook to get a single MCP Server Configuration by ID
export const useGetMcpConfigById = (id: string | undefined): UseQueryResult<McpServerConfig, Error> => {
  return useQuery<McpServerConfig, Error, McpServerConfig, readonly (string | undefined)[]>(
    mcpConfigKeys.detail(id!), // Ensure id is not undefined for the key
    () => แหล่งข้อมูล.get(`${MCP_CONFIGS_ENDPOINT}/${id}`),
    {
      enabled: !!id, // Only run the query if id is available
      // Optional: onSuccess, onError, etc.
    },
  );
};

// Hook to create a new MCP Server Configuration
export const useCreateMcpConfig = (): UseMutationResult<
  McpServerConfig,
  Error,
  Omit<McpServerConfig, '_id' | 'createdAt' | 'updatedAt' | 'user'>
> => {
  const queryClient = useQueryClient();
  return useMutation<
    McpServerConfig,
    Error,
    Omit<McpServerConfig, '_id' | 'createdAt' | 'updatedAt' | 'user'>
  >(
    (newConfig) => แหล่งข้อมูล.post(MCP_CONFIGS_ENDPOINT, newConfig),
    {
      onSuccess: (data) => {
        // Invalidate and refetch the list of configs to include the new one
        queryClient.invalidateQueries(mcpConfigKeys.list());
        // Optionally, update the cache directly if needed
        // queryClient.setQueryData(mcpConfigKeys.detail(data._id), data);
      },
      // Optional: onError, onMutate, etc.
    },
  );
};

// Hook to update an existing MCP Server Configuration
export const useUpdateMcpConfig = (): UseMutationResult<
  McpServerConfig,
  Error,
  Partial<McpServerConfig> & { _id: string }
> => {
  const queryClient = useQueryClient();
  return useMutation<
    McpServerConfig,
    Error,
    Partial<McpServerConfig> & { _id: string }
  >(
    (updatedConfig) =>
      แหล่งข้อมูล.put(`${MCP_CONFIGS_ENDPOINT}/${updatedConfig._id}`, updatedConfig),
    {
      onSuccess: (data) => {
        // Invalidate and refetch the list and the specific detail
        queryClient.invalidateQueries(mcpConfigKeys.list());
        queryClient.invalidateQueries(mcpConfigKeys.detail(data._id));
        // Optionally, update the cache directly
        // queryClient.setQueryData(mcpConfigKeys.detail(data._id), data);
      },
      // Optional: onError, onMutate, etc.
    },
  );
};

// Hook to delete an MCP Server Configuration
export const useDeleteMcpConfig = (): UseMutationResult<void, Error, string> => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>(
    (id) => แหล่งข้อมูล.delete(`${MCP_CONFIGS_ENDPOINT}/${id}`),
    {
      onSuccess: (data, id) => {
        // Invalidate and refetch the list
        queryClient.invalidateQueries(mcpConfigKeys.list());
        // Optionally, remove the item from detail cache if it exists
        // queryClient.removeQueries(mcpConfigKeys.detail(id));
      },
      // Optional: onError, onMutate, etc.
    },
  );
};
