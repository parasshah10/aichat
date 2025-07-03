import { memo, useMemo, useContext } from 'react';
import { cn } from '~/utils';
import { ThemeContext } from '~/hooks';

// Import Monaco Editor
import Editor from '@monaco-editor/react';

// Preload Monaco Editor to avoid loading delays
import { loader } from '@monaco-editor/react';

// Configure Monaco loader for better performance
loader.config({
  paths: {
    vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs'
  }
});

// Preload Monaco
loader.init();

interface MonacoViewerProps {
  code: string;
  language?: string;
  className?: string;
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: boolean;
  editorProps?: any;
}

export const MonacoViewer = memo(({ 
  code, 
  language = 'plaintext', 
  className,
  readOnly = true,
  minimap,
  lineNumbers = true,
  editorProps
}: MonacoViewerProps) => {
  const { theme } = useContext(ThemeContext);
  
  // Determine if minimap should be enabled based on code size
  const shouldEnableMinimap = useMemo(() => {
    if (minimap !== undefined) return minimap;
    const lineCount = (code.match(/\n/g) || []).length + 1;
    return lineCount > 200 || code.length > 10000;
  }, [code, minimap]);

  const editorTheme = useMemo(() => {
    return theme === 'dark' ? 'vs-dark' : 'light';
  }, [theme]);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    // Default options
    const defaultOptions = {
      minimap: { enabled: shouldEnableMinimap },
      lineNumbers: lineNumbers ? "on" : "off",
      folding: true,
      readOnly: readOnly,
      scrollBeyondLastLine: false,
      wordWrap: "on",
      automaticLayout: true,
    };
    
    editor.updateOptions({
      ...defaultOptions,
      ...editorProps?.options,
    });

    // Call the custom onMount handler if provided
    if (editorProps?.onMount) {
      editorProps.onMount(editor, monaco);
    }
  };

  // Use Monaco Editor
  return (
    <div className={cn("w-full h-full", className)}>
      <Editor
        height="100%"
        language={language}
        value={code}
        theme={editorTheme}
        onMount={handleEditorDidMount}
        loading={<div className="flex items-center justify-center h-full">Loading Monaco Editor...</div>}
        options={{
          readOnly: readOnly,
          minimap: { enabled: shouldEnableMinimap },
          scrollBeyondLastLine: false,
          wordWrap: "on",
          folding: true,
          lineNumbers: lineNumbers ? "on" : "off",
          automaticLayout: true,
          ...editorProps?.options,
        }}
      />
    </div>
  );
});

MonacoViewer.displayName = 'MonacoViewer';

export default MonacoViewer;