import { useQuery } from '@tanstack/react-query';
import { dataService } from '../data-service';
import type { IMCPServer } from 'librechat-data-provider';

export const useGetMCPServers = (filters?: {
  enabled?: boolean;
  type?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['mcpServers', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.enabled !== undefined) {
        params.append('enabled', filters.enabled.toString());
      }
      if (filters?.type) {
        params.append('type', filters.type);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }

      const response = await dataService.get(`/api/mcp/servers?${params.toString()}`);
      return response.servers as IMCPServer[];
    },
  });
};

export const useGetMCPServer = (serverId: string) => {
  return useQuery({
    queryKey: ['mcpServer', serverId],
    queryFn: async () => {
      const response = await dataService.get(`/api/mcp/servers/${serverId}`);
      return response.server as IMCPServer;
    },
    enabled: !!serverId,
  });
};

export const useGetMCPServerStats = () => {
  return useQuery({
    queryKey: ['mcpServerStats'],
    queryFn: async () => {
      const response = await dataService.get('/api/mcp/stats');
      return response.stats as {
        total: number;
        enabled: number;
        online: number;
        offline: number;
        error: number;
        totalTools: number;
      };
    },
  });
};

export const useGetMCPServerTools = (serverId: string) => {
  return useQuery({
    queryKey: ['mcpServerTools', serverId],
    queryFn: async () => {
      const response = await dataService.get(`/api/mcp/servers/${serverId}/tools`);
      return response;
    },
    enabled: !!serverId,
  });
};