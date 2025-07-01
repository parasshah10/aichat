import React, { useState } from 'react';
import { 
  TestTube, 
  Power, 
  PowerOff, 
  ChevronDown, 
  ChevronRight,
  Loader2,
  Code,
  RefreshCw
} from 'lucide-react';
import { useLocalize } from '~/hooks';
import { Button } from '~/components/ui';
import { useToggleMCPTool, useRefreshMCPServerTools } from '~/data-provider';
import type { IMCPServerTool } from 'librechat-data-provider';
import { cn } from '~/utils';

interface ToolListProps {
  serverId: string;
  tools: IMCPServerTool[];
  onRefresh: () => void;
}

export function ToolList({ serverId, tools, onRefresh }: ToolListProps) {
  const localize = useLocalize();
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  const toggleToolMutation = useToggleMCPTool();
  const refreshToolsMutation = useRefreshMCPServerTools();

  const handleToggleTool = async (toolName: string, enabled: boolean) => {
    try {
      await toggleToolMutation.mutateAsync({
        serverId,
        toolName,
        enabled: !enabled
      });
      onRefresh();
    } catch (error) {
      console.error('Failed to toggle tool:', error);
    }
  };

  const handleRefreshTools = async () => {
    try {
      await refreshToolsMutation.mutateAsync(serverId);
      onRefresh();
    } catch (error) {
      console.error('Failed to refresh tools:', error);
    }
  };

  const handleTestTool = (toolName: string) => {
    // TODO: Implement tool testing
    console.log('Testing tool:', toolName);
  };

  if (tools.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-text-secondary">
          {localize('com_ui_no_tools_available')}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshTools}
          disabled={refreshToolsMutation.isPending}
          className="mt-2 flex items-center gap-2"
        >
          <RefreshCw size={14} className={refreshToolsMutation.isPending ? 'animate-spin' : ''} />
          {localize('com_ui_refresh_tools')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h5 className="font-medium text-text-primary">
          {localize('com_ui_available_tools')} ({tools.length})
        </h5>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshTools}
          disabled={refreshToolsMutation.isPending}
          className="flex items-center gap-2"
        >
          <RefreshCw size={14} className={refreshToolsMutation.isPending ? 'animate-spin' : ''} />
          {localize('com_ui_refresh')}
        </Button>
      </div>

      <div className="space-y-2">
        {tools.map((tool) => (
          <div
            key={tool.name}
            className="rounded-md border border-border-light bg-surface-secondary p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h6 className="font-medium text-text-primary">{tool.name}</h6>
                  <span className={cn(
                    'rounded-full px-2 py-1 text-xs font-medium',
                    tool.enabled
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  )}>
                    {tool.enabled ? localize('com_ui_enabled') : localize('com_ui_disabled')}
                  </span>
                </div>
                
                {tool.description && (
                  <p className="mt-1 text-sm text-text-secondary">
                    {tool.description}
                  </p>
                )}

                {tool.lastUpdated && (
                  <p className="mt-1 text-xs text-text-secondary">
                    {localize('com_ui_last_updated')}: {' '}
                    {new Date(tool.lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTestTool(tool.name)}
                  className="flex items-center gap-1"
                >
                  <TestTube size={14} />
                  {localize('com_ui_test')}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleTool(tool.name, tool.enabled)}
                  disabled={toggleToolMutation.isPending}
                  className="flex items-center gap-1"
                >
                  {toggleToolMutation.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : tool.enabled ? (
                    <PowerOff size={14} />
                  ) : (
                    <Power size={14} />
                  )}
                  {tool.enabled ? localize('com_ui_disable') : localize('com_ui_enable')}
                </Button>

                {tool.schema && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedTool(
                      expandedTool === tool.name ? null : tool.name
                    )}
                    className="flex items-center gap-1"
                  >
                    {expandedTool === tool.name ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                    <Code size={14} />
                    {localize('com_ui_schema')}
                  </Button>
                )}
              </div>
            </div>

            {/* Expanded Schema */}
            {expandedTool === tool.name && tool.schema && (
              <div className="mt-3 border-t border-border-light pt-3">
                <h6 className="mb-2 text-sm font-medium text-text-primary">
                  {localize('com_ui_tool_schema')}
                </h6>
                <pre className="overflow-auto rounded-md bg-surface-tertiary p-3 text-xs text-text-secondary">
                  {JSON.stringify(tool.schema, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}