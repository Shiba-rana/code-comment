import { useState, useCallback, useRef } from 'react'
import CodeEditor from '../components/CodeEditor'
import DiffViewer from '../components/DiffViewer'
import FileUploader from '../components/FileUploader'
import LanguageSelector from '../components/LanguageSelector'
import AnalysisSummary from '../components/AnalysisSummary'
import LoadingState from '../components/LoadingState'
import { analyzeCode } from '../services/api'

const EXT_TO_LANG = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript',
  ts: 'typescript',
  jsx: 'jsx',
  tsx: 'tsx',
  java: 'java',
  py: 'python',
}

const SAMPLE_CODE = `export async function processPayment(orderId, amount) {
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
`

export default function Home() {
  const [code, setCode] = useState(SAMPLE_CODE)
  const [filename, setFilename] = useState('payment.js')
  const [language, setLanguage] = useState('javascript')
  const [mode, setMode] = useState('recommended')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [toast, setToast] = useState(null)

  const diffViewerRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }, [])

  function handleFileLoaded({ filename: fname, content }) {
    setCode(content)
    setFilename(fname)
    setResult(null)
    setError(null)

    const ext = fname.split('.').pop()?.toLowerCase()
    if (ext && EXT_TO_LANG[ext]) {
      setLanguage(EXT_TO_LANG[ext])
    }
  }

  async function handleAnalyze() {
    if (!code.trim()) {
      setError('Please paste or upload some code first.')
      return
    }

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const data = await analyzeCode({
        filename,
        language,
        code,
        mode,
      })

      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Analysis failed. Please try again.')
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        err.message ||
        'Unable to connect to the server.'
      setError(msg)
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

  return (
    <div className="min-h-screen flex flex-col w-full">
      <header className="px-4 py-5 sm:px-8 sm:py-7 md:px-12 md:py-8 text-center flex flex-col items-center">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="shrink-0 sm:w-8 sm:h-8">
            <rect width="32" height="32" rx="8" fill="url(#g1)" />
            <path d="M9 12l4 4-4 4M15 20h8" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="32" y2="32">
                <stop stopColor="#6366f1" />
                <stop offset="1" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </svg>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-[var(--accent)] to-purple-400 bg-clip-text text-transparent">
            CodeComment AI
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-xl px-2">
          AST-aware safe code documentation agent.
        </p>
      </header>

      <main className="flex-1 px-3 sm:px-6 md:px-12 pb-8 sm:pb-12 max-w-7xl mx-auto w-full">
        {!result && !loading && (
          <section className="glass-card p-4 sm:p-6 md:p-8 flex flex-col gap-5 sm:gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
              <div className="sm:col-span-1 lg:col-span-3 flex flex-col gap-1.5">
                <label htmlFor="filename-input" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Filename
                </label>
                <input
                  id="filename-input"
                  type="text"
                  className="input-field"
                  value={filename}
                  onChange={(e) => setFilename(e.target.value)}
                  placeholder="e.g. payment.js"
                />
              </div>

              <div className="sm:col-span-1 lg:col-span-3 flex flex-col gap-1.5">
                <label htmlFor="language-selector" className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Language
                </label>
                <LanguageSelector value={language} onChange={setLanguage} />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  File Upload
                </label>
                <FileUploader onFileLoaded={handleFileLoaded} />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                  Documentation Mode
                </label>
                <div className="grid grid-cols-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-1 gap-1 text-center">
                  <button
                    type="button"
                    onClick={() => setMode('minimal')}
                    className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                      mode === 'minimal'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Minimal
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('recommended')}
                    className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                      mode === 'recommended'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Recommended
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('detailed')}
                    className={`py-1.5 rounded-md text-xs font-medium transition-all ${
                      mode === 'detailed'
                        ? 'bg-[var(--accent)] text-white shadow-sm'
                        : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Detailed
                  </button>
                </div>
              </div>
            </div>

            <CodeEditor
              code={code}
              onChange={setCode}
              language={language}
            />

            {error && (
              <div className="p-3 sm:p-4 rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 text-xs sm:text-sm text-[var(--danger)]">
                <strong>Error:</strong> {error}
              </div>
            )}

            <div className="flex justify-center w-full">
              <button
                id="analyze-button"
                className="btn-primary w-full sm:w-auto text-sm sm:text-base px-6 sm:px-10 py-3"
                onClick={handleAnalyze}
                disabled={loading || !code.trim()}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                AST Analyze &amp; Patch
              </button>
            </div>
          </section>
        )}

        {loading && (
          <section className="glass-card p-6 sm:p-8">
            <LoadingState />
          </section>
        )}

        {result && !loading && (
          <section className="flex flex-col gap-6 sm:gap-8">
            <div className="glass-card p-4 sm:p-6 md:p-8">
              <AnalysisSummary result={result} onSelectLine={handleJumpToLine} />
            </div>

            <div className="glass-card p-4 sm:p-6 md:p-8 flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-[var(--text-primary)]">
                    AST Safe Diff (Comments Only)
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)]">
                    Structural logic preserved 100%. Only comments patched.
                  </p>
                </div>
              </div>

              <DiffViewer
                ref={diffViewerRef}
                originalCode={result.originalCode}
                updatedCode={result.updatedCode}
                language={result.language}
              />
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 w-full">
              <button id="copy-button" className="btn-secondary w-full sm:w-auto" onClick={handleCopy}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy Updated Code
              </button>

              <button id="download-button" className="btn-secondary w-full sm:w-auto" onClick={handleDownload}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download File
              </button>

              <button id="reset-button" className="btn-secondary w-full sm:w-auto" onClick={handleReset}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
                Analyze Again
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="text-center py-4 sm:py-6 text-xs text-[var(--text-muted)] px-4">
        
      </footer>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
