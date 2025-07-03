import React, { useState, useCallback } from 'react';
import * as Ariakit from '@ariakit/react';
import { ChevronRight, RefreshCw, Settings, Eye, EyeOff } from 'lucide-react';
import { useRefreshMCPServerMutation } from 'librechat-data-provider/react-query';
import { useToastContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import type { TPlugin } from 'librechat-data-provider';

interface MCPServerItemProps {
  serverName: string;
  isSelected: boolean;
  onToggle: (serverName: string) => void;
  tools: TPlugin[];
  hasAuthConfig: boolean;
  isAuthenticated: boolean;
  onConfigClick: () => void;
}

const MCPServerItem = ({
  serverName,
  isSelected,
  onToggle,
  tools,
  hasAuthConfig,
  isAuthenticated,
  onConfigClick,
}: MCPServerItemProps) => {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isToolsExpanded, setIsToolsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshMutation = useRefreshMCPServerMutation();

  const handleRefresh = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      setIsRefreshing(true);
      try {
        await refreshMutation.mutateAsync(serverName);
        showToast({
          message: localize('com_nav_mcp_server_refreshed', { serverName }),
          status: 'success',
        });
      } catch (error) {
        console.error('Failed to refresh MCP server:', error);
        showToast({
          message: localize('com_nav_mcp_server_refresh_error', { serverName }),
          status: 'error',
        });
      } finally {
        setIsRefreshing(false);
      }
    },
    [refreshMutation, serverName, showToast, localize],
  );

  const handleToggleTools = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsToolsExpanded(!isToolsExpanded);
    },
    [isToolsExpanded],
  );

  const handleServerToggle = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onToggle(serverName);
    },
    [onToggle, serverName],
  );

  return (
    <div className="w-full">
      {/* Main server item */}
      <Ariakit.MenuItem
        onClick={handleServerToggle}
        className={cn(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 text-text-primary hover:cursor-pointer',
          'scroll-m-1 outline-none transition-colors',
          'hover:bg-black/[0.075] dark:hover:bg-white/10',
          'data-[active-item]:bg-black/[0.075] dark:data-[active-item]:bg-white/10',
          'w-full min-w-0 text-sm',
        )}
      >
        <Ariakit.MenuItemCheck checked={isSelected} />
        <span className="flex-1 truncate">{serverName}</span>
        
        {/* Action buttons */}
        <div className="flex items-center gap-1">
          {/* Tools toggle button */}
          {tools.length > 0 && (
            <button
              type="button"
              onClick={handleToggleTools}
              className="flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-surface-secondary"
              aria-label={`${isToolsExpanded ? 'Hide' : 'Show'} tools for ${serverName}`}
              title={`${isToolsExpanded ? 'Hide' : 'Show'} ${tools.length} tool${tools.length === 1 ? '' : 's'}`}
            >
              {isToolsExpanded ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </button>
          )}
          
          {/* Config button */}
          {hasAuthConfig && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onConfigClick();
              }}
              className="flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-surface-secondary"
              aria-label={`Configure ${serverName}`}
              title="Configure authentication"
            >
              <Settings className={cn('h-3 w-3', isAuthenticated && 'text-green-500')} />
            </button>
          )}
          
          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex h-6 w-6 items-center justify-center rounded p-1 hover:bg-surface-secondary disabled:opacity-50"
            aria-label={`Refresh ${serverName}`}
            title="Refresh server"
          >
            <RefreshCw className={cn('h-3 w-3', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </Ariakit.MenuItem>

      {/* Tools submenu */}
      {isToolsExpanded && tools.length > 0 && (
        <div className="ml-6 mt-1 space-y-1 border-l border-border-light pl-2">
          {tools.map((tool) => (
            <div
              key={tool.pluginKey}
              className="rounded-md bg-surface-tertiary/50 p-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-text-primary">{tool.name}</span>
                {tool.authenticated !== undefined && (
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs',
                      tool.authenticated
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                    )}
                  >
                    {tool.authenticated ? 'Authenticated' : 'Not Authenticated'}
                  </span>
                )}
              </div>
              {tool.description && (
                <p className="mt-1 text-text-secondary">{tool.description}</p>
              )}
              {tool.authConfig && tool.authConfig.length > 0 && (
                <div className="mt-2">
                  <p className="text-text-secondary">Required configuration:</p>
                  <ul className="mt-1 space-y-1">
                    {tool.authConfig.map((config) => (
                      <li key={config.authField} className="text-text-secondary">
                        • {config.label || config.authField}
                        {config.description && (
                          <span className="ml-1 text-text-tertiary">- {config.description}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default React.memo(MCPServerItem);