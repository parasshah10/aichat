import filenamify from 'filenamify';
import { useEffect, useState, useMemo, useCallback } from 'react';
import type { TConversation } from 'librechat-data-provider';
import { OGDialog, Button, Input, Label, Checkbox, Dropdown } from '~/components/ui';
import OGDialogTemplate from '~/components/ui/OGDialogTemplate';
import { useLocalize, useExportConversation, useCopyConversation } from '~/hooks';
import { useScreenshot } from '~/hooks/ScreenshotContext';

const TYPE_OPTIONS = [
  { value: 'screenshot', label: 'screenshot (.png)' },
  { value: 'text', label: 'text (.txt)' },
  { value: 'markdown', label: 'markdown (.md)' },
  { value: 'json', label: 'json (.json)' },
  { value: 'csv', label: 'csv (.csv)' },
];

export default function ExportModal({
  open,
  onOpenChange,
  conversation,
  triggerRef,
  children,
}: {
  open: boolean;
  conversation: TConversation | null;
  onOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
  triggerRef?: React.RefObject<HTMLButtonElement>;
  children?: React.ReactNode;
}) {
  const localize = useLocalize();
  const { captureScreenshot } = useScreenshot();

  const [filename, setFileName] = useState('');
  const [type, setType] = useState<string>('markdown');
  const [isCopying, setIsCopying] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  const [includeOptions, setIncludeOptions] = useState<boolean | 'indeterminate'>(true);
  const [exportBranches, setExportBranches] = useState<boolean | 'indeterminate'>(false);
  const [recursive, setRecursive] = useState<boolean | 'indeterminate'>(true);

  useEffect(() => {
    if (!open && triggerRef && triggerRef.current) {
      triggerRef.current.focus();
    }
  }, [open, triggerRef]);

  useEffect(() => {
    setFileName(filenamify(String(conversation?.title ?? 'file')));
    setType('markdown');
    setIncludeOptions(true);
    setExportBranches(false);
    setRecursive(true);
    setJustCopied(false);
    setIsCopying(false);
  }, [conversation?.title, open]);

  const handleTypeChange = useCallback((newType: string) => {
    const branches = newType === 'json' || newType === 'csv' || newType === 'webpage';
    const options = newType !== 'csv' && newType !== 'screenshot';
    setExportBranches(branches);
    setIncludeOptions(options);
    setType(newType);
    setJustCopied(false);
    setIsCopying(false);
  }, []);

  const exportBranchesSupport = useMemo(
    () => type === 'json' || type === 'csv' || type === 'webpage',
    [type],
  );
  const exportOptionsSupport = useMemo(() => type !== 'csv' && type !== 'screenshot', [type]);

  const { exportConversation } = useExportConversation({
    conversation,
    filename,
    type,
    includeOptions,
    exportBranches,
    recursive,
  });

  const { copyConversation } = useCopyConversation({
    conversation,
    type,
    includeOptions,
    exportBranches,
    recursive,
  });

  const copyScreenshotToClipboard = async () => {
    try {
      // Check if clipboard API supports images
      if (!navigator.clipboard || !navigator.clipboard.write) {
        throw new Error('Clipboard API not supported');
      }

      const dataUrl = await captureScreenshot();
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // Check if ClipboardItem is supported
      if (!window.ClipboardItem) {
        throw new Error('ClipboardItem not supported');
      }
      
      // Copy image to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      return true;
    } catch (error) {
      console.error('Failed to copy screenshot to clipboard:', error);
      // For unsupported browsers, we could fall back to showing a message
      // or automatically triggering a download instead
      throw new Error('Image copying not supported in this browser. Please use Export instead.');
    }
  };

  const handleCopy = async () => {
    setIsCopying(true);
    setJustCopied(false);
    try {
      if (type === 'screenshot') {
        await copyScreenshotToClipboard();
      } else {
        await copyConversation();
      }
      setJustCopied(true);
      // Show copied state briefly, then close modal
      setTimeout(() => {
        onOpenChange(false);
      }, 0); // Set to 0 for instant close, increase later if needed
    } catch (error) {
      console.error('Failed to copy:', error);
      // You might want to show a toast notification here
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange} triggerRef={triggerRef}>
      {children}
      <OGDialogTemplate
        title={localize('com_nav_export_conversation')}
        className="max-w-full sm:max-w-2xl"
        main={
          <div className="flex w-full flex-col items-center gap-6">
            <div className="grid w-full gap-6 sm:grid-cols-2">
              <div className="col-span-1 flex flex-col items-start justify-start gap-2">
                <Label htmlFor="filename" className="text-left text-sm font-medium">
                  {localize('com_nav_export_filename')}
                </Label>
                <Input
                  id="filename"
                  value={filename}
                  onChange={(e) => setFileName(filenamify(e.target.value || ''))}
                  placeholder={localize('com_nav_export_filename_placeholder')}
                />
              </div>
              <div className="col-span-1 flex w-full flex-col items-start justify-start gap-2">
                <Label htmlFor="type" className="text-left text-sm font-medium">
                  {localize('com_nav_export_type')}
                </Label>
                <Dropdown
                  value={type}
                  onChange={handleTypeChange}
                  options={TYPE_OPTIONS}
                  className="z-50"
                  portal={false}
                />
              </div>
            </div>
            <div className="grid w-full gap-6 sm:grid-cols-2">
              <div className="col-span-1 flex flex-col items-start justify-start gap-2">
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="includeOptions" className="text-left text-sm font-medium">
                    {localize('com_nav_export_include_endpoint_options')}
                  </Label>
                  <div className="flex h-[40px] w-full items-center space-x-3">
                    <Checkbox
                      id="includeOptions"
                      disabled={!exportOptionsSupport}
                      checked={includeOptions}
                      onCheckedChange={setIncludeOptions}
                    />
                    <label
                      htmlFor="includeOptions"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-50"
                    >
                      {exportOptionsSupport
                        ? localize('com_nav_enabled')
                        : localize('com_nav_not_supported')}
                    </label>
                  </div>
                </div>
              </div>
              <div className="grid w-full items-center gap-2">
                <Label htmlFor="exportBranches" className="text-left text-sm font-medium">
                  {localize('com_nav_export_all_message_branches')}
                </Label>
                <div className="flex h-[40px] w-full items-center space-x-3">
                  <Checkbox
                    id="exportBranches"
                    disabled={!exportBranchesSupport}
                    checked={exportBranches}
                    onCheckedChange={setExportBranches}
                  />
                  <label
                    htmlFor="exportBranches"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-50"
                  >
                    {exportBranchesSupport
                      ? localize('com_nav_enabled')
                      : localize('com_nav_not_supported')}
                  </label>
                </div>
              </div>
              {type === 'json' ? (
                <div className="grid w-full items-center gap-2">
                  <Label htmlFor="recursive" className="text-left text-sm font-medium">
                    {localize('com_nav_export_recursive_or_sequential')}
                  </Label>
                  <div className="flex h-[40px] w-full items-center space-x-3">
                    <Checkbox id="recursive" checked={recursive} onCheckedChange={setRecursive} />
                    <label
                      htmlFor="recursive"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-50"
                    >
                      {localize('com_nav_export_recursive')}
                    </label>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        }
        buttons={
          <>
            <Button onClick={exportConversation} variant="outline">
              {localize('com_endpoint_export')}
            </Button>
            <Button 
              onClick={handleCopy} 
              variant="submit"
              disabled={isCopying || justCopied}
            >
              {justCopied 
                ? localize('com_ui_copied_to_clipboard') 
                : isCopying 
                  ? 'Copying...' 
                  : localize('com_ui_copy_to_clipboard')
              }
            </Button>
          </>
        }
        selection={undefined}
      />
    </OGDialog>
  );
}
