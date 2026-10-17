import { useState, useCallback, useRef, useEffect } from 'react'
import CodeEditor from '../components/CodeEditor'
import DiffViewer from '../components/DiffViewer'
import FileUploader from '../components/FileUploader'
import LanguageSelector from '../components/LanguageSelector'
import AnalysisSummary from '../components/AnalysisSummary'
import LoadingState from '../components/LoadingState'
import SettingsModal from '../components/SettingsModal'
import { analyzeCode } from '../services/api'

const EXT_TO_LANG = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  java: 'java',
  py: 'python',
}

const SAMPLES = {
  javascript: {
    filename: 'payment.js',
    language: 'javascript',
    code: `export async function processPayment(orderId, amount) {
    const user = await getUser(orderId);

    if (!user) {
        throw new Error("User not found");
    }

    const total = calculateTotal(amount);

    return await orderService.create({
        orderId,
        amount: total
    });
}

function calculateTotal(amount) {
    const taxRate = 0.08;
    return amount + (amount * taxRate);
}

function getId() {
    return 101;
}
`,
  },
  python: {
    filename: 'data_pipeline.py',
    language: 'python',
    code: `import json
import logging

class MetricsAggregator:
    def __init__(self, service_name):
        self.service_name = service_name
        self.metrics = []

    def record_metric(self, name, value, tags=None):
        payload = {"name": name, "value": value, "tags": tags or {}}
        self.metrics.append(payload)

def parse_events(event_stream):
    results = []
    for raw in event_stream:
        try:
            item = json.loads(raw)
            if item.get("status") == "SUCCESS":
                results.append(item)
        except Exception as e:
            logging.warning(f"Failed to parse item: {e}")
    return results
`,
  },
  typescript: {
    filename: 'orderService.ts',
    language: 'typescript',
    code: `interface OrderItem {
    id: string;
    price: number;
    quantity: number;
}

export async function submitOrder(userId: string, items: OrderItem[]): Promise<string> {
    if (!items || items.length === 0) {
        throw new Error("Order cannot be empty");
    }

    const subtotal = calculateSubtotal(items);
    const trackingId = await paymentGateway.charge({ userId, amount: subtotal });

    return trackingId;
}

function calculateSubtotal(items: OrderItem[]): number {
    return items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
}
`,
  },
}

export default function Home() {
  const [code, setCode] = useState(SAMPLES.javascript.code)
  const [filename, setFilename] = useState(SAMPLES.javascript.filename)
  const [language, setLanguage] = useState(SAMPLES.javascript.language)
  const [mode, setMode] = useState('recommended')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // Load custom settings from localStorage
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('codecomment_settings')
      return saved ? JSON.parse(saved) : { apiKey: '', baseURL: '', model: '', engineMode: 'auto' }
    } catch {
      return { apiKey: '', baseURL: '', model: '', engineMode: 'auto' }
    }
  })

  const diffViewerRef = useRef(null)

  function handleSaveSettings(newSettings) {
    setSettings(newSettings)
    try {
      localStorage.setItem('codecomment_settings', JSON.stringify(newSettings))
      showToast('Settings saved!')
    } catch {
      // localStorage failed
    }
  }

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  function loadSample(key) {
    const sample = SAMPLES[key]
    if (!sample) return
    setCode(sample.code)
    setFilename(sample.filename)
    setLanguage(sample.language)
    setResult(null)
    setError(null)
    showToast(`Loaded ${key.toUpperCase()} sample`)
  }

  function handleFileLoaded({ filename: fname, content }) {
    setCode(content)
    setFilename(fname)
    setResult(null)
    setError(null)

    const ext = fname.split('.').pop()?.toLowerCase()
    if (ext && EXT_TO_LANG[ext]) {
      setLanguage(EXT_TO_LANG[ext])
    }
    showToast(`Loaded ${fname}`)
  }

  async function handleAnalyze(forceAstOnly = false) {
    if (!code.trim()) {
      setError('Please paste or upload some code first.')
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)

    // Determine credentials: if AST-only mode is selected, pass empty key
    const isAstOnly = forceAstOnly || settings.engineMode === 'ast-only'
    const apiKey = isAstOnly ? 'your_key_here' : settings.apiKey
    const baseURL = isAstOnly ? '' : settings.baseURL
    const model = isAstOnly ? '' : settings.model

    try {
      const data = await analyzeCode({
        filename,
        language,
        code,
        mode,
        apiKey,
        baseURL,
        model,
      })

      if (data.success) {
        setResult(data)
        if (data.notice) {
          showToast('Code documented successfully via Safe AST Engine!')
        } else {
          showToast('Documentation generated successfully!')
        }
      } else {
        const rawErr = data.error
        setError(typeof rawErr === 'string' ? rawErr : (rawErr?.message || JSON.stringify(rawErr) || 'Analysis failed. Please try again.'))
      }
    } catch (err) {
      const rawError =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Unable to connect to the server.'
      let msg = typeof rawError === 'string'
        ? rawError
        : (rawError?.message || JSON.stringify(rawError))

      if (err.code === 'ECONNABORTED' || (typeof msg === 'string' && msg.toLowerCase().includes('timeout'))) {
        msg = 'The analysis request timed out. If running on Render free tier, the backend may take up to 50s to wake up from sleep. Try again or use the offline Safe AST Engine.'
      } else if (err.message === 'Network Error' || !err.response) {
        msg = 'Unable to reach the backend server. If using Render free tier, the service may be spinning up from idle (~40s), or check your VITE_API_URL / CORS settings. You can also click below to document offline.'
      }
      setError(String(msg))
    } finally {
      setLoading(false)
    }
  }

  function handleReset() {
    setCode('')
    setFilename('')
    setLanguage('javascript')
    setResult(null)
    setError(null)
  }

  async function handleCopy() {
    if (!result?.updatedCode) return
    try {
      await navigator.clipboard.writeText(result.updatedCode)
      showToast('Copied to clipboard!')
    } catch {
      showToast('Copy failed — please copy manually.', 'error')
    }
  }

  function handleDownload() {
    if (!result?.updatedCode) return
    const blob = new Blob([result.updatedCode], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename || filename || 'documented-code.js'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast('File downloaded!')
  }

  function handleJumpToLine(line) {
    if (diffViewerRef.current) {
      diffViewerRef.current.goToLine(line)
    }
  }

  // Keyboard shortcut: Ctrl + Enter to document
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!loading && code.trim() && !result) {
          e.preventDefault()
          handleAnalyze()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [loading, code, result])

  return (
    <div className="min-h-screen flex flex-col w-full bg-[var(--bg-primary)]">
      {/* Top Header */}
      <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-15 flex items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 sm:gap-3">
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
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-white bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] border border-[var(--border-subtle)] transition-all shadow-xs cursor-pointer"
              title="Open Settings"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
              {settings.engineMode === 'ast-only' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Offline AST Mode Active" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col gap-5">
        {/* Input & Editor View */}
        {!result && !loading && (
          <div className="clean-card p-4 sm:p-6 flex flex-col gap-4 sm:gap-5 w-full">
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
                <FileUploader onFileLoaded={handleFileLoaded} />
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
                    className={`h-full rounded-lg text-xs font-medium transition-all ${mode === 'minimal'
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
                    className={`h-full rounded-lg text-xs font-medium transition-all ${mode === 'recommended'
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
                    className={`h-full rounded-lg text-xs font-medium transition-all ${mode === 'detailed'
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
                  onClick={() => handleAnalyze(true)}
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
                  onClick={() => handleAnalyze(false)}
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
        )}

        {/* Loading State */}
        {loading && (
          <div className="clean-card p-8 sm:p-14 my-auto">
            <LoadingState />
          </div>
        )}

        {/* Documented Result & Diff View */}
        {result && !loading && (
          <div className="flex flex-col gap-5 w-full">
            {/* Analysis Stats Card */}
            <div className="clean-card p-4 sm:p-6 w-full">
              <AnalysisSummary result={result} onSelectLine={handleJumpToLine} />
            </div>

            {/* Code Diff Card */}
            <div className="clean-card p-4 sm:p-6 flex flex-col gap-4 w-full">
              <div className="flex items-center justify-between flex-wrap gap-2 pb-1 border-b border-[var(--border-subtle)]">
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
            <div className="clean-card p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
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
                  onClick={handleCopy}
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
                  onClick={handleDownload}
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
                  onClick={handleReset}
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
        )}
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
