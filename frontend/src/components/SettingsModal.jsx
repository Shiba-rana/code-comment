import { useState } from 'react'

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  if (!isOpen) return null

  const [apiKey, setApiKey] = useState(settings.apiKey || '')
  const [baseURL, setBaseURL] = useState(settings.baseURL || '')
  const [model, setModel] = useState(settings.model || '')
  const [engineMode, setEngineMode] = useState(settings.engineMode || 'auto')

  function handleSave(e) {
    e.preventDefault()
    onSaveSettings({
      apiKey: apiKey.trim(),
      baseURL: baseURL.trim(),
      model: model.trim(),
      engineMode,
    })
    onClose()
  }

  function handleReset() {
    setApiKey('')
    setBaseURL('')
    setModel('')
    setEngineMode('auto')
    onSaveSettings({
      apiKey: '',
      baseURL: '',
      model: '',
      engineMode: 'auto',
    })
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        id='settings-modal'
        className="modal-content p-6 flex flex-col gap-5 max-w-lg w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--accent-light)] flex items-center justify-center text-indigo-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)]">
                Engine &amp; API Settings
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Configure custom AI provider or use Safe AST Engine
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--bg-hover)]"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
          {/* Mode Selector */}
          <div
            className="flex flex-col gap-1.5">
            <label className="font-medium text-[var(--text-secondary)]">
              Documentation Engine
            </label>
            <div
              id='engine-mode-selector'
              className="grid grid-cols-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] p-1 gap-1">
              <button
                id='btn-mode'
                type="button"
                onClick={() => setEngineMode('auto')}
                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all ${
                  engineMode === 'auto'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                Auto (AI + AST Fallback)
              </button>
              <button
                id='btn-mode'
                type="button"
                onClick={() => setEngineMode('ast-only')}
                className={`py-2 px-3 rounded-lg font-medium text-xs transition-all ${
                  engineMode === 'ast-only'
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                AST Engine Only (Offline)
              </button>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              {engineMode === 'auto'
                ? 'Uses configured AI model first, with automatic instant fallback to Safe AST Engine if quota is exhausted.'
                : 'Runs purely locally via AST parser and heuristic rules without any external API calls.'}
            </p>
          </div>

          {/* API Key */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom-api-key" className="font-medium text-[var(--text-secondary)]">
              OpenAI / Custom API Key (Optional)
            </label>
            <input
              id="custom-api-key"
              type="password"
              className="input-field"
              placeholder="sk-... or atr_..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            <p className="text-[11px] text-[var(--text-muted)]">
              Leave blank to use server environment key or Safe AST Engine.
            </p>
          </div>

          {/* Base URL */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom-base-url" className="font-medium text-[var(--text-secondary)]">
              API Base URL (Optional)
            </label>
            <input
              id="custom-base-url"
              type="text"
              className="input-field"
              placeholder="e.g. https://api.openai.com/v1"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
            />
          </div>

          {/* Model Name */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="custom-model" className="font-medium text-[var(--text-secondary)]">
              Model Name (Optional)
            </label>
            <input
              id="custom-model"
              type="text"
              className="input-field"
              placeholder="e.g. gpt-4o, gpt-4o-mini, Atria-Dawn-Preview"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>

          <div id='button-section' className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] mt-2">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-[var(--text-muted)] hover:text-rose-400 transition-colors"
            >
              Reset to Defaults
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary h-9 px-4 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary h-9 px-4 text-xs"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
