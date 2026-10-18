import { useState, useCallback, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import EditorSection from '../components/EditorSection'
import ResultSection from '../components/ResultSection'
import LoadingState from '../components/LoadingState'
import SettingsModal from '../components/SettingsModal'
import { analyzeCode } from '../services/api'
import { EXT_TO_LANG, SAMPLES } from '../constants/samples'

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
      <Navbar
        onReset={handleReset}
        onOpenSettings={() => setIsSettingsOpen(true)}
        engineMode={settings.engineMode}
      />

      {/* Main Content Area */}
      <main
        id="main-content"
        className="flex-1 max-w-7xl mx-auto w-full flex flex-col gap-3"
      >
        {/* Input & Editor View */}
        {!result && !loading && (
          <EditorSection
            filename={filename}
            setFilename={setFilename}
            language={language}
            setLanguage={setLanguage}
            code={code}
            setCode={setCode}
            mode={mode}
            setMode={setMode}
            loading={loading}
            error={error}
            onFileLoaded={handleFileLoaded}
            onAnalyze={handleAnalyze}
          />
        )}

        {/* Loading State */}
        {loading && (
          <div className="clean-card p-8 sm:p-14 my-auto">
            <LoadingState />
          </div>
        )}

        {/* Documented Result & Diff View */}
        {result && !loading && (
          <ResultSection
            result={result}
            diffViewerRef={diffViewerRef}
            onJumpToLine={handleJumpToLine}
            onCopy={handleCopy}
            onDownload={handleDownload}
            onReset={handleReset}
          />
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
