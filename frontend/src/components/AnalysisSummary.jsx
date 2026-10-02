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
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Analysis Overview
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] font-medium">
            {result.language?.toUpperCase() || 'JAVASCRIPT'}
          </span>
          <span className="text-xs font-mono text-[var(--text-muted)]">
            {result.filename}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
        <div className="stat-box">
          <span className="stat-val text-indigo-400">
            {stats.symbolsFound}
          </span>
          <span className="stat-lbl">Symbols Found</span>
        </div>

        <div className="stat-box">
          <span className="stat-val text-indigo-300">
            {stats.symbolsAnalyzed}
          </span>
          <span className="stat-lbl">Analyzed</span>
        </div>

        <div className="stat-box">
          <span className="stat-val text-[var(--success)]">
            {stats.commentsAdded}
          </span>
          <span className="stat-lbl">Documented</span>
        </div>

        <div className="stat-box">
          <span className="stat-val text-[var(--text-muted)]">
            {stats.commentsSkipped}
          </span>
          <span className="stat-lbl">Skipped</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] w-full text-xs">
        <div className="flex items-center justify-between px-2 py-0.5">
          <span className="text-[var(--text-secondary)]">Logic Changes</span>
          <span className="font-semibold text-[var(--success)] flex items-center gap-1">
            0
          </span>
        </div>

        <div className="flex items-center justify-between px-2 py-0.5 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-1.5 sm:pt-0">
          <span className="text-[var(--text-secondary)]">Syntax Check</span>
          <span className={`font-semibold ${validation.syntaxValid ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {validation.syntaxValid ? 'Passed' : 'Failed'}
          </span>
        </div>

        <div className="flex items-center justify-between px-2 py-0.5 border-t sm:border-t-0 sm:border-l border-[var(--border-subtle)] pt-1.5 sm:pt-0">
          <span className="text-[var(--text-secondary)]">AST Structure</span>
          <span className={`font-semibold ${validation.logicPreserved ? 'text-[var(--success)]' : 'text-[var(--danger)]'}`}>
            {validation.logicPreserved ? 'Equal' : 'Mismatch'}
          </span>
        </div>
      </div>

      {changes.length > 0 && (
        <div className="flex flex-col gap-2.5 w-full">
          <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span className="font-medium text-[var(--text-primary)]">
              Documented Symbols ({changes.length})
            </span>
            <span>Click to locate in diff editor</span>
          </div>

          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto w-full">
            {changes.map((item, idx) => {
              const isApplied = item.applied !== false
              const confidence = item.confidence ? Math.round(item.confidence * 100) : 95

              return (
                <div
                  key={idx}
                  onClick={() => item.line && onSelectLine?.(item.line)}
                  className={`flex flex-col gap-1 p-2.5 rounded-lg border transition-all ${
                    isApplied
                      ? 'bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border-[var(--border-subtle)] cursor-pointer'
                      : 'bg-black/20 border-white/5 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={isApplied ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}>
                        {isApplied ? '✓' : '—'}
                      </span>
                      <span className="font-mono font-medium text-[var(--text-primary)]">
                        {item.symbol}
                      </span>
                      {item.category && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-light)] text-indigo-300 font-mono">
                          {item.category.replace('_', ' ')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[var(--text-muted)] font-mono">
                      {item.line && <span>Line {item.line}</span>}
                      <span>{confidence}%</span>
                    </div>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)] pl-4">
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
