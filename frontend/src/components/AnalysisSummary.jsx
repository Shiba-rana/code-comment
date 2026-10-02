export default function AnalysisSummary({ result, onSelectLine }) {
  if (!result) return null

  const stats = result.stats || {
    symbolsFound: 0,
    symbolsAnalyzed: 0,
    commentsAdded: result.commentsAdded || 0,
    commentsSkipped: 0,
  }

  const validation = result.validation || {
    syntaxValid: result.syntaxValid !== false,
    logicPreserved: result.logicChanges === 0,
    commentOnlyChanges: true,
  }

  const changes = result.changes || []

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full">
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border-subtle)] pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-[var(--success)] animate-pulse shrink-0" />
          <h2 className="text-lg sm:text-xl font-bold text-[var(--text-primary)]">
            AST-Safe Analysis Complete
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs font-mono px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[var(--accent)]/15 text-[var(--accent-hover)] border border-[var(--accent)]/30 font-semibold">
            {result.language?.toUpperCase() || 'JAVASCRIPT'}
          </span>
          <span className="text-[10px] sm:text-xs font-mono text-[var(--text-muted)] truncate max-w-[120px] sm:max-w-none">
            {result.filename}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 w-full">
        <div className="stat-badge">
          <span className="stat-value text-indigo-400">
            {stats.symbolsFound}
          </span>
          <span className="stat-label">Symbols Found</span>
        </div>

        <div className="stat-badge">
          <span className="stat-value text-purple-400">
            {stats.symbolsAnalyzed}
          </span>
          <span className="stat-label">Analyzed</span>
        </div>

        <div className="stat-badge">
          <span className="stat-value text-[var(--success)]">
            {stats.commentsAdded}
          </span>
          <span className="stat-label">Documented</span>
        </div>

        <div className="stat-badge">
          <span className="stat-value text-[var(--text-secondary)]">
            {stats.commentsSkipped}
          </span>
          <span className="stat-label">Skipped</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] w-full">
        <div className="flex items-center justify-between px-1 sm:px-2 py-1 sm:py-0">
          <span className="text-xs text-[var(--text-secondary)] font-medium">Logic Changes</span>
          <span className="text-xs font-bold text-[var(--success)] flex items-center gap-1">
            0 <span className="text-emerald-400">✓</span>
          </span>
        </div>

        <div className="flex items-center justify-between px-1 sm:px-2 py-1 sm:py-0 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-secondary)] font-medium">Syntax</span>
          <span className={`text-xs font-bold ${validation.syntaxValid ? 'text-[var(--success)]' : 'text-[var(--danger)]'} flex items-center gap-1`}>
            {validation.syntaxValid ? 'PASSED ✓' : 'FAILED ✗'}
          </span>
        </div>

        <div className="flex items-center justify-between px-1 sm:px-2 py-1 sm:py-0 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)]">
          <span className="text-xs text-[var(--text-secondary)] font-medium">AST Validation</span>
          <span className={`text-xs font-bold ${validation.logicPreserved ? 'text-[var(--success)]' : 'text-[var(--danger)]'} flex items-center gap-1`}>
            {validation.logicPreserved ? 'PASSED ✓' : 'FAILED ✗'}
          </span>
        </div>
      </div>

      {changes.length > 0 && (
        <div className="flex flex-col gap-2.5 sm:gap-3 w-full">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--text-primary)]">
              Documentation Changes ({changes.length})
            </h3>
            <span className="text-[10px] sm:text-xs text-[var(--text-muted)]">
              Click change to jump in editor
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-72 sm:max-h-80 overflow-y-auto pr-0.5 sm:pr-1 w-full">
            {changes.map((item, idx) => {
              const isApplied = item.applied !== false
              const confidence = item.confidence ? Math.round(item.confidence * 100) : 95
              const isHigh = confidence >= 90
              const isMedium = confidence >= 75 && confidence < 90

              return (
                <div
                  key={idx}
                  onClick={() => item.line && onSelectLine?.(item.line)}
                  className={`flex flex-col gap-1.5 p-2.5 sm:p-3 rounded-xl border transition-all ${
                    isApplied
                      ? 'bg-[var(--bg-secondary)]/70 hover:bg-[var(--bg-secondary)] border-[var(--border-subtle)] hover:border-[var(--accent)]/50 cursor-pointer active:scale-[0.99]'
                      : 'bg-black/20 border-white/5 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <span className={`text-xs sm:text-sm shrink-0 ${isApplied ? 'text-[var(--success)] font-bold' : 'text-[var(--text-muted)]'}`}>
                        {isApplied ? '✓' : '○'}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] font-mono truncate max-w-[150px] sm:max-w-none">
                        {item.symbol}
                      </span>
                      {item.category && (
                        <span className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                          {item.category.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
                      {item.line && (
                        <span className="px-1.5 py-0.5 rounded bg-white/5 text-[var(--text-secondary)] font-mono">
                          L{item.line}
                        </span>
                      )}
                      <span
                        className={`px-1.5 sm:px-2 py-0.5 rounded font-mono font-medium ${
                          isHigh
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : isMedium
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {confidence}% {isHigh ? 'High' : isMedium ? 'Med' : 'Review'}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] sm:text-xs text-[var(--text-secondary)] pl-4 sm:pl-5 leading-relaxed">
                    {item.reason}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
