'use client';

import { useMemo, useRef, useState } from 'react';
import { CodeInputProps, SUPPORTED_LANGUAGES } from '@/types/security';
import FileUpload from './FileUpload';

function getDefaultTabName(languageId: string): string {
  const found = SUPPORTED_LANGUAGES.find((l) => l.id === languageId);
  const ext = found?.extensions[0] || '.txt';
  if (languageId === 'csharp') return 'Program.cs';
  if (languageId === 'python') return 'app.py';
  return `snippet${ext}`;
}

/**
 * Extendable IDE-style code editor with line numbers, tab chrome, word-wrap toggle, and status bar
 */
export default function CodeInput({
  codeContent,
  fileName,
  selectedLanguage,
  onLanguageChange,
  onCodeChange,
  onLoadSampleCSharp,
  onClearCode,
  onFileUpload,
  onAnalyzeCode,
  isAnalyzing,
  isExpanded,
  onToggleExpand,
}: CodeInputProps) {
  const [wordWrap, setWordWrap] = useState(false);
  const [isTall, setIsTall] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [copied, setCopied] = useState(false);
  const gutterRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const lineCount = useMemo(() => {
    if (!codeContent) return 1;
    return codeContent.split('\n').length;
  }, [codeContent]);

  const activeLanguageLabel = useMemo(() => {
    return SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage)?.label || 'Auto-detect';
  }, [selectedLanguage]);

  const tabTitle = fileName || getDefaultTabName(selectedLanguage);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const updateCursorPosition = (el: HTMLTextAreaElement) => {
    const uptoCursor = el.value.slice(0, el.selectionStart || 0);
    const lines = uptoCursor.split('\n');
    setCursorPos({
      line: lines.length,
      col: lines[lines.length - 1].length + 1,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const spaces = '    ';
      const nextValue = codeContent.substring(0, start) + spaces + codeContent.substring(end);
      onCodeChange(nextValue);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + spaces.length;
          textareaRef.current.selectionEnd = start + spaces.length;
          updateCursorPosition(textareaRef.current);
        }
      });
    }
  };

  const handleCopyEditorCode = async () => {
    if (!codeContent) return;
    await navigator.clipboard.writeText(codeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const editorHeightClass = isExpanded
    ? 'h-[72vh]'
    : isTall
      ? 'h-[620px]'
      : 'h-[400px]';

  return (
    <section className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-surface-muted">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-foreground">Source Editor</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            {activeLanguageLabel}
          </span>
        </div>

        <FileUpload
          fileName={fileName}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
          onFileUpload={onFileUpload}
          onLoadSampleCSharp={onLoadSampleCSharp}
          onClearCode={onClearCode}
          onAnalyzeCode={onAnalyzeCode}
          isAnalyzing={isAnalyzing}
          hasCode={!!codeContent.trim()}
        />
      </div>

      {/* IDE Window Tab Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-editor-header border-b border-border text-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-t-md bg-editor-bg border border-b-0 border-border font-mono text-foreground truncate max-w-[260px]">
            <svg className="w-3.5 h-3.5 text-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            <span className="truncate">{tabTitle}</span>
          </div>
        </div>

        {/* Editor View / Extend Controls */}
        <div className="flex items-center gap-1.5">
          {codeContent && (
            <button
              type="button"
              onClick={handleCopyEditorCode}
              className="px-2 py-1 rounded hover:bg-surface text-gray-600 dark:text-gray-300 transition-colors"
              title="Copy editor contents"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setWordWrap((w) => !w)}
            className={`px-2 py-1 rounded transition-colors ${
              wordWrap
                ? 'bg-primary/15 text-primary font-medium'
                : 'hover:bg-surface text-gray-600 dark:text-gray-300'
            }`}
            title="Toggle line wrapping"
          >
            Wrap: {wordWrap ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={() => setIsTall((t) => !t)}
            className="px-2 py-1 rounded hover:bg-surface text-gray-600 dark:text-gray-300 transition-colors"
            title="Extend or shrink editor height"
          >
            {isTall ? 'Compact Height' : 'Extend Height'}
          </button>
          <button
            type="button"
            onClick={onToggleExpand}
            className="inline-flex items-center gap-1 px-2 py-1 rounded hover:bg-surface text-gray-600 dark:text-gray-300 font-medium transition-colors"
            title={isExpanded ? 'Restore split view' : 'Maximize editor panel'}
          >
            {isExpanded ? 'Restore Split' : 'Maximize'}
          </button>
        </div>
      </div>

      {/* Resizable Code Editor Body with Line-Number Gutter */}
      <div
        className={`relative flex w-full ${editorHeightClass} min-h-[260px] max-h-[85vh] resize-y overflow-hidden bg-editor-bg`}
      >
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          className="select-none overflow-hidden bg-editor-gutter border-r border-border/70 py-3 px-3 text-right font-mono text-xs leading-6 text-editor-gutter-text min-w-[3.25rem]"
        >
          {Array.from({ length: lineCount }, (_, idx) => (
            <div key={idx + 1}>{idx + 1}</div>
          ))}
        </div>

        {/* Editable Monospace Textarea */}
        <textarea
          ref={textareaRef}
          id="code-input"
          value={codeContent}
          onChange={(e) => {
            onCodeChange(e.target.value);
            updateCursorPosition(e.target);
          }}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onClick={(e) => updateCursorPosition(e.currentTarget)}
          onKeyUp={(e) => updateCursorPosition(e.currentTarget)}
          disabled={isAnalyzing}
          spellCheck={false}
          wrap={wordWrap ? 'soft' : 'off'}
          placeholder="// Paste your C# (.NET), Python, TypeScript, Java, or Go code here, or click 'Open file...' above..."
          className={`flex-1 w-full h-full resize-none py-3 px-4 font-mono text-[13px] leading-6 bg-editor-bg text-editor-text placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none overflow-auto ${
            wordWrap ? 'whitespace-pre-wrap break-words' : 'whitespace-pre'
          }`}
        />
      </div>

      {/* IDE Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-editor-header border-t border-border text-[11px] font-mono text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <span>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <span>{lineCount} {lineCount === 1 ? 'line' : 'lines'}</span>
          <span>{codeContent.length.toLocaleString()} chars</span>
        </div>
        <div className="flex items-center gap-4">
          <span>UTF-8</span>
          <span>{activeLanguageLabel}</span>
          <span className="hidden sm:inline text-gray-400 dark:text-gray-500">
            Drag bottom-right corner to resize
          </span>
        </div>
      </div>
    </section>
  );
}