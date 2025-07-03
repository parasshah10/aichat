export function isCodeFile(filename: string | undefined, contentType: string | undefined): boolean {
  if (!filename) return false;

  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs',
    '.html', '.css', '.json', '.yaml', '.yml', '.sh', '.bash', '.php',
    '.rb', '.go', '.rs', '.swift', '.kt', '.scala', '.pl', '.pm', '.md',
    '.xml', '.sql', '.r', '.m', '.h', '.hpp', '.cc', '.cxx', '.txt'
  ];

  if (codeExtensions.some((ext) => filename.toLowerCase().endsWith(ext))) {
    return true;
  }

  if (contentType && contentType.startsWith('text/')) {
    return true;
  }

  return false;
}

export function getLanguageFromFilename(filename: string | undefined): string {
  if (!filename) return 'plaintext';
  const extension = filename.split('.').pop()?.toLowerCase();
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    cs: 'csharp',
    html: 'html',
    css: 'css',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    sh: 'shell',
    bash: 'bash',
    php: 'php',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    swift: 'swift',
    kt: 'kotlin',
    scala: 'scala',
    pl: 'perl',
    pm: 'perl',
    md: 'markdown',
    xml: 'xml',
    sql: 'sql',
    r: 'r',
    m: 'matlab',
    h: 'c',
    hpp: 'cpp',
    cc: 'cpp',
    cxx: 'cpp',
    txt: 'plaintext'
  };
  return langMap[extension || ''] || 'plaintext';
}

export function canViewFile(filename: string | undefined, contentType: string | undefined, filepath: string | undefined): boolean {
  if (!filepath) return false;
  
  return (
    contentType?.startsWith('image/') ||
    contentType?.startsWith('text/') ||
    contentType === 'application/pdf' ||
    isCodeFile(filename, contentType)
  );
}

export function isMarkdownFile(filename: string | undefined, contentType: string | undefined): boolean {
  return (
    filename?.toLowerCase().endsWith('.md') ||
    contentType === 'text/markdown'
  );
}