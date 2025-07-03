import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as Ariakit from '@ariakit/react';
import { ChevronRight, RefreshCw } from 'lucide-react';
import { Constants } from 'librechat-data-provider';
import { useRefreshAllMCPServersMutation } from 'librechat-data-provider/react-query';
import { PinIcon, MCPIcon } from '~/components/svg';
import { useToastContext } from '~/Providers';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';
import MCPServerItemStandalone from './MCPServerItemStandalone';
import type { TPlugin } from 'librechat-data-provider';

interface MCPEnhancedSelectProps {
  isMCPPinned: boolean;
  setIsMCPPinned: (value: boolean) => void;
  mcpValues?: string[];
  mcpServerNames: string[];
  mcpToolDetails: TPlugin[];
  handleMCPToggle: (serverName: string) => void;
  onConfigClick: (tool: TPlugin) => void;
  placeholder?: string;
}

const MCPEnhancedSelect = ({
  mcpValues,
  isMCPPinned,
  mcpServerNames,
  mcpToolDetails,
  setIsMCPPinned,
  handleMCPToggle,
  onConfigClick,
  placeholder,
}: MCPEnhancedSelectProps) => {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const refreshAllMutation = useRefreshAllMCPServersMutation();

  // Update button position when menu opens
  useEffect(() => {
    if (isMenuOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isMenuOpen]);

  // Position dropdown with responsive positioning
  const getDropdownPosition = () => {
    if (!buttonRect) return { top: 0, left: 0 };
    
    const isMobile = window.innerWidth < 768; // md breakpoint
    const dropdownWidth = isMobile ? window.innerWidth - 32 : 300; // Full width minus padding on mobile
    
    if (isMobile) {
      // On mobile: center the dropdown horizontally with padding
      const centerLeft = 16; // 16px padding from left edge
      console.log('Mobile centering:', { 
        windowWidth: window.innerWidth, 
        dropdownWidth, 
        centerLeft,
        scrollX: window.scrollX 
      });
      
      return {
        bottom: window.innerHeight - buttonRect.top + window.scrollY,
        left: centerLeft,
        width: dropdownWidth, // Set explicit width
      };
    } else {
      // On desktop: align with button, but ensure it doesn't go off-screen
      let left = buttonRect.left + window.scrollX;
      
      // Adjust if dropdown would go off right edge
      if (left + dropdownWidth > window.innerWidth + window.scrollX) {
        left = window.innerWidth + window.scrollX - dropdownWidth - 16; // 16px padding
      }
      
      // Ensure it doesn't go off left edge
      if (left < window.scrollX + 16) {
        left = window.scrollX + 16;
      }
      
      return {
        bottom: window.innerHeight - buttonRect.top + window.scrollY,
        left: left,
      };
    }
  };

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
    
    console.log('DEBUG: All mcpToolDetails:', mcpToolDetails);
    console.log('DEBUG: mcpServerNames:', mcpServerNames);
    
    mcpToolDetails.forEach((tool) => {
      // Use the correct delimiter: '_mcp_' 
      const parts = tool.pluginKey.split(Constants.mcp_delimiter);
      const serverName = parts[parts.length - 1];
      
      console.log('DEBUG: Processing tool:', {
        toolName: tool.name,
        pluginKey: tool.pluginKey,
        extractedServerName: serverName,
        parts: parts
      });
      
      if (!grouped[serverName]) {
        grouped[serverName] = [];
      }
      grouped[serverName].push(tool);
    });
    
    console.log('DEBUG: Final grouped tools:', grouped);
    
    return grouped;
  }, [mcpToolDetails, mcpServerNames]);

  const renderSelectedValues = (values: string[], placeholder?: string) => {
    if (values.length === 0) {
      return placeholder || localize('com_ui_select') + '...';
    }
    if (values.length === 1) {
      return values[0];
    }
    return localize('com_ui_x_selected', { 0: values.length });
  };

  return (
    <div className="relative">
      {/* Main button */}
      <button
        ref={buttonRef}
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        className="group relative inline-flex items-center justify-center md:justify-start gap-1.5 rounded-full border border-border-medium text-sm font-medium transition-all md:w-full size-9 p-2 md:p-3 bg-transparent shadow-sm hover:bg-surface-hover hover:shadow-md active:shadow-inner border border-blue-600/50 bg-blue-500/10 hover:bg-blue-700/10"
        aria-label={placeholder}
      >
        <MCPIcon className="icon-md text-text-primary" />
        <span className="mr-auto hidden truncate md:block">
          {renderSelectedValues(mcpValues ?? [], placeholder)}
        </span>
      </button>
      
      {/* Enhanced dropdown menu - rendered in portal */}
      {isMenuOpen && buttonRect && createPortal(
        <>
          {/* Click outside to close */}
          <div 
            className="fixed inset-0 z-[9998]" 
            onClick={() => setIsMenuOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div 
            className={cn(
              'fixed z-[9999] flex flex-col rounded-2xl backdrop-blur-xl',
              'border border-white/20 bg-white/95 dark:bg-gray-900/95 dark:border-gray-700/50',
              'shadow-2xl shadow-black/20 dark:shadow-black/40',
              'max-h-[400px] overflow-hidden',
              'ring-1 ring-black/5 dark:ring-white/10',
              window.innerWidth < 768 ? 'w-auto' : 'min-w-[320px] max-w-[480px]',
            )}
            style={{
              ...getDropdownPosition(),
              background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)',
              ...(window.matchMedia('(prefers-color-scheme: dark)').matches && {
                background: 'linear-gradient(135deg, rgba(17,24,39,0.95) 0%, rgba(31,41,55,0.95) 100%)',
              }),
            }}
          >
            {/* Premium Header with gradient and glass effect */}
            <div className="relative flex items-center justify-between border-b border-white/20 dark:border-gray-700/50 px-4 py-3 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-950/30 dark:to-indigo-950/30">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse"></div>
                <span className="text-sm font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent">
                  MCP Servers ({mcpServerNames.length})
                </span>
              </div>
              <button
                type="button"
                onClick={handleRefreshAll}
                disabled={isRefreshingAll || mcpServerNames.length === 0}
                className={cn(
                  'group flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200',
                  'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/25',
                  'hover:from-blue-600 hover:to-indigo-600 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105',
                  'active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
                  'border border-white/20'
                )}
                title={localize('com_nav_mcp_refresh_all')}
              >
                <RefreshCw className={cn('h-3.5 w-3.5 transition-transform', isRefreshingAll && 'animate-spin')} />
                <span className="hidden sm:inline">Refresh All</span>
                <span className="sm:hidden">Refresh</span>
              </button>
            </div>

            {/* Premium Scrollable server list with custom scrollbar */}
            <div className="flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-400 dark:hover:scrollbar-thumb-gray-500" style={{ maxHeight: 'calc(80vh - 80px)' }}>
              {mcpServerNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-3 h-12 w-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center">
                    <MCPIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {localize('com_nav_mcp_no_servers')}
                  </p>
                </div>
              ) : (
                mcpServerNames.map((serverName) => {
                  const serverTools = toolsByServer[serverName] || [];
                  const mainTool = serverTools[0]; // Use first tool for auth config
                  const hasAuthConfig = mainTool?.authConfig && mainTool.authConfig.length > 0;
                  const isAuthenticated = mainTool?.authenticated ?? false;

                  return (
                    <MCPServerItemStandalone
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
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default React.memo(MCPEnhancedSelect);