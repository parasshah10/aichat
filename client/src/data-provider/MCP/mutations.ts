import { useMutation, useQueryClient } from '@tanstack/react-query';
import { dataService } from 'librechat-data-provider';
import type { 
  CreateMCPServerParams, 
  UpdateMCPServerParams,
  IMCPServer 
} from 'librechat-data-provider';

export const useCreateMCPServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Omit<CreateMCPServerParams, 'userId'>) => {
      const response = await dataService.post('/api/mcp/servers', data);
      return response.server as IMCPServer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpServerStats'] });
    },
  });
};

export const useUpdateMCPServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      serverId, 
      ...data 
    }: { serverId: string } & Omit<UpdateMCPServerParams, 'userId'>) => {
      const response = await dataService.put(`/api/mcp/servers/${serverId}`, data);
      return response.server as IMCPServer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpServer', variables.serverId] });
      queryClient.invalidateQueries({ queryKey: ['mcpServerStats'] });
    },
  });
};

export const useDeleteMCPServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      await dataService.delete(`/api/mcp/servers/${serverId}`);
      return serverId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpServerStats'] });
    },
  });
};

export const useToggleMCPServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ serverId, enabled }: { serverId: string; enabled: boolean }) => {
      const response = await dataService.post(`/api/mcp/servers/${serverId}/toggle`, { enabled });
      return response.server as IMCPServer;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpServer', variables.serverId] });
      queryClient.invalidateQueries({ queryKey: ['mcpServerStats'] });
    },
  });
};

export const useTestMCPServer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const response = await dataService.post(`/api/mcp/servers/${serverId}/test`);
      return response;
    },
    onSuccess: (_, serverId) => {
      queryClient.invalidateQueries({ queryKey: ['mcpServer', serverId] });
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpServerStats'] });
    },
  });
};

export const useToggleMCPTool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      serverId, 
      toolName, 
      enabled 
    }: { 
      serverId: string; 
      toolName: string; 
      enabled: boolean; 
    }) => {
      const response = await dataService.put(
        `/api/mcp/servers/${serverId}/tools/${toolName}/toggle`, 
        { enabled }
      );
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['mcpServer', variables.serverId] });
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpServerTools', variables.serverId] });
    },
  });
};

export const useRefreshMCPServerTools = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (serverId: string) => {
      const response = await dataService.post(`/api/mcp/servers/${serverId}/refresh-tools`);
      return response;
    },
    onSuccess: (_, serverId) => {
      queryClient.invalidateQueries({ queryKey: ['mcpServer', serverId] });
      queryClient.invalidateQueries({ queryKey: ['mcpServers'] });
      queryClient.invalidateQueries({ queryKey: ['mcpServerTools', serverId] });
    },
  });
};