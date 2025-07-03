import React, { useState, useCallback } from 'react';
import { RefreshCw, Settings, ChevronDown } from 'lucide-react';
import { useRefreshMCPServerMutation } from 'librechat-data-provider/react-query';
import { useToastContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import type { TPlugin } from 'librechat-data-provider';

interface MCPServerItemStandaloneProps {
  serverName: string;
  isSelected: boolean;
  onToggle: (serverName: string) => void;
  tools: TPlugin[];
  hasAuthConfig: boolean;
  isAuthenticated: boolean;
  onConfigClick: () => void;
}

const MCPServerItemStandalone = ({
  serverName,
  isSelected,
  onToggle,
  tools,
  hasAuthConfig,
  isAuthenticated,
  onConfigClick,
}: MCPServerItemStandaloneProps) => {
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

  const handleServerClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Clicking the main area toggles server selection
      onToggle(serverName);
    },
    [onToggle, serverName],
  );

  const handleChevronClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      // Clicking the chevron toggles tool expansion
      setIsToolsExpanded(!isToolsExpanded);
    },
    [isToolsExpanded],
  );

  const handleCheckboxClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onToggle(serverName);
    },
    [onToggle, serverName],
  );

  return (
    <div className="w-full">
      {/* Main server item */}
      <div
        onClick={handleServerClick}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-text-primary hover:cursor-pointer',
          'transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-indigo-50/50',
          'dark:hover:from-blue-950/20 dark:hover:to-indigo-950/20',
          'hover:shadow-md hover:shadow-blue-500/10 hover:scale-[1.02]',
          'border border-transparent hover:border-blue-200/50 dark:hover:border-blue-700/30',
          'w-full min-w-0 text-sm backdrop-blur-sm',
          isSelected && 'bg-gradient-to-r from-blue-100/70 to-indigo-100/70 dark:from-blue-900/30 dark:to-indigo-900/30 border-blue-300/50 dark:border-blue-600/50 shadow-lg shadow-blue-500/20',
          isToolsExpanded && 'bg-gradient-to-r from-indigo-50/70 to-purple-50/70 dark:from-indigo-950/30 dark:to-purple-950/30',
        )}
      >
        {/* Premium Checkbox */}
        <div className="flex items-center" onClick={handleCheckboxClick}>
          <div className={cn(
            'relative h-5 w-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer',
            isSelected 
              ? 'bg-gradient-to-r from-blue-500 to-indigo-500 border-blue-500 shadow-lg shadow-blue-500/30' 
              : 'border-gray-300 dark:border-gray-600 group-hover:border-blue-400 dark:group-hover:border-blue-500'
          )}>
            {isSelected && (
              <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>
        
        <div className="flex flex-1 items-center gap-2">
          <span className="truncate">{serverName}</span>
          {tools.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-700/50 shadow-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              {tools.length} tool{tools.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
        
        {/* Elegant expand indicator - clickable area */}
        {tools.length > 0 && (
          <button
            type="button"
            onClick={handleChevronClick}
            className="flex items-center justify-center p-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors duration-200"
            aria-label={`${isToolsExpanded ? 'Collapse' : 'Expand'} tools for ${serverName}`}
          >
            <ChevronDown className={cn(
              'h-4 w-4 text-gray-400 dark:text-gray-500 transition-all duration-300',
              'group-hover:text-blue-500 dark:group-hover:text-blue-400',
              isToolsExpanded && 'rotate-180 text-indigo-500 dark:text-indigo-400'
            )} />
          </button>
        )}

        {/* Premium Action buttons */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          
          {/* Config button */}
          {hasAuthConfig && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onConfigClick();
              }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
                'hover:bg-gradient-to-r hover:from-amber-500 hover:to-orange-500 hover:text-white hover:shadow-lg hover:shadow-amber-500/25 hover:scale-110',
                'bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50',
                isAuthenticated && 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25'
              )}
              aria-label={`Configure ${serverName}`}
              title="Configure authentication"
            >
              <Settings className="h-3.5 w-3.5" />
            </button>
          )}
          
          {/* Refresh button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-200',
              'hover:bg-gradient-to-r hover:from-purple-500 hover:to-pink-500 hover:text-white hover:shadow-lg hover:shadow-purple-500/25 hover:scale-110',
              'bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
              isRefreshing && 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25'
            )}
            aria-label={`Refresh ${serverName}`}
            title="Refresh server"
          >
            <RefreshCw className={cn('h-3.5 w-3.5 transition-transform', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Elegant Tools submenu with smooth accordion animation */}
      <div className={cn(
        'overflow-visible transition-all duration-300 ease-out',
        isToolsExpanded ? 'opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
      )}>
        <div className="ml-6 mt-2 space-y-2 border-l-2 border-gradient-to-b from-blue-200 to-indigo-200 dark:from-blue-700 dark:to-indigo-700 pl-4 border-l border-blue-200/50 dark:border-blue-700/50">
          {tools.map((tool, index) => (
            <div
              key={tool.pluginKey}
              className={cn(
                'rounded-xl bg-gradient-to-r from-white/80 to-gray-50/80 dark:from-gray-800/80 dark:to-gray-900/80',
                'border border-gray-200/50 dark:border-gray-700/50 p-3 text-xs backdrop-blur-sm',
                'shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]',
                'animate-in slide-in-from-left-2 fade-in duration-300',
              )}
              style={{ animationDelay: `${index * 50}ms` }}
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
      </div>
    </div>
  );
};

export default React.memo(MCPServerItemStandalone);