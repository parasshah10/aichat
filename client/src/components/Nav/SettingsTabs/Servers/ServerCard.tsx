import React, { useState } from 'react';
import { 
  Edit, 
  Trash2, 
  Power, 
  PowerOff, 
  TestTube, 
  ChevronDown, 
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { useLocalize } from '~/hooks';
import { Button } from '~/components/ui';
import { ToolList } from './ToolList';
import { 
  useDeleteMCPServer, 
  useToggleMCPServer, 
  useTestMCPServer 
} from '~/data-provider';
import type { IMCPServer } from 'librechat-data-provider';
import { cn } from '~/utils';

interface ServerCardProps {
  server: IMCPServer;
  onEdit: () => void;
  onRefresh: () => void;
}

export function ServerCard({ server, onEdit, onRefresh }: ServerCardProps) {
  const localize = useLocalize();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = useDeleteMCPServer();
  const toggleMutation = useToggleMCPServer();
  const testMutation = useTestMCPServer();

  const handleDelete = async () => {
    if (!confirm(localize('com_ui_confirm_delete_server'))) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(server._id);
      onRefresh();
    } catch (error) {
      console.error('Failed to delete server:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggle = async () => {
    try {
      await toggleMutation.mutateAsync({
        serverId: server._id,
        enabled: !server.enabled
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle server:', error);
    }
  };

  const handleTest = async () => {
    try {
      await testMutation.mutateAsync(server._id);
      onRefresh();
    } catch (error) {
      console.error('Failed to test server:', error);
    }
  };

  const getStatusIcon = () => {
    switch (server.status) {
      case 'online':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'offline':
        return <XCircle size={16} className="text-gray-500" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'connecting':
        return <Loader2 size={16} className="animate-spin text-blue-500" />;
      default:
        return <Clock size={16} className="text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (server.status) {
      case 'online':
        return localize('com_ui_status_online');
      case 'offline':
        return localize('com_ui_status_offline');
      case 'error':
        return localize('com_ui_status_error');
      case 'connecting':
        return localize('com_ui_status_connecting');
      default:
        return localize('com_ui_status_unknown');
    }
  };

  const getTypeColor = () => {
    switch (server.type) {
      case 'stdio':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'websocket':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sse':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'streamable-http':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="rounded-lg border border-border-medium bg-surface-primary p-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="font-medium text-text-primary">{server.name}</h4>
            <span className={cn(
              'rounded-full px-2 py-1 text-xs font-medium uppercase',
              getTypeColor()
            )}>
              {server.type}
            </span>
            <div className="flex items-center gap-1">
              {getStatusIcon()}
              <span className="text-sm text-text-secondary">
                {getStatusText()}
              </span>
            </div>
            {!server.enabled && (
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                {localize('com_ui_disabled')}
              </span>
            )}
          </div>
          
          {server.description && (
            <p className="mt-1 text-sm text-text-secondary">
              {server.description}
            </p>
          )}

          <div className="mt-2 flex items-center gap-4 text-sm text-text-secondary">
            <span>{server.toolCount} {localize('com_ui_tools')}</span>
            {server.lastConnected && (
              <span>
                {localize('com_ui_last_connected')}: {' '}
                {new Date(server.lastConnected).toLocaleString()}
              </span>
            )}
          </div>

          {server.status === 'error' && server.errorMessage && (
            <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {server.errorMessage}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleTest}
            disabled={testMutation.isPending}
            className="flex items-center gap-1"
          >
            {testMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <TestTube size={14} />
            )}
            {localize('com_ui_test')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            disabled={toggleMutation.isPending}
            className="flex items-center gap-1"
          >
            {toggleMutation.isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : server.enabled ? (
              <PowerOff size={14} />
            ) : (
              <Power size={14} />
            )}
            {server.enabled ? localize('com_ui_disable') : localize('com_ui_enable')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            className="flex items-center gap-1"
          >
            <Edit size={14} />
            {localize('com_ui_edit')}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex items-center gap-1 text-red-600 hover:text-red-700"
          >
            {isDeleting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            {localize('com_ui_delete')}
          </Button>

          {server.toolCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1"
            >
              {isExpanded ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
              {localize('com_ui_tools')}
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Tools Section */}
      {isExpanded && server.toolCount > 0 && (
        <div className="mt-4 border-t border-border-light pt-4">
          <ToolList 
            serverId={server._id}
            tools={server.tools}
            onRefresh={onRefresh}
          />
        </div>
      )}
    </div>
  );
}