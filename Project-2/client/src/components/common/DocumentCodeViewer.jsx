import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Code, 
  ExternalLink, 
  Download, 
  Copy, 
  Check, 
  Maximize2, 
  Eye, 
  Paperclip, 
  FileCode,
  Github,
  Globe,
  Sun,
  Moon,
  WrapText
} from 'lucide-react';
import Badge from './Badge';

// Helper to detect language
function detectLanguage(code = '') {
  const sqlKeywords = /\b(SELECT|FROM|WHERE|INSERT|INTO|UPDATE|SET|DELETE|CREATE|TABLE|ALTER|DROP|JOIN|PRIMARY KEY|FOREIGN KEY|CHECK|VALUES|GROUP BY|ORDER BY)\b/i;
  const pythonKeywords = /\b(def|import|from|class|elif|self|print|None|True|False|lambda)\b/;
  const jsKeywords = /\b(const|let|var|function|return|async|await|console\.log|export|import|useEffect|useState)\b/;
  const htmlKeywords = /<(!DOCTYPE|html|head|body|div|span|h[1-6]|p|script|style)/i;

  if (sqlKeywords.test(code)) return 'SQL';
  if (pythonKeywords.test(code)) return 'Python';
  if (htmlKeywords.test(code)) return 'HTML';
  if (jsKeywords.test(code)) return 'JavaScript';
  return 'Code';
}

// Tokenizer for light syntax highlighting
function highlightCode(code, language) {
  if (!code) return [];
  const lines = code.split('\n');

  return lines.map((line, lineIndex) => {
    // Regex for common tokens
    const tokens = [];
    let remaining = line;
    let pos = 0;

    // Comments
    const commentMatch = remaining.match(/(--.*|\/\/.*|#.*|\/\*.*\*\/)/);
    let commentPart = null;
    let commentStart = -1;

    if (commentMatch) {
      commentPart = commentMatch[0];
      commentStart = remaining.indexOf(commentPart);
    }

    const codeToTokenize = commentStart >= 0 ? remaining.slice(0, commentStart) : remaining;

    // Token pattern
    const tokenRegex = /(".*?"|'.*?'|`.*?`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b|[^\s\w'"`]+|\s+)/g;
    let match;

    const sqlKeywords = new Set([
      'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'INSERT', 'INTO', 'UPDATE',
      'SET', 'DELETE', 'CREATE', 'TABLE', 'ALTER', 'DROP', 'JOIN', 'LEFT', 'RIGHT',
      'INNER', 'OUTER', 'ON', 'AS', 'BY', 'GROUP', 'ORDER', 'HAVING', 'LIMIT',
      'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CHECK', 'DEFAULT', 'NULL', 'UNIQUE',
      'VALUES', 'DISTINCT', 'COUNT', 'AVG', 'SUM', 'MAX', 'MIN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
    ]);

    const generalKeywords = new Set([
      'function', 'return', 'const', 'let', 'var', 'if', 'else', 'for', 'while',
      'do', 'switch', 'case', 'break', 'continue', 'new', 'try', 'catch', 'finally',
      'throw', 'class', 'extends', 'import', 'export', 'default', 'async', 'await',
      'def', 'elif', 'self', 'lambda', 'with', 'pass', 'yield', 'in', 'is', 'None',
      'True', 'False', 'public', 'private', 'protected', 'static', 'void', 'int', 'float'
    ]);

    while ((match = tokenRegex.exec(codeToTokenize)) !== null) {
      const text = match[0];
      let type = 'plain';

      if (/^["'`]/.test(text)) {
        type = 'string';
      } else if (/^\d+/.test(text)) {
        type = 'number';
      } else if (language === 'SQL' && sqlKeywords.has(text.toUpperCase())) {
        type = 'keyword';
      } else if (generalKeywords.has(text)) {
        type = 'keyword';
      } else if (/^[A-Z][A-Za-z0-9_]*$/.test(text) && language !== 'SQL') {
        type = 'type';
      } else if (/[{}()[\].,;]/.test(text)) {
        type = 'punctuation';
      } else if (/^[=+\-*/%&|^!<>]+$/.test(text)) {
        type = 'operator';
      }

      tokens.push({ text, type });
    }

    if (commentPart) {
      tokens.push({ text: commentPart, type: 'comment' });
    }

    return { lineNumber: lineIndex + 1, tokens };
  });
}

export default function DocumentCodeViewer({ 
  content = '', 
  studentName = '', 
  assignmentName = '',
  maxHeight = 'max-h-[500px]'
}) {
  const [activeTab, setActiveTab] = useState('auto'); // 'auto', 'code', 'file', 'link'
  const [copied, setCopied] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);

  // Parse submission content
  const parsedData = useMemo(() => {
    let fileUrl = null;
    let fileName = null;
    let externalUrl = null;
    let textBody = content || '';

    // Match uploaded files: /uploads/timestamp_filename
    const fileMatch = textBody.match(/\/uploads\/[^\s)]+/i);
    if (fileMatch) {
      fileUrl = fileMatch[0];
      const nameMatch = textBody.match(/Attached File: [^\s)]+ \(([^)]+)\)/i);
      fileName = nameMatch ? nameMatch[1] : fileUrl.split('/').pop();
    }

    // Match Repository or external solution URL
    const urlMatch = textBody.match(/https?:\/\/[^\s)]+/i);
    if (urlMatch && !urlMatch[0].includes('/uploads/')) {
      externalUrl = urlMatch[0];
    }

    // Clean textBody to isolate raw code/notes
    let cleanNotes = textBody
      .replace(/Attached File: [^\n]+/gi, '')
      .replace(/Repository\/Solution URL: [^\n]+/gi, '')
      .replace(/\[Attached File: [^\]]+\]/gi, '')
      .trim();

    const isPdf = fileUrl ? /\.pdf$/i.test(fileUrl) : false;
    const isImage = fileUrl ? /\.(png|jpe?g|webp|gif|svg)$/i.test(fileUrl) : false;
    const isCodeFile = fileUrl ? /\.(sql|py|js|jsx|ts|tsx|java|cpp|c|html|css|json)$/i.test(fileUrl) : false;

    const detectedLang = detectLanguage(cleanNotes);
    const highlighted = highlightCode(cleanNotes, detectedLang);

    return {
      fileUrl,
      fileName: fileName || (fileUrl ? fileUrl.split('/').pop() : 'Submitted Attachment'),
      isPdf,
      isImage,
      isCodeFile,
      externalUrl,
      cleanNotes,
      hasCode: Boolean(cleanNotes && cleanNotes.length > 0),
      detectedLang,
      highlighted
    };
  }, [content]);

  // Determine effective tab
  const effectiveTab = useMemo(() => {
    if (activeTab !== 'auto') return activeTab;
    if (parsedData.isPdf || parsedData.isImage) return 'file';
    if (parsedData.hasCode) return 'code';
    if (parsedData.externalUrl) return 'link';
    if (parsedData.fileUrl) return 'file';
    return 'code';
  }, [activeTab, parsedData]);

  const handleCopy = () => {
    if (!parsedData.cleanNotes) return;
    navigator.clipboard.writeText(parsedData.cleanNotes);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
      {/* Top Header & Tab Switcher Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {parsedData.fileUrl && (
            <button
              onClick={() => setActiveTab('file')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                effectiveTab === 'file'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              {parsedData.isPdf ? 'PDF Document' : parsedData.isImage ? 'Image Preview' : 'Attached File'}
            </button>
          )}

          {parsedData.hasCode && (
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                effectiveTab === 'code'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Code &amp; Solution Notes ({parsedData.detectedLang})
            </button>
          )}

          {parsedData.externalUrl && (
            <button
              onClick={() => setActiveTab('link')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                effectiveTab === 'link'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Repository Link
            </button>
          )}
        </div>

        {/* Toolbar controls based on active view */}
        <div className="flex items-center gap-2">
          {effectiveTab === 'code' && parsedData.hasCode && (
            <>
              <button
                type="button"
                onClick={() => setWordWrap(!wordWrap)}
                className={`p-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1 transition-colors ${
                  wordWrap ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
                title="Toggle Word Wrap"
              >
                <WrapText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Wrap</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDarkTheme(!isDarkTheme)}
                className="p-1.5 rounded-lg text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                title="Toggle Theme"
              >
                {isDarkTheme ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-500" />}
              </button>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors shadow-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </>
          )}

          {effectiveTab === 'file' && parsedData.fileUrl && (
            <div className="flex items-center gap-2">
              <a
                href={parsedData.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                <span>Open in Tab</span>
              </a>

              <a
                href={parsedData.fileUrl}
                download={parsedData.fileName}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Main View Area */}
      <div className="relative flex-1">
        {/* VIEW 1: Document / PDF Viewer */}
        {effectiveTab === 'file' && parsedData.fileUrl && (
          <div className="w-full bg-slate-900 flex flex-col items-center justify-center min-h-[420px] max-h-[600px] overflow-hidden">
            {parsedData.isPdf ? (
              <iframe
                src={`${parsedData.fileUrl}#toolbar=1&navpanes=0`}
                title="Student Coursework Document"
                className="w-full h-[520px] border-0"
              />
            ) : parsedData.isImage ? (
              <div className="p-4 flex items-center justify-center h-full max-h-[520px] overflow-auto">
                <img 
                  src={parsedData.fileUrl} 
                  alt="Student Solution Attachment" 
                  className="max-h-[480px] max-w-full rounded-xl object-contain shadow-md"
                />
              </div>
            ) : (
              <div className="p-10 text-center text-white space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto text-blue-400">
                  <Paperclip className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="font-bold text-base">{parsedData.fileName}</h4>
                  <p className="text-xs text-slate-400 mt-1">Direct attachment uploaded by {studentName || 'student'}.</p>
                </div>
                <a
                  href={parsedData.fileUrl}
                  download
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <Download className="w-4 h-4" /> Download Submitted File
                </a>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Syntax-Highlighted Code Studio */}
        {effectiveTab === 'code' && (
          <div className={`w-full overflow-hidden ${isDarkTheme ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
            <div className={`flex items-center justify-between px-4 py-2 border-b text-[11px] font-mono ${
              isDarkTheme ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-slate-100/90 border-slate-200 text-slate-600'
            }`}>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="ml-2 font-bold text-slate-300">
                  solution.{parsedData.detectedLang === 'SQL' ? 'sql' : parsedData.detectedLang === 'Python' ? 'py' : 'txt'}
                </span>
              </div>
              <Badge variant={parsedData.detectedLang === 'SQL' ? 'blue' : 'purple'} className="text-[10px] py-0 px-2">
                {parsedData.detectedLang}
              </Badge>
            </div>

            <div className={`p-4 font-mono text-xs overflow-y-auto ${maxHeight} ${wordWrap ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'}`}>
              {parsedData.highlighted && parsedData.highlighted.length > 0 ? (
                <table className="w-full border-collapse">
                  <tbody>
                    {parsedData.highlighted.map(({ lineNumber, tokens }) => (
                      <tr key={lineNumber} className={`hover:${isDarkTheme ? 'bg-white/5' : 'bg-slate-100/70'}`}>
                        <td className={`select-none text-right pr-4 text-[10px] w-8 align-top ${
                          isDarkTheme ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {lineNumber}
                        </td>
                        <td className="align-top font-mono leading-relaxed">
                          {tokens.length === 0 ? (
                            <span>&nbsp;</span>
                          ) : (
                            tokens.map((token, tIdx) => {
                              let colorClass = '';
                              if (isDarkTheme) {
                                if (token.type === 'keyword') colorClass = 'text-purple-400 font-bold';
                                else if (token.type === 'string') colorClass = 'text-emerald-300';
                                else if (token.type === 'number') colorClass = 'text-amber-300';
                                else if (token.type === 'comment') colorClass = 'text-slate-500 italic';
                                else if (token.type === 'type') colorClass = 'text-sky-300 font-semibold';
                                else if (token.type === 'operator') colorClass = 'text-rose-300';
                                else if (token.type === 'punctuation') colorClass = 'text-slate-400';
                                else colorClass = 'text-slate-200';
                              } else {
                                if (token.type === 'keyword') colorClass = 'text-purple-700 font-bold';
                                else if (token.type === 'string') colorClass = 'text-emerald-700';
                                else if (token.type === 'number') colorClass = 'text-amber-700 font-semibold';
                                else if (token.type === 'comment') colorClass = 'text-slate-400 italic';
                                else if (token.type === 'type') colorClass = 'text-blue-700 font-semibold';
                                else if (token.type === 'operator') colorClass = 'text-rose-600';
                                else if (token.type === 'punctuation') colorClass = 'text-slate-500';
                                else colorClass = 'text-slate-900';
                              }

                              return (
                                <span key={tIdx} className={colorClass}>
                                  {token.text}
                                </span>
                              );
                            })
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="py-12 text-center text-slate-500 italic">
                  No textual code notes submitted. Check the attached document tab above.
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 3: Repository / External Link Card */}
        {effectiveTab === 'link' && parsedData.externalUrl && (
          <div className="p-8 bg-slate-50 min-h-[300px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 text-white flex items-center justify-center shadow-lg mb-4">
              {parsedData.externalUrl.includes('github') ? (
                <Github className="w-8 h-8" />
              ) : (
                <Globe className="w-8 h-8 text-blue-400" />
              )}
            </div>
            <h4 className="font-extrabold text-base text-slate-900">External Solution Repository</h4>
            <p className="text-xs text-slate-500 max-w-md mt-1 font-mono break-all bg-white p-2.5 rounded-xl border border-slate-200 mt-3">
              {parsedData.externalUrl}
            </p>
            <a
              href={parsedData.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <ExternalLink className="w-4 h-4" /> Open Solution in New Tab
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
