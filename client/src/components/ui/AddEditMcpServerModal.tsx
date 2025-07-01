import React, { useEffect, useState } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
  Checkbox,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from '~/components/ui';
import { useLocalize } from '~/hooks';
import { useCreateMcpConfig, useUpdateMcpConfig, McpServerConfig } from '~/data-provider';
import { MCPOptionsSchema } from 'librechat-data-provider'; // Zod schema for validation
import { ChevronDownIcon, ChevronUpIcon, PlusCircleIcon, Trash2Icon } from 'lucide-react';

// Define a Zod schema for form validation based on MCPOptionsSchema and additional UI needs
// This needs to be adapted carefully from the Mongoose schema and MCPOptions
const formSchema = MCPOptionsSchema.extend({
  _id: z.string().optional(), // For editing
  name: z.string().min(1, 'Server name is required.'),
  // Ensure `type` is one of the allowed values for the UI
  type: z.enum(['stdio', 'sse', 'streamable-http'], {
    required_error: 'Server type is required.',
  }),
  enabled: z.boolean().optional().default(true),
  // Make args an array of objects for easier management in react-hook-form
  args: z.array(z.object({ value: z.string() })).optional(),
  // Similarly for env and headers
  env: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  headers: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'stdio') {
    if (!data.command || data.command.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Command is required for STDIO type.',
        path: ['command'],
      });
    }
  } else if (['sse', 'streamable-http'].includes(data.type)) {
    if (!data.url || data.url.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Server URL is required for this type.',
        path: ['url'],
      });
    }
    try {
      if (data.url) new URL(data.url);
    } catch (e) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid URL format.',
        path: ['url'],
      });
    }
  }
});

export type McpServerFormValues = z.infer<typeof formSchema>;

interface AddEditMcpServerModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  serverToEdit?: McpServerConfig | null;
  onSuccess?: () => void;
}

const AddEditMcpServerModal: React.FC<AddEditMcpServerModalProps> = ({
  isOpen,
  onOpenChange,
  serverToEdit,
  onSuccess,
}) => {
  const localize = useLocalize();
  const createMutation = useCreateMcpConfig();
  const updateMutation = useUpdateMcpConfig();

  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const defaultValues: Partial<McpServerFormValues> = {
    name: '',
    type: 'stdio',
    command: '',
    args: [],
    env: [],
    url: '',
    headers: [],
    iconPath: '',
    timeout: 60000, // Default from example
    initTimeout: undefined,
    chatMenu: true,
    serverInstructions: undefined,
    enabled: true,
    // oauth and customUserVars are more complex and might need separate handling or simplification for this form
  };

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<McpServerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const watchedType = watch('type');

  // Field array for arguments
  const { fields: argsFields, append: appendArg, remove: removeArg } = useFieldArray({ control, name: 'args' });
  // Field array for environment variables
  const { fields: envFields, append: appendEnv, remove: removeEnv } = useFieldArray({ control, name: 'env' });
  // Field array for headers
  const { fields: headerFields, append: appendHeader, remove: removeHeader } = useFieldArray({ control, name: 'headers' });


  useEffect(() => {
    if (serverToEdit) {
      const editValues: Partial<McpServerFormValues> = {
        ...serverToEdit,
        // Convert args from string[] to {value: string}[]
        args: serverToEdit.args?.map(arg => ({ value: arg })) ?? [],
        // Convert env/headers from Map to {key: string, value: string}[]
        env: serverToEdit.env ? Object.entries(serverToEdit.env).map(([key, value]) => ({ key, value: String(value) })) : [],
        headers: serverToEdit.headers ? Object.entries(serverToEdit.headers).map(([key, value]) => ({ key, value: String(value) })) : [],
      };
      reset(editValues);
    } else {
      reset(defaultValues);
    }
  }, [serverToEdit, reset]);

  const onSubmit = async (data: McpServerFormValues) => {
    const submissionData: Partial<McpServerConfig> = {
      ...data,
      args: data.args?.map(arg => arg.value).filter(v => v.trim() !== ''),
      env: data.env?.reduce((acc, curr) => {
        if (curr.key.trim() !== '') acc[curr.key.trim()] = curr.value;
        return acc;
      }, {} as Record<string, string>),
      headers: data.headers?.reduce((acc, curr) => {
        if (curr.key.trim() !== '') acc[curr.key.trim()] = curr.value;
        return acc;
      }, {} as Record<string, string>),
    };

    try {
      if (serverToEdit?._id) {
        await updateMutation.mutateAsync({ ...submissionData, _id: serverToEdit._id } as McpServerConfig & { _id: string });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _id, ...createData } = submissionData;
        await createMutation.mutateAsync(createData as Omit<McpServerConfig, '_id'>);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to save MCP server:', error);
      // Error will be handled by react-query's onError, which can show a toast
    }
  };

  const title = serverToEdit
    ? localize('com_settings_servers_edit_title', serverToEdit.name)
    : localize('com_settings_servers_add_title', 'Add Server');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 overflow-y-auto p-2" style={{maxHeight: '70vh'}}>
          {/* Server Name */}
          <div>
            <Label htmlFor="name">{localize('com_settings_servers_name')}</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>

          {/* Server Type */}
          <div>
            <Label>{localize('com_settings_servers_type')}</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                  {(['stdio', 'sse', 'streamable-http'] as const).map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <RadioGroupItem value={type} id={`type-${type}`} />
                      <Label htmlFor={`type-${type}`}>{type.toUpperCase()}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
            {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
          </div>

          {/* Enabled Checkbox */}
          <div className="flex items-center space-x-2">
            <Controller
              name="enabled"
              control={control}
              render={({ field }) => (
                <Checkbox id="enabled" checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label htmlFor="enabled" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {localize('com_settings_servers_enabled', 'Enabled')}
            </Label>
          </div>


          {/* STDIO Specific Fields */}
          {watchedType === 'stdio' && (
            <>
              <div>
                <Label htmlFor="command">{localize('com_settings_servers_command')}</Label>
                <Input id="command" {...register('command')} />
                {errors.command && <p className="text-sm text-red-500">{errors.command.message}</p>}
              </div>
              <div>
                <Label>{localize('com_settings_servers_args')}</Label>
                {argsFields.map((field, index) => (
                  <div key={field.id} className="mb-2 flex items-center gap-2">
                    <Input {...register(`args.${index}.value`)} placeholder={`Argument ${index + 1}`} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeArg(index)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendArg({ value: '' })}>
                  <PlusCircleIcon className="mr-2 h-4 w-4" />{localize('com_ui_add_argument')}
                </Button>
              </div>
              <div>
                <Label>{localize('com_settings_servers_env_vars')}</Label>
                {envFields.map((field, index) => (
                  <div key={field.id} className="mb-2 flex items-center gap-2">
                    <Input {...register(`env.${index}.key`)} placeholder={localize('com_ui_key')} className="w-1/2" />
                    <Input {...register(`env.${index}.value`)} placeholder={localize('com_ui_value')} className="w-1/2" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEnv(index)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendEnv({ key: '', value: '' })}>
                   <PlusCircleIcon className="mr-2 h-4 w-4" />{localize('com_ui_add_variable')}
                </Button>
              </div>
            </>
          )}

          {/* SSE & Streamable HTTP Specific Fields */}
          {(watchedType === 'sse' || watchedType === 'streamable-http') && (
            <>
              <div>
                <Label htmlFor="url">{localize('com_settings_servers_url')}</Label>
                <Input id="url" {...register('url')} />
                {errors.url && <p className="text-sm text-red-500">{errors.url.message}</p>}
              </div>
              <div>
                <Label>{localize('com_settings_servers_headers')}</Label>
                {headerFields.map((field, index) => (
                  <div key={field.id} className="mb-2 flex items-center gap-2">
                    <Input {...register(`headers.${index}.key`)} placeholder={localize('com_ui_key')} className="w-1/2" />
                    <Input {...register(`headers.${index}.value`)} placeholder={localize('com_ui_value')} className="w-1/2" />
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeHeader(index)}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendHeader({ key: '', value: '' })}>
                  <PlusCircleIcon className="mr-2 h-4 w-4" />{localize('com_ui_add_header')}
                </Button>
              </div>
            </>
          )}

          {/* Collapsible Configuration Section */}
          <Collapsible open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="link" className="flex items-center p-0">
                {localize('com_settings_servers_advanced_config')}
                {isConfigOpen ? <ChevronUpIcon className="ml-1 h-4 w-4" /> : <ChevronDownIcon className="ml-1 h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              <div>
                <Label htmlFor="timeout">{localize('com_settings_servers_req_timeout', 'Request Timeout (ms)')}</Label>
                <Input id="timeout" type="number" {...register('timeout', { valueAsNumber: true })} />
                {errors.timeout && <p className="text-sm text-red-500">{errors.timeout.message}</p>}
              </div>
              {/* Add initTimeout and other advanced fields here if MCPOptionsSchema supports them directly for validation,
                  otherwise, they might need to be handled as part of a general `config` object or similar.
                  For now, `initTimeout` is part of the base `MCPOptions` so it can be added.
              */}
              <div>
                <Label htmlFor="initTimeout">{localize('com_settings_servers_init_timeout', 'Initialisation Timeout (ms)')}</Label>
                <Input id="initTimeout" type="number" {...register('initTimeout', { valueAsNumber: true })} />
                {errors.initTimeout && <p className="text-sm text-red-500">{errors.initTimeout.message}</p>}
              </div>
              {/* serverInstructions and chatMenu are also part of base options */}
               <div className="flex items-center space-x-2">
                 <Controller
                    name="chatMenu"
                    control={control}
                    render={({ field }) => (
                        <Checkbox id="chatMenu" checked={field.value} onCheckedChange={field.onChange} />
                    )}
                    />
                <Label htmlFor="chatMenu">{localize('com_settings_servers_chat_menu', 'Show in Chat Menu')}</Label>
              </div>
              {/* `serverInstructions` can be boolean or string. Needs careful UI. For now, a textarea. */}
              {/* <div>
                <Label htmlFor="serverInstructions">Server Instructions (true/false or text)</Label>
                <Input id="serverInstructions" {...register('serverInstructions')} />
              </div> */}
            </CollapsibleContent>
          </Collapsible>

          {/* OAuth and customUserVars are currently omitted for simplicity in this initial modal.
              They might require a more dedicated UI or be part of an "Advanced" section if too complex.
           */}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                {localize('com_ui_cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? localize('com_ui_saving') : (serverToEdit ? localize('com_ui_save_changes') : localize('com_ui_add_server'))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddEditMcpServerModal;
