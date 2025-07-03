import { memo, useState, useCallback, useEffect, useMemo } from 'react';
import { Download, X, Copy, Check } from 'lucide-react';
import type { TAttachment, TFile } from 'librechat-data-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/Dialog';
import { Button } from '~/components/ui/Button';
import { useToastContext } from '~/Providers';
import { useAuthContext } from '~/hooks/AuthContext';
import { request } from 'librechat-data-provider';
import { cn } from '~/utils';
import { isCodeFile, getLanguageFromFilename, isMarkdownFile } from '~/utils/fileViewer';
import MonacoViewer from './MonacoViewer';
import Markdown from './Markdown';

// File content cache to avoid re-fetching
const fileContentCache = new Map<string, string>();

interface FileViewerProps {
  attachment: Partial<TAttachment | TFile>;
  children: React.ReactNode;
}

export const FileViewer = memo(({ attachment, children }: FileViewerProps) => {
  const [textContent, setTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const { showToast } = useToastContext();
  const { user } = useAuthContext();
  const filename = attachment.filename || 'Unknown file';
  const filepath = attachment.filepath || '';
  const type = attachment.type || '';

  const isImage = type.startsWith('image/');
  const isPdf = type === 'application/pdf';
  const isMarkdown = isMarkdownFile(filename, type);
  const isTextOrCode = type.startsWith('text/') || isCodeFile(filename, type);

  // Extract file ID and use current user's ID for proper file download
  const fileId = attachment.file_id || attachment._id || attachment.id;
  const currentUserId = user?.id;
  const attachmentUserId = attachment.user || attachment.userId;
  
  console.log('User IDs comparison:', { 
    currentUserId, 
    attachmentUserId, 
    match: currentUserId === attachmentUserId 
  });
  
  // Create cache key for this file
  const cacheKey = useMemo(() => `${currentUserId}-${fileId}`, [currentUserId, fileId]);

  const fetchFileContent = useCallback(async () => {
    if (!isTextOrCode || !fileId || !currentUserId) {
      return;
    }

    // Check cache first
    const cachedContent = fileContentCache.get(cacheKey);
    if (cachedContent) {
      setTextContent(cachedContent);
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Make direct authenticated request
      const downloadUrl = `/api/files/download/${currentUserId}/${fileId}`;
      
      const response = await request.getResponse(downloadUrl, {
        responseType: 'text'
      });
      
      if (response.status === 200) {
        // Cache the content
        fileContentCache.set(cacheKey, response.data);
        setTextContent(response.data);
        return;
      }
      
      throw new Error(`Request failed with status ${response.status}`);
      
    } catch (err) {
      console.error('File fetch failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load file content';
      setError(errorMessage);
      showToast({
        status: 'error',
        message: `Failed to load file: ${errorMessage}`,
      });
    } finally {
      setIsLoading(false);
    }
  }, [isTextOrCode, fileId, currentUserId, cacheKey, showToast]);

  // Auto-load content when dialog opens
  useEffect(() => {
    if (isTextOrCode && fileId && currentUserId) {
      fetchFileContent();
    }
  }, [fetchFileContent, isTextOrCode, fileId, currentUserId]);

  const copyToClipboard = useCallback(async () => {
    if (!textContent) return;
    
    try {
      await navigator.clipboard.writeText(textContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  }, [textContent]);

  const downloadFile = useCallback(() => {
    if (!textContent || !filename) return;
    
    // Create blob with actual file content
    const blob = new Blob([textContent], { type: type || 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    
    // Create download link
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, [textContent, filename, type]);

  const lang = getLanguageFromFilename(filename);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="w-[90vw] !max-w-6xl h-[90vh] flex flex-col p-0 gap-0"
        disableScroll={true}
      >
        <DialogHeader className="py-1 px-4 flex-row items-center border-b flex-shrink-0 gap-2">
          <div className="flex flex-col min-w-0 flex-1">
            <DialogTitle className="truncate text-sm font-semibold m-0 leading-tight">
              {filename}
            </DialogTitle>
            <div className="truncate text-xs text-text-secondary m-0 leading-tight">
              {type || 'Unknown type'}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isTextOrCode && textContent && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={copyToClipboard}
                title="Copy content"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={downloadFile}
              title="Download file"
              disabled={!textContent}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className={cn(
          "flex-1 min-h-0 overflow-hidden",
          isImage && "flex items-center justify-center"
        )}>
          {isImage ? (
            <div className="flex items-center justify-center w-full h-full p-4">
              <img
                src={filepath}
                alt={filename}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(90vh - 100px)' }}
              />
            </div>
          ) : isPdf ? (
            <iframe
              src={filepath}
              className="w-full h-full border-0"
              title={filename}
            />
          ) : isTextOrCode ? (
            <div className="w-full h-full flex flex-col">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-text-secondary">Loading file content...</div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-red-500">{error}</div>
                </div>
              ) : textContent ? (
                isMarkdown ? (
                  <div className="w-full h-full overflow-auto p-4">
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <Markdown content={textContent} />
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full">
                    <MonacoViewer 
                      code={textContent} 
                      language={lang}
                      readOnly={true}
                      editorProps={{
                        options: {
                          renderLineHighlight: "none",
                          selectionHighlight: false,
                          occurrencesHighlight: false,
                        },
                        onMount: (editor: any) => {
                          setTimeout(() => {
                            editor.setSelection({
                              startLineNumber: 1,
                              startColumn: 1,
                              endLineNumber: 1,
                              endColumn: 1,
                            });
                            editor.blur();
                          }, 0);
                        },
                      }}
                    />
                  </div>
                )
              ) : null}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-text-secondary">
                Preview not available for this file type.
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

FileViewer.displayName = 'FileViewer';

export default FileViewer;