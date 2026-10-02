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
    <div className="min-h-screen flex flex-col w-full bg-[var(--bg-primary)]">
      <header className="w-full border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400">
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            <span className="font-semibold text-sm sm:text-base text-[var(--text-primary)]">
              CodeComment AI
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
              Safe AST Engine
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
        {!result && !loading && (
          <div className="clean-card p-5 sm:p-6 flex flex-col gap-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-4 items-end">
              <div className="sm:col-span-1 lg:col-span-3 flex flex-col gap-1.5">
                <label htmlFor="filename-input" className="text-xs font-medium text-[var(--text-secondary)]">
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
                <label htmlFor="language-selector" className="text-xs font-medium text-[var(--text-secondary)]">
                  Language
                </label>
                <LanguageSelector value={language} onChange={setLanguage} />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Upload Source
                </label>
                <FileUploader onFileLoaded={handleFileLoaded} />
              </div>

              <div className="sm:col-span-2 lg:col-span-3 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">
                  Mode
                </label>
                <div className="grid grid-cols-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 gap-0.5 text-center">
                  <button
                    type="button"
                    onClick={() => setMode('minimal')}
                    className={`py-1 rounded text-xs font-medium transition-all ${
                      mode === 'minimal'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Minimal
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('recommended')}
                    className={`py-1 rounded text-xs font-medium transition-all ${
                      mode === 'recommended'
                        ? 'bg-[var(--accent)] text-white'
                        : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('detailed')}
                    className={`py-1 rounded text-xs font-medium transition-all ${
                      mode === 'detailed'
                        ? 'bg-[var(--accent)] text-white'
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
              <div className="p-3 rounded-lg bg-[var(--danger-bg)] border border-[var(--danger)]/30 text-xs text-rose-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
              <span className="text-xs text-[var(--text-muted)]">
                AST parser analyzes symbols and safely patches documentation comments.
              </span>
              <button
                id="analyze-button"
                className="btn-primary w-full sm:w-auto"
                onClick={handleAnalyze}
                disabled={loading || !code.trim()}
              >
                Document Code
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="clean-card p-8 sm:p-12 my-auto">
            <LoadingState />
          </div>
        )}

        {result && !loading && (
          <div className="flex flex-col gap-6 w-full">
            <div className="clean-card p-5 sm:p-6">
              <AnalysisSummary result={result} onSelectLine={handleJumpToLine} />
            </div>

            <div className="clean-card p-5 sm:p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Code Comparison
                </span>
                <span className="text-xs text-[var(--text-muted)]">
                  Original (left) vs Documented (right)
                </span>
              </div>

              <DiffViewer
                ref={diffViewerRef}
                originalCode={result.originalCode}
                updatedCode={result.updatedCode}
                language={result.language}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
              <button id="copy-button" className="btn-secondary w-full sm:w-auto" onClick={handleCopy}>
                Copy Code
              </button>

              <button id="download-button" className="btn-secondary w-full sm:w-auto" onClick={handleDownload}>
                Download File
              </button>

              <button id="reset-button" className="btn-primary w-full sm:w-auto" onClick={handleReset}>
                New Analysis
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="w-full border-t border-[var(--border-subtle)] py-4 text-center text-xs text-[var(--text-muted)] mt-auto">
        CodeComment AI · AST-aware safe documentation engine
      </footer>

      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
