import CodeEditor from './CodeEditor'
import FileUploader from './FileUploader'
import LanguageSelector from './LanguageSelector'

export default function EditorSection({
  filename,
  setFilename,
  language,
  setLanguage,
  code,
  setCode,
  mode,
  setMode,
  loading,
  error,
  onFileLoaded,
  onAnalyze,
}) {
  return (
    <div
      id="input-editor-view"
      className="clean-card flex flex-col gap-4 sm:gap-5 w-full"
    >
      {/* Top Toolbar Grid: 2x2 on mobile, 4-col on tablet & desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4 items-end w-full">
        {/* 1. Filename */}
        <div className="flex flex-col gap-1 w-full">
          <label htmlFor="filename-input" className="text-xs font-semibold text-[var(--text-secondary)]">
            Filename
          </label>
          <input
            id="filename-input"
            type="text"
            className="input-field ctrl-h"
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
            placeholder="e.g. payment.js"
          />
        </div>

        {/* 2. Language */}
        <div className="flex flex-col gap-1 w-full">
          <label htmlFor="language-selector" className="text-xs font-semibold text-[var(--text-secondary)]">
            Language
          </label>
          <LanguageSelector value={language} onChange={setLanguage} />
        </div>

        {/* 3. Upload File */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Upload Source
          </label>
          <FileUploader onFileLoaded={onFileLoaded} />
        </div>

        {/* 4. Documentation Mode Pills */}
        <div className="flex flex-col gap-1 w-full">
          <label className="text-xs font-semibold text-[var(--text-secondary)]">
            Detail Level
          </label>
          <div className="grid grid-cols-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 ctrl-h items-center text-center">
            <button
              type="button"
              onClick={() => setMode('minimal')}
              className={`h-full rounded-lg text-xs font-medium transition-all ${
                mode === 'minimal'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
              title="Document only critical exported APIs"
            >
              Minimal
            </button>
            <button
              type="button"
              onClick={() => setMode('recommended')}
              className={`h-full rounded-lg text-xs font-medium transition-all ${
                mode === 'recommended'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
              title="Recommended balance of main points and public methods"
            >
              Standard
            </button>
            <button
              type="button"
              onClick={() => setMode('detailed')}
              className={`h-full rounded-lg text-xs font-medium transition-all ${
                mode === 'detailed'
                  ? 'bg-[var(--accent)] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
              title="Comprehensive documentation for all logical blocks"
            >
              Detailed
            </button>
          </div>
        </div>
      </div>

      {/* Monaco Code Editor */}
      <CodeEditor
        code={code}
        onChange={setCode}
        language={language}
        onClear={() => setCode('')}
      />

      {/* Error Banner with 1-Click AST Fallback Action */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-300">
          <div className="flex items-start gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400 shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-rose-200">Analysis Error</span>
              <span className="leading-relaxed">
                {typeof error === 'string' ? error : (error?.message || JSON.stringify(error))}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onAnalyze(true)}
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-medium shrink-0 self-start sm:self-auto transition-colors"
          >
            Document with Safe AST Engine (Offline)
          </button>
        </div>
      )}

      {/* Bottom Action Row */}
      <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span>AST engine identifies codebase architecture &amp; guarantees zero logic modification.</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            id="analyze-button"
            className="btn-primary w-full sm:w-auto text-sm"
            onClick={() => onAnalyze(false)}
            disabled={loading || !code.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Document Code
            <span className="hidden sm:inline text-[11px] font-mono opacity-70 ml-1">
              (Ctrl+Enter)
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
