export default function Navbar({ onReset, onOpenSettings, engineMode }) {
  return (
    <header
      id="navbar"
      className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md sticky top-0 z-40"
    >
      <div
        id="navbar-inner"
        className="max-w-7xl mx-auto flex items-center justify-between gap-3"
      >
        {/* Logo & Brand */}
        <div
          onClick={onReset}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer select-none transition-opacity hover:opacity-90"
          title="CodeComment AI - Start fresh"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--accent-gradient)] flex items-center justify-center text-white shadow-sm shadow-indigo-500/30">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base text-[var(--text-primary)] tracking-tight">
              CodeComment <span className="text-indigo-400 font-extrabold">AI</span>
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            id="header-settings-btn"
            type="button"
            onClick={onOpenSettings}
            className="flex items-center gap-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-white bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-all shadow-xs cursor-pointer"
            title="Open Settings"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Settings</span>
            {engineMode === 'ast-only' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Offline AST Mode Active" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
