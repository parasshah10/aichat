import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { TestTube, Loader2 } from 'lucide-react';
import { useLocalize } from '~/hooks';
import { Button, Input, Textarea, Select, Label } from '~/components/ui';
import { useTestMCPServer } from '~/data-provider';
import type { IMCPServer, MCPServerType, CreateMCPServerParams, UpdateMCPServerParams } from 'librechat-data-provider';
import { cn } from '~/utils';

interface ServerFormProps {
  initialData?: IMCPServer;
  onSubmit: (data: Omit<CreateMCPServerParams | UpdateMCPServerParams, 'userId'>) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  submitLabel: string;
}

interface FormData {
  name: string;
  type: MCPServerType;
  description: string;
  enabled: boolean;
  config: {
    // stdio
    command: string;
    args: string;
    env: string;
    
    // web-based
    url: string;
    headers: string;
    
    // oauth
    oauth: {
      authorization_url: string;
      token_url: string;
      client_id: string;
      client_secret: string;
      scope: string;
      redirect_uri: string;
      token_exchange_method: string;
    };
    
    // common
    timeout: number;
    initTimeout: number;
    iconPath: string;
    chatMenu: boolean;
    serverInstructions: string;
  };
}

export function ServerForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting, 
  submitLabel 
}: ServerFormProps) {
  const localize = useLocalize();
  const [activeTab, setActiveTab] = useState('basic');
  const [testResult, setTestResult] = useState<any>(null);

  const testMutation = useTestMCPServer();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<FormData>({
    defaultValues: {
      name: initialData?.name || '',
      type: initialData?.type || 'stdio',
      description: initialData?.description || '',
      enabled: initialData?.enabled ?? true,
      config: {
        command: initialData?.config?.command || '',
        args: Array.isArray(initialData?.config?.args) 
          ? initialData.config.args.join(' ') 
          : '',
        env: initialData?.config?.env 
          ? JSON.stringify(initialData.config.env, null, 2) 
          : '{}',
        url: initialData?.config?.url || '',
        headers: initialData?.config?.headers 
          ? JSON.stringify(initialData.config.headers, null, 2) 
          : '{}',
        oauth: {
          authorization_url: initialData?.config?.oauth?.authorization_url || '',
          token_url: initialData?.config?.oauth?.token_url || '',
          client_id: initialData?.config?.oauth?.client_id || '',
          client_secret: initialData?.config?.oauth?.client_secret || '',
          scope: initialData?.config?.oauth?.scope || '',
          redirect_uri: initialData?.config?.oauth?.redirect_uri || '',
          token_exchange_method: initialData?.config?.oauth?.token_exchange_method || 'DefaultPost',
        },
        timeout: initialData?.config?.timeout || 30000,
        initTimeout: initialData?.config?.initTimeout || 10000,
        iconPath: initialData?.config?.iconPath || '',
        chatMenu: initialData?.config?.chatMenu ?? true,
        serverInstructions: typeof initialData?.config?.serverInstructions === 'string' 
          ? initialData.config.serverInstructions 
          : '',
      }
    }
  });

  const serverType = watch('type');

  const handleFormSubmit = async (data: FormData) => {
    try {
      // Parse JSON fields
      const config: any = {
        timeout: data.config.timeout,
        initTimeout: data.config.initTimeout,
        iconPath: data.config.iconPath,
        chatMenu: data.config.chatMenu,
        serverInstructions: data.config.serverInstructions,
      };

      if (serverType === 'stdio') {
        config.command = data.config.command;
        config.args = data.config.args.split(' ').filter(arg => arg.trim());
        try {
          config.env = JSON.parse(data.config.env);
        } catch {
          config.env = {};
        }
      } else {
        config.url = data.config.url;
        try {
          config.headers = JSON.parse(data.config.headers);
        } catch {
          config.headers = {};
        }
      }

      // Add OAuth if any field is filled
      const oauth = data.config.oauth;
      if (oauth.authorization_url || oauth.token_url || oauth.client_id) {
        config.oauth = {
          ...oauth,
          token_exchange_method: oauth.token_exchange_method || 'DefaultPost'
        };
      }

      await onSubmit({
        name: data.name,
        type: data.type,
        description: data.description,
        enabled: data.enabled,
        config
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleTestConnection = async () => {
    if (!initialData?._id) {
      alert(localize('com_ui_save_server_first'));
      return;
    }

    try {
      const result = await testMutation.mutateAsync(initialData._id);
      setTestResult(result);
    } catch (error) {
      console.error('Test failed:', error);
      setTestResult({ success: false, error: 'Test failed' });
    }
  };

  const tabs = [
    { id: 'basic', label: localize('com_ui_basic_info') },
    { id: 'connection', label: localize('com_ui_connection') },
    { id: 'oauth', label: localize('com_ui_oauth') },
    { id: 'advanced', label: localize('com_ui_advanced') },
  ];

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border-light">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-medium'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">{localize('com_ui_name')} *</Label>
            <Input
              id="name"
              {...register('name', { required: localize('com_ui_name_required') })}
              placeholder={localize('com_ui_server_name_placeholder')}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="type">{localize('com_ui_type')} *</Label>
            <Select
              value={serverType}
              onValueChange={(value) => setValue('type', value as MCPServerType)}
            >
              <option value="stdio">STDIO</option>
              <option value="websocket">WebSocket</option>
              <option value="sse">Server-Sent Events</option>
              <option value="streamable-http">Streamable HTTP</option>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">{localize('com_ui_description')}</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder={localize('com_ui_server_description_placeholder')}
              rows={3}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="enabled"
              {...register('enabled')}
              className="rounded border-border-medium"
            />
            <Label htmlFor="enabled">{localize('com_ui_enabled')}</Label>
          </div>
        </div>
      )}

      {/* Connection Tab */}
      {activeTab === 'connection' && (
        <div className="space-y-4">
          {serverType === 'stdio' ? (
            <>
              <div>
                <Label htmlFor="command">{localize('com_ui_command')} *</Label>
                <Input
                  id="command"
                  {...register('config.command', { 
                    required: serverType === 'stdio' ? localize('com_ui_command_required') : false 
                  })}
                  placeholder="node"
                />
                {errors.config?.command && (
                  <p className="mt-1 text-sm text-red-600">{errors.config.command.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="args">{localize('com_ui_arguments')}</Label>
                <Input
                  id="args"
                  {...register('config.args')}
                  placeholder="server.js --port 3000"
                />
                <p className="mt-1 text-sm text-text-secondary">
                  {localize('com_ui_args_help')}
                </p>
              </div>

              <div>
                <Label htmlFor="env">{localize('com_ui_environment_variables')}</Label>
                <Textarea
                  id="env"
                  {...register('config.env')}
                  placeholder='{"NODE_ENV": "production", "PORT": "3000"}'
                  rows={4}
                />
                <p className="mt-1 text-sm text-text-secondary">
                  {localize('com_ui_env_help')}
                </p>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="url">{localize('com_ui_url')} *</Label>
                <Input
                  id="url"
                  {...register('config.url', { 
                    required: serverType !== 'stdio' ? localize('com_ui_url_required') : false 
                  })}
                  placeholder={
                    serverType === 'websocket' 
                      ? 'wss://example.com/mcp' 
                      : 'https://example.com/mcp'
                  }
                />
                {errors.config?.url && (
                  <p className="mt-1 text-sm text-red-600">{errors.config.url.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="headers">{localize('com_ui_headers')}</Label>
                <Textarea
                  id="headers"
                  {...register('config.headers')}
                  placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                  rows={4}
                />
                <p className="mt-1 text-sm text-text-secondary">
                  {localize('com_ui_headers_help')}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* OAuth Tab */}
      {activeTab === 'oauth' && (
        <div className="space-y-4">
          <div className="text-sm text-text-secondary mb-4">
            {localize('com_ui_oauth_help')}
          </div>

          <div>
            <Label htmlFor="authorization_url">{localize('com_ui_authorization_url')}</Label>
            <Input
              id="authorization_url"
              {...register('config.oauth.authorization_url')}
              placeholder="https://example.com/oauth/authorize"
            />
          </div>

          <div>
            <Label htmlFor="token_url">{localize('com_ui_token_url')}</Label>
            <Input
              id="token_url"
              {...register('config.oauth.token_url')}
              placeholder="https://example.com/oauth/token"
            />
          </div>

          <div>
            <Label htmlFor="client_id">{localize('com_ui_client_id')}</Label>
            <Input
              id="client_id"
              {...register('config.oauth.client_id')}
              placeholder="your-client-id"
            />
          </div>

          <div>
            <Label htmlFor="client_secret">{localize('com_ui_client_secret')}</Label>
            <Input
              id="client_secret"
              type="password"
              {...register('config.oauth.client_secret')}
              placeholder="your-client-secret"
            />
          </div>

          <div>
            <Label htmlFor="scope">{localize('com_ui_scope')}</Label>
            <Input
              id="scope"
              {...register('config.oauth.scope')}
              placeholder="read write"
            />
          </div>

          <div>
            <Label htmlFor="redirect_uri">{localize('com_ui_redirect_uri')}</Label>
            <Input
              id="redirect_uri"
              {...register('config.oauth.redirect_uri')}
              placeholder="https://your-app.com/oauth/callback"
            />
          </div>

          <div>
            <Label htmlFor="token_exchange_method">{localize('com_ui_token_exchange_method')}</Label>
            <Select
              value={watch('config.oauth.token_exchange_method')}
              onValueChange={(value) => setValue('config.oauth.token_exchange_method', value)}
            >
              <option value="DefaultPost">Default POST</option>
              <option value="BasicAuthHeader">Basic Auth Header</option>
            </Select>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div>
            <Label htmlFor="timeout">{localize('com_ui_timeout')} (ms)</Label>
            <Input
              id="timeout"
              type="number"
              {...register('config.timeout', { valueAsNumber: true })}
              placeholder="30000"
            />
          </div>

          <div>
            <Label htmlFor="initTimeout">{localize('com_ui_init_timeout')} (ms)</Label>
            <Input
              id="initTimeout"
              type="number"
              {...register('config.initTimeout', { valueAsNumber: true })}
              placeholder="10000"
            />
          </div>

          <div>
            <Label htmlFor="iconPath">{localize('com_ui_icon_path')}</Label>
            <Input
              id="iconPath"
              {...register('config.iconPath')}
              placeholder="/path/to/icon.png"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="chatMenu"
              {...register('config.chatMenu')}
              className="rounded border-border-medium"
            />
            <Label htmlFor="chatMenu">{localize('com_ui_show_in_chat_menu')}</Label>
          </div>

          <div>
            <Label htmlFor="serverInstructions">{localize('com_ui_server_instructions')}</Label>
            <Textarea
              id="serverInstructions"
              {...register('config.serverInstructions')}
              placeholder={localize('com_ui_server_instructions_placeholder')}
              rows={4}
            />
          </div>
        </div>
      )}

      {/* Test Result */}
      {testResult && (
        <div className={cn(
          'rounded-md p-3 text-sm',
          testResult.success
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        )}>
          <div className="font-medium">
            {testResult.success ? localize('com_ui_test_success') : localize('com_ui_test_failed')}
          </div>
          {testResult.error && (
            <div className="mt-1">{testResult.error}</div>
          )}
          {testResult.tools && testResult.tools.length > 0 && (
            <div className="mt-1">
              {localize('com_ui_tools_found')}: {testResult.tools.length}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4 border-t border-border-light">
        <div>
          {initialData && (
            <Button
              type="button"
              variant="outline"
              onClick={handleTestConnection}
              disabled={testMutation.isPending}
              className="flex items-center gap-2"
            >
              {testMutation.isPending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <TestTube size={16} />
              )}
              {localize('com_ui_test_connection')}
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            {localize('com_ui_cancel')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}