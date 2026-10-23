import React from 'react';
import { Download, ExternalLink, FileText } from 'lucide-react';

export default function SubmissionContentRenderer({ content, compact = false, className = '' }) {
  if (!content) {
    return <span className="text-slate-400 italic text-xs">No submission notes on file.</span>;
  }

  // Parse for uploaded file path (/uploads/...)
  const uploadMatch = content.match(/(\/uploads\/[^\s\)]+)/i);
  const uploadedFileUrl = uploadMatch ? uploadMatch[1] : null;

  // Extract human-friendly filename if present
  let displayFilename = null;
  if (uploadedFileUrl) {
    const fnMatch = content.match(/Attached File: [^\(]+\(([^)]+)\)/i) ||
                    content.match(/\[Attached File: ([^\]]+)\]/i);
    displayFilename = fnMatch ? fnMatch[1] : uploadedFileUrl.split('/').pop().replace(/^\d+_/, '');
  }

  // Parse for external HTTP/HTTPS URL
  const urlMatch = content.match(/(https?:\/\/[^\s\)]+)/i);
  const externalUrl = urlMatch ? urlMatch[1] : null;

  // Clean notes text by removing the boilerplate lines when rendered as structured buttons
  const cleanText = content
    .replace(/Attached File:\s*\/uploads\/[^\s\)]+(\s*\([^)]+\))?/gi, '')
    .replace(/\[Attached File:\s*[^\]]+\]/gi, '')
    .replace(/(?:Repository(?:\/Solution)?|Online Solution)\s*URL:\s*https?:\/\/[^\s\)]+/gi, '')
    .trim();

  if (compact) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {cleanText && (
          <div className="font-mono text-[11px] text-slate-800 line-clamp-2" title={cleanText}>
            {cleanText}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {uploadedFileUrl && (
            <a
              href={uploadedFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={displayFilename || true}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100/80 hover:bg-blue-200 text-blue-800 text-[10px] font-bold transition-colors"
              title="Download attached coursework file"
            >
              <Download className="w-3 h-3 text-blue-700" />
              <span>{displayFilename || 'Attached File'}</span>
            </a>
          )}
          {externalUrl && (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100/80 hover:bg-purple-200 text-purple-800 text-[10px] font-bold transition-colors"
              title={externalUrl}
            >
              <ExternalLink className="w-3 h-3 text-purple-700" />
              <span className="truncate max-w-[150px]">Repository Link</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Uploaded File Download Badge/Button */}
      {uploadedFileUrl && (
        <div>
          <a
            href={uploadedFileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={displayFilename || true}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold transition-all shadow-xs group"
          >
            <Download className="w-4 h-4 text-blue-600 group-hover:-translate-y-0.5 transition-transform" />
            <span>Download Attached Solution: <strong className="underline">{displayFilename || 'Uploaded File'}</strong></span>
          </a>
        </div>
      )}

      {/* Repository / Solution URL */}
      {externalUrl && (
        <div>
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold transition-all shadow-xs group"
          >
            <ExternalLink className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
            <span className="truncate max-w-md">Online Repository: <strong className="underline">{externalUrl}</strong></span>
          </a>
        </div>
      )}

      {/* Text notes */}
      {cleanText ? (
        <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
          {cleanText}
        </div>
      ) : !uploadedFileUrl && !externalUrl ? (
        <div className="p-3 bg-white rounded-xl border border-slate-200 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
          {content}
        </div>
      ) : null}
    </div>
  );
}
