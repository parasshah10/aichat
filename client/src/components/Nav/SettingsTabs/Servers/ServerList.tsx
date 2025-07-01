import React from 'react';
import { Loader2 } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { ServerCard } from './ServerCard';
import type { IMCPServer } from 'librechat-data-provider';

interface ServerListProps {
  servers: IMCPServer[];
  isLoading: boolean;
  onEditServer: (server: IMCPServer) => void;
  onRefresh: () => void;
  refreshKey: number;
}

export function ServerList({ 
  servers, 
  isLoading, 
  onEditServer, 
  onRefresh,
  refreshKey 
}: ServerListProps) {
  const localize = useLocalize();

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="flex items-center gap-2 text-text-secondary">
          <Loader2 size={20} className="animate-spin" />
          <span>{localize('com_ui_loading')}</span>
        </div>
      </div>
    );
  }

  if (servers.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-center">
        <div className="mb-2 text-text-secondary">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="mx-auto mb-3"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <h4 className="mb-1 font-medium text-text-primary">
          {localize('com_ui_no_servers')}
        </h4>
        <p className="text-sm text-text-secondary">
          {localize('com_ui_no_servers_description')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-auto">
      {servers.map((server) => (
        <ServerCard
          key={`${server._id}-${refreshKey}`}
          server={server}
          onEdit={() => onEditServer(server)}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
}