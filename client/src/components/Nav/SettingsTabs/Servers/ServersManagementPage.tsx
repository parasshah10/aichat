import React, { useState, useMemo } from 'react';
import {
  useGetMcpConfigs,
  useGetYamlMcpConfigs,
  McpServerConfig,
  useUpdateMcpConfig,
  useAvailableToolsQuery,
  Constants,
  useCheckMcpServersStatus, // Import the status check hook
  McpServerStatusRequest,
  McpServerStatus,
} from '~/data-provider';
import { Button, Collapsible, CollapsibleTrigger, CollapsibleContent, Switch, Label, Badge } from '~/components/ui';
import { useLocalize } from '~/hooks';
import AddEditMcpServerModal from '~/components/ui/AddEditMcpServerModal';
import { ChevronDownIcon, ChevronUpIcon, Settings2Icon } from 'lucide-react'; // Using Settings2Icon for tool schema

const ServersManagementPage = () => {
  const localize = useLocalize();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<McpServerConfig | null>(null);
  const [expandedServerTools, setExpandedServerTools] = useState<Record<string, boolean>>({});
  const [expandedToolSchema, setExpandedToolSchema] = useState<Record<string, boolean>>({});
  const [serverStatuses, setServerStatuses] = useState<Record<string, McpServerStatus>>({});

  const { data: dbMcpConfigs, isLoading: isLoadingDbMcp, refetch: refetchDbMcp } = useGetMcpConfigs();
  const { data: yamlMcpConfigs, isLoading: isLoadingYamlMcp, refetch: refetchYamlMcp } = useGetYamlMcpConfigs();
  // Fetch available tools. The endpoint parameter might be null or a specific one if this hook is generic.
  // Assuming null or a general key fetches all relevant tools including MCP ones.
  // The TPlugin type from librechat-data-provider should be suitable for tools.
  const { data: availableToolsData, isLoading: isLoadingTools } = useAvailableToolsQuery(null);
  const availableTools = availableToolsData ?? [];

  const updateMcpConfigMutation = useUpdateMcpConfig();
  const checkStatusesMutation = useCheckMcpServersStatus();

  const combinedServers = useMemo(() => {
    const servers: Partial<McpServerConfig>[] = [];
    if (yamlMcpConfigs) {
      Object.entries(yamlMcpConfigs).forEach(([name, config]) => {
        servers.push({
          ...config,
          name,
          _id: `yaml-${name}`,
          user: 'yaml',
          enabled: true,
        });
      });
    }
    if (dbMcpConfigs) {
      dbMcpConfigs.forEach(dbConfig => {
        const existingIndex = servers.findIndex(s => s.name === dbConfig.name);
        if (existingIndex !== -1) {
          servers[existingIndex] = { ...servers[existingIndex], ...dbConfig, user: dbConfig.user ?? 'db_user' };
        } else {
          servers.push({ ...dbConfig, user: dbConfig.user ?? 'db_user' });
        }
      });
    }
    return servers;
  }, [yamlMcpConfigs, dbMcpConfigs]);

  const fetchServerStatuses = async (serversToCheck: Partial<McpServerConfig>[]) => {
    if (serversToCheck.length === 0) {
      setServerStatuses({});
      return;
    }
    const payloadServers: McpServerStatusRequest[] = serversToCheck
      .map(s => ({
        name: s.name ?? 'Unknown',
        type: s.type ?? '',
        url: s.url,
        // command and args are not sent as they are not used in current backend status check for stdio
      }))
      .filter(s => s.type); // Ensure type is present

    // Initial optimistic update to "Checking..."
    const initialStatuses: Record<string, McpServerStatus> = {};
    payloadServers.forEach(s => initialStatuses[s.name] = { name: s.name, status: 'Checking...' });
    setServerStatuses(initialStatuses);

    try {
      const response = await checkStatusesMutation.mutateAsync({ servers: payloadServers });
      const newStatuses: Record<string, McpServerStatus> = {};
      response.statuses.forEach(status => {
        newStatuses[status.name] = status;
      });
      setServerStatuses(newStatuses);
    } catch (error) {
      console.error('Error fetching server statuses:', error);
      // Update statuses to show error for all that were checking
      const errorStatuses: Record<string, McpServerStatus> = {};
       payloadServers.forEach(s => errorStatuses[s.name] = { name: s.name, status: 'Error', details: 'Failed to fetch status' });
      setServerStatuses(prev => ({...prev, ...errorStatuses}));
    }
  };

  useEffect(() => {
    if (combinedServers.length > 0) {
      fetchServerStatuses(combinedServers);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [combinedServers]); // Re-run if combinedServers array reference changes (i.e., data re-fetched)


  const handleAddServer = () => {
    setEditingServer(null);
    setIsModalOpen(true);
  };

  const handleEditServer = (server: McpServerConfig) => {
    setEditingServer(server);
    setIsModalOpen(true);
  };

  const handleRefresh = () => {
    refetchDbMcp();
    refetchYamlMcp();
    // Statuses will be refetched by the useEffect when combinedServers updates
  };

  const toggleServerTools = (serverId: string) => {
    setExpandedServerTools(prev => ({ ...prev, [serverId]: !prev[serverId] }));
  };

  const toggleToolSchema = (toolId: string) => {
    setExpandedToolSchema(prev => ({ ...prev, [toolId]: !prev[toolId] }));
  };

  const handleToolEnableToggle = (server: McpServerConfig, toolName: string, isEnabled: boolean) => {
    if (!server._id || server.user === 'yaml') return; // Should not happen for user servers

    const currentDisabledTools = new Set(server.disabledTools || []);
    if (isEnabled) {
      currentDisabledTools.delete(toolName);
    } else {
      currentDisabledTools.add(toolName);
    }
    const updatedDisabledTools = Array.from(currentDisabledTools);
    updateMcpConfigMutation.mutate(
      { _id: server._id, disabledTools: updatedDisabledTools },
      { onSuccess: () => refetchDbMcp() },
    );
  };

  // Memoize processed tools to prevent recalculation on every render
  const serverToolsMap = useMemo(() => {
    const map = new Map<string, ReturnType<typeof useAvailableToolsQuery>['data']>();
    if (!availableTools || availableTools.length === 0) {
      return map;
    }
    availableTools.forEach(tool => {
      const parts = tool.name.split(Constants.mcp_delimiter);
      if (parts.length > 1) {
        const serverName = parts.slice(1).join(Constants.mcp_delimiter); // Handle server names with delimiters
        if (!map.has(serverName)) {
          map.set(serverName, []);
        }
        map.get(serverName)?.push(tool);
      }
    });
    return map;
  }, [availableTools]);


  // Basic loading and error states
  if (isLoadingDbMcp || isLoadingYamlMcp || isLoadingTools) {
    return <div>{localize('com_ui_loading')}...</div>;
  }

  // Combine and process servers (very basic for now)
  // YAML configs are Record<string, MCPOptions>, DB configs are McpServerConfig[]
  const allServers: Partial<McpServerConfig>[] = [];

  if (yamlMcpConfigs) {
    Object.entries(yamlMcpConfigs).forEach(([name, config]) => {
      allServers.push({
        ...config,
        name,
        _id: `yaml-${name}`, // Synthetic ID for YAML servers
        user: 'yaml', // Differentiate YAML from user DB configs
        enabled: true, // YAML configs are implicitly enabled unless overridden by DB
      });
    });
  }

  if (dbMcpConfigs) {
    dbMcpConfigs.forEach(dbConfig => {
      const existingIndex = allServers.findIndex(s => s.name === dbConfig.name);
      if (existingIndex !== -1) {
        // DB config overrides YAML if names match (and LIBRECHAT_FORCE_YAML_MCP is not true, handled by backend for tool usage)
        // For UI display, we can assume DB takes precedence or show both if needed.
        // For simplicity here, let's assume DB replaces if name matches.
        allServers[existingIndex] = { ...allServers[existingIndex], ...dbConfig, user: dbConfig.user ?? 'db_user' };
      } else {
        allServers.push({ ...dbConfig, user: dbConfig.user ?? 'db_user'});
      }
    });
  }


  return (
    <div className="container mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{localize('com_settings_servers_management_title', 'Servers Management')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            {localize('com_ui_refresh')}
          </Button>
          <Button variant="default" onClick={handleAddServer}>
            {localize('com_ui_add_server', 'Add Server')}
          </Button>
        </div>
      </div>

      {/* Server List */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allServers.map((server) => (
          <div key={server._id} className="rounded-lg border bg-background p-4 shadow">
            <h2 className="mb-2 text-xl font-semibold">{server.name}</h2>
            <p className="mb-1 text-sm text-muted-foreground">
              Type: <span className="font-medium">{server.type ?? 'N/A'}</span>
            </p>
            <div className="mb-1 flex items-center text-sm text-muted-foreground">
              Status:&nbsp;
              {serverStatuses[server.name ?? ''] ? (
                <Badge
                  variant={
                    serverStatuses[server.name]?.status === 'Online' ? 'default' :
                    serverStatuses[server.name]?.status === 'Offline' ? 'destructive' :
                    serverStatuses[server.name]?.status === 'Error' ? 'destructive' :
                    serverStatuses[server.name]?.status === 'Checking...' ? 'outline' :
                    'secondary'
                  }
                  className="ml-1 px-1.5 py-0.5 text-xs"
                  title={serverStatuses[server.name]?.details}
                >
                  {localize(`com_settings_servers_status_${serverStatuses[server.name]?.status.toLowerCase().replace(/\./g, '')}`, serverStatuses[server.name]?.status)}
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">{localize('com_settings_servers_status_unknown', 'Unknown')}</Badge>
              )}
              {server.enabled === false && server.user !== 'yaml' && (
                 <Badge variant="outline" className="ml-2 px-1.5 py-0.5 text-xs border-yellow-500 text-yellow-600">
                    {localize('com_ui_disabled_by_user', 'Disabled by User')}
                  </Badge>
              )}
            </div>
            <p className="mb-3 text-sm text-muted-foreground">
              Source: <span className="font-medium">{server.user === 'yaml' ? 'System (YAML)' : 'User Defined'}</span>
            </p>

            @{/* Tools Section */}
            <Collapsible open={expandedServerTools[server._id ?? server.name]} onOpenChange={() => toggleServerTools(server._id ?? server.name)}>
              <CollapsibleTrigger asChild>
                <Button variant="link" className="flex items-center p-0 text-sm">
                  {localize('com_settings_servers_tools', 'Tools')} ({serverToolsMap.get(server.name)?.length ?? 0})
                  {expandedServerTools[server._id ?? server.name] ? <ChevronUpIcon className="ml-1 h-4 w-4" /> : <ChevronDownIcon className="ml-1 h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {(serverToolsMap.get(server.name) ?? []).map(tool => {
                  const toolIsEnabled = !(server.disabledTools?.includes(tool.name.split(Constants.mcp_delimiter)[0]));
                  const toolIdForSchema = `${server._id ?? server.name}-${tool.name}`;
                  return (
                    <div key={tool.name} className="ml-4 rounded border bg-background-secondary p-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold">{tool.name.split(Constants.mcp_delimiter)[0]}</h4>
                        {server.user !== 'yaml' && server._id && (
                          <div className="flex items-center space-x-2">
                            <Label htmlFor={`tool-toggle-${server._id}-${tool.name}`} className="text-xs">
                              {toolIsEnabled ? localize('com_ui_enabled') : localize('com_ui_disabled')}
                            </Label>
                            <Switch
                              id={`tool-toggle-${server._id}-${tool.name}`}
                              checked={toolIsEnabled}
                              onCheckedChange={(checked) => handleToolEnableToggle(server as McpServerConfig, tool.name.split(Constants.mcp_delimiter)[0], checked)}
                              disabled={updateMcpConfigMutation.isLoading}
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button variant="outline" size="xs" onClick={() => alert(`Run ${tool.name}`)} disabled>
                          {localize('com_ui_run')} (WIP)
                        </Button>
                        <Button variant="ghost" size="icon_xs" onClick={() => toggleToolSchema(toolIdForSchema)} title={localize('com_settings_servers_view_schema')}>
                          <Settings2Icon className="h-4 w-4" />
                        </Button>
                      </div>
                      <Collapsible open={expandedToolSchema[toolIdForSchema]} onOpenChange={() => toggleToolSchema(toolIdForSchema)}>
                        <CollapsibleContent className="mt-2">
                          <pre className="max-h-48 overflow-auto rounded bg-background-tertiary p-2 text-xs">
                            {JSON.stringify(tool.inputSchema, null, 2)}
                          </pre>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}
                {(serverToolsMap.get(server.name) ?? []).length === 0 && (
                  <p className="ml-4 text-xs text-muted-foreground">{localize('com_settings_servers_no_tools')}</p>
                )}
              </CollapsibleContent>
            </Collapsible>

            {server.user !== 'yaml' && server._id && ( // Ensure server._id exists for editing
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditServer(server as McpServerConfig)}>
                  {localize('com_ui_edit')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => alert(`Delete ${server.name}`)}>
                  {localize('com_ui_delete')}
                </Button>
              </div>
            )}
          </div>
        ))}
        {allServers.length === 0 && <p>{localize('com_settings_servers_no_servers')}</p>}
      </div>

      {isModalOpen && (
        <AddEditMcpServerModal
          isOpen={isModalOpen}
          onOpenChange={setIsModalOpen}
          serverToEdit={editingServer}
          onSuccess={() => {
            refetchDbMcp();
            // No need to refetch YAML as user actions don't change it
          }}
        />
      )}
    </div>
  );
};

export default ServersManagementPage;
