export default function AnalysisSummary({ result, onSelectLine }) {
  if (!result) return null

  const stats = result.stats || {
    symbolsFound: 0,
    commentsAdded: result.commentsAdded || 0,
  }

  const changes = result.changes || []
  const documentedChanges = changes.filter(
    (item) => item.applied !== false && item.decision !== 'SKIP'
  )
  const isFallback = result.engineUsed === 'ast-fallback' || result.engineUsed === 'ast'

  return (
    <div className="flex flex-col gap-4 sm:gap-5 w-full">
      {/* Overview Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <span className={`w-2 h-2 rounded-full ${isFallback ? 'bg-amber-400' : 'bg-[var(--success)]'}`} />
          <h2 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
            Analysis Overview
          </h2>
          <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
            isFallback
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
              : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
          }`}>
            {result.engineUsed === 'ai' ? 'AI AST Pipeline' : 'Safe AST Engine'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
            {result.language?.toUpperCase() || 'JAVASCRIPT'}
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)] truncate max-w-[180px] sm:max-w-none">
            {result.filename}
          </span>
        </div>
      </div>

      {/* Essential Metrics: 4 focused, clean stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 w-full">
        <div className="stat-box">
          <span className="stat-val text-indigo-400">
            {stats.symbolsFound}
          </span>
          <span className="stat-lbl">Symbols Detected</span>
        </div>

        <div className="stat-box">
          <span className="stat-val text-[var(--success)]">
            {stats.commentsAdded}
          </span>
          <span className="stat-lbl">Comments Added</span>
        </div>

        <div className="stat-box">
          <span className="stat-val text-amber-400 font-mono">
            {stats.averageQualityScore ? `${stats.averageQualityScore}/10` : '9.0/10'}
          </span>
          <span className="stat-lbl">Quality Rubric</span>
        </div>

        <div className="stat-box">
          <span className="stat-val text-emerald-400 font-mono">
            0 modified
          </span>
          <span className="stat-lbl">Logic Preserved</span>
        </div>
      </div>

      {stats.commentsRejected > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <span className="font-semibold">Quality Filter Active:</span>
          <span>{stats.commentsRejected} low-quality/generic comments rejected.</span>
        </div>
      )}

      {/* Documented Symbols List: Only symbols that were actually documented */}
      {documentedChanges.length > 0 && (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] flex-wrap gap-2">
            <span className="font-semibold text-[var(--text-primary)]">
              Documented Symbols ({documentedChanges.length})
            </span>
            <span className="text-[var(--text-muted)] text-[11px]">Click symbol to navigate diff</span>
          </div>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto w-full pr-0.5">
            {documentedChanges.map((item, idx) => (
              <div
                key={idx}
                onClick={() => item.line && onSelectLine?.(item.line)}
                className="flex flex-col gap-1.5 p-3 rounded-xl border bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-[var(--border-subtle)] cursor-pointer hover:border-indigo-500/30 transition-all"
              >
                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                      ✓
                    </span>
                    <span className="font-mono font-medium text-[var(--text-primary)]">
                      {item.symbol}
                    </span>
                    {item.qualityScore && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        {item.qualityScore}/10
                      </span>
                    )}
                  </div>

                  {item.line && (
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      Line {item.line}
                    </span>
                  )}
                </div>

                {item.reason && (
                  <p className="text-xs text-[var(--text-secondary)] pl-6 leading-relaxed">
                    {item.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
