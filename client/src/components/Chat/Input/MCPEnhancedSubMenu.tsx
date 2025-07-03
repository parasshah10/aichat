import React, { useState, useCallback } from 'react';
import * as Ariakit from '@ariakit/react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { useRefreshAllMCPServersMutation } from 'librechat-data-provider/react-query';
import { PinIcon, MCPIcon } from '~/components/svg';
import { useToastContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import MCPServerItem from './MCPServerItem';
import type { TPlugin } from 'librechat-data-provider';

interface MCPEnhancedSubMenuProps {
  isMCPPinned: boolean;
  setIsMCPPinned: (value: boolean) => void;
  mcpValues?: string[];
  mcpServerNames: string[];
  mcpToolDetails: TPlugin[];
  handleMCPToggle: (serverName: string) => void;
  onConfigClick: (tool: TPlugin) => void;
  placeholder?: string;
}

const MCPEnhancedSubMenu = ({
  mcpValues,
  isMCPPinned,
  mcpServerNames,
  mcpToolDetails,
  setIsMCPPinned,
  handleMCPToggle,
  onConfigClick,
  placeholder,
  ...props
}: MCPEnhancedSubMenuProps) => {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);

  const refreshAllMutation = useRefreshAllMCPServersMutation();

  const menuStore = Ariakit.useMenuStore({
    focusLoop: true,
    showTimeout: 100,
    placement: 'right',
  });

  const handleRefreshAll = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      
      setIsRefreshingAll(true);
      try {
        const result = await refreshAllMutation.mutateAsync();
        showToast({
          message: localize('com_nav_mcp_all_servers_refreshed', { 
            count: result.refreshedServers.length 
          }),
          status: 'success',
        });
        
        if (result.failedServers.length > 0) {
          showToast({
            message: localize('com_nav_mcp_some_servers_failed', { 
              failed: result.failedServers.join(', ') 
            }),
            status: 'warning',
          });
        }
      } catch (error) {
        console.error('Failed to refresh all MCP servers:', error);
        showToast({
          message: localize('com_nav_mcp_refresh_all_error'),
          status: 'error',
        });
      } finally {
        setIsRefreshingAll(false);
      }
    },
    [refreshAllMutation, showToast, localize],
  );

  // Group tools by server name
  const toolsByServer = React.useMemo(() => {
    const grouped: Record<string, TPlugin[]> = {};
    mcpToolDetails.forEach((tool) => {
      if (!grouped[tool.name]) {
        grouped[tool.name] = [];
      }
      grouped[tool.name].push(tool);
    });
    return grouped;
  }, [mcpToolDetails]);

  return (
    <Ariakit.MenuProvider store={menuStore}>
      <Ariakit.MenuItem
        {...props}
        render={
          <Ariakit.MenuButton
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.stopPropagation();
              menuStore.toggle();
            }}
            className="flex w-full cursor-pointer items-center justify-between rounded-lg p-2 hover:bg-surface-hover"
          />
        }
      >
        <div className="flex items-center gap-2">
          <MCPIcon className="icon-md" />
          <span>{placeholder || localize('com_ui_mcp_servers')}</span>
          <ChevronRight className="ml-auto h-3 w-3" />
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMCPPinned(!isMCPPinned);
          }}
          className={cn(
            'rounded p-1 transition-all duration-200',
            'hover:bg-surface-tertiary hover:shadow-sm',
            !isMCPPinned && 'text-text-secondary hover:text-text-primary',
          )}
          aria-label={isMCPPinned ? 'Unpin' : 'Pin'}
        >
          <div className="h-4 w-4">
            <PinIcon unpin={isMCPPinned} />
          </div>
        </button>
      </Ariakit.MenuItem>
      
      <Ariakit.Menu
        portal={true}
        unmountOnHide={true}
        className={cn(
          'animate-popover-left z-50 ml-3 flex min-w-[300px] max-w-[500px] flex-col rounded-xl',
          'border border-border-light bg-surface-secondary p-1 shadow-lg',
          'max-h-[400px] overflow-hidden',
        )}
      >
        {/* Header with refresh all button */}
        <div className="flex items-center justify-between border-b border-border-light px-2 py-2">
          <span className="text-sm font-medium text-text-primary">
            {localize('com_ui_mcp_servers')} ({mcpServerNames.length})
          </span>
          <button
            type="button"
            onClick={handleRefreshAll}
            disabled={isRefreshingAll || mcpServerNames.length === 0}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-surface-tertiary disabled:opacity-50"
            title={localize('com_nav_mcp_refresh_all')}
          >
            <RefreshCw className={cn('h-3 w-3', isRefreshingAll && 'animate-spin')} />
            {localize('com_nav_refresh_all')}
          </button>
        </div>

        {/* Scrollable server list */}
        <div className="flex-1 overflow-y-auto p-1">
          {mcpServerNames.length === 0 ? (
            <div className="p-4 text-center text-sm text-text-secondary">
              {localize('com_nav_mcp_no_servers')}
            </div>
          ) : (
            mcpServerNames.map((serverName) => {
              const serverTools = toolsByServer[serverName] || [];
              const mainTool = serverTools[0]; // Use first tool for auth config
              const hasAuthConfig = mainTool?.authConfig && mainTool.authConfig.length > 0;
              const isAuthenticated = mainTool?.authenticated ?? false;

              return (
                <MCPServerItem
                  key={serverName}
                  serverName={serverName}
                  isSelected={mcpValues?.includes(serverName) ?? false}
                  onToggle={handleMCPToggle}
                  tools={serverTools}
                  hasAuthConfig={hasAuthConfig}
                  isAuthenticated={isAuthenticated}
                  onConfigClick={() => mainTool && onConfigClick(mainTool)}
                />
              );
            })
          )}
        </div>
      </Ariakit.Menu>
    </Ariakit.MenuProvider>
  );
};

export default React.memo(MCPEnhancedSubMenu);