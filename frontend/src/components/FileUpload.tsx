import {
  ACCEPTED_FILE_EXTENSIONS,
  FileUploadProps,
  LanguageId,
  SUPPORTED_LANGUAGES,
} from '@/types/security';

/**
 * IDE-styled toolbar controls: language selector, sample loader, file picker, and scan trigger
 */
export default function FileUpload({
  selectedLanguage,
  onLanguageChange,
  onFileUpload,
  onLoadSampleCSharp,
  onClearCode,
  onAnalyzeCode,
  isAnalyzing,
  hasCode,
}: FileUploadProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">
          Language:
        </span>
        <select
          aria-label="Select programming language"
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value as LanguageId)}
          disabled={isAnalyzing}
          className="border border-border rounded-md px-2.5 py-1.5 text-xs font-medium bg-surface text-foreground hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id} className="bg-surface text-foreground">
              {lang.label}
            </option>
          ))}
        </select>
      </div>

      <input
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS}
        onChange={onFileUpload}
        className="hidden"
        id="file-upload"
      />

      <label
        htmlFor="file-upload"
        className="inline-flex items-center gap-1.5 border border-border bg-surface hover:bg-surface-muted text-foreground px-3 py-1.5 rounded-md cursor-pointer transition-colors font-medium text-xs shadow-xs"
      >
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
        Open file...
      </label>

      {!hasCode && (
        <button
          type="button"
          onClick={onLoadSampleCSharp}
          disabled={isAnalyzing}
          className="inline-flex items-center gap-1.5 border border-dashed border-primary/50 hover:border-primary bg-primary/5 hover:bg-primary/10 text-primary px-3 py-1.5 rounded-md transition-colors font-medium text-xs"
          title="Load a sample vulnerable C# (.NET) controller to test"
        >
          Sample C# (.NET)
        </button>
      )}

      {hasCode && (
        <button
          type="button"
          onClick={onClearCode}
          disabled={isAnalyzing}
          className="border border-border bg-surface hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 text-foreground px-2.5 py-1.5 rounded-md transition-colors text-xs font-medium"
        >
          Clear
        </button>
      )}

      <button
        type="button"
        onClick={onAnalyzeCode}
        disabled={!hasCode || isAnalyzing}
        className="inline-flex items-center gap-2 bg-accent hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md transition-all font-semibold text-xs shadow-xs"
      >
        {isAnalyzing ? (
          <>
            <svg className="animate-spin h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Scanning...
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Analyze Code
          </>
        )}
      </button>
    </div>
  );
}