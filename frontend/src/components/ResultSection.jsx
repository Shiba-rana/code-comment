import AnalysisSummary from './AnalysisSummary'
import DiffViewer from './DiffViewer'

export default function ResultSection({
  result,
  diffViewerRef,
  onJumpToLine,
  onCopy,
  onDownload,
  onReset,
}) {
  return (
    <div
      id="result-view"
      className="flex flex-col gap-5 w-full"
    >
      {/* Analysis Stats Card */}
      <div
        id="analysis-stats-card"
        className="clean-card w-full"
      >
        <AnalysisSummary result={result} onSelectLine={onJumpToLine} />
      </div>

      {/* Code Diff Card */}
      <div
        id="code-comparison-card"
        className="clean-card flex flex-col gap-4 w-full"
      >
        <div
          id="comparison-header"
          className="flex items-center justify-between flex-wrap gap-2 border-b border-[var(--border-subtle)]"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)]">
              Code Comparison
            </span>
          </div>
        </div>

        <DiffViewer
          ref={diffViewerRef}
          originalCode={result.originalCode}
          updatedCode={result.updatedCode}
          language={result.language}
        />
      </div>

      {/* Result Action Bar */}
      <div
        id="result-action-bar"
        className="clean-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full"
      >
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Syntax verified &amp; AST structure identical</span>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
          <button
            id="copy-button"
            className="btn-secondary w-full sm:w-auto"
            onClick={onCopy}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            Copy Documented Code
          </button>

          <button
            id="download-button"
            className="btn-secondary w-full sm:w-auto"
            onClick={onDownload}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download File
          </button>

          <button
            id="reset-button"
            className="btn-primary w-full sm:w-auto"
            onClick={onReset}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Analysis
          </button>
        </div>
      </div>
    </div>
  )
}
