import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'

const LANG_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  java: 'java',
  python: 'python',
}

export default function CodeEditor({ code, onChange, language, readOnly = false, onClear }) {
  const monacoLang = LANG_MAP[language] || 'javascript'
  const editorRef = useRef(null)
  const [fontSize, setFontSize] = useState(14)
  const [isMobile, setIsMobile] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const lineCount = (code || '').split('\n').length
  const byteCount = new Blob([code || '']).size

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      setIsMobile(width < 640)
      if (width < 640) {
        setFontSize(12)
      } else if (width < 1024) {
        setFontSize(13)
      } else {
        setFontSize(14)
      }
      editorRef.current?.layout()
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function handleEditorMount(editor) {
    editorRef.current = editor
    editor.layout()
  }

  async function handleCopy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }

  // Calculate dynamic height based on device & expanded state
  const heightClass = isExpanded
    ? 'h-[600px] sm:h-[680px] lg:h-[760px]'
    : 'h-[320px] sm:h-[420px] lg:h-[480px]'

  return (
    <div className="editor-wrapper w-full flex flex-col">
      {/* Editor Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-card)]/70 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-mono font-semibold uppercase px-2 py-0.5 rounded bg-[var(--accent-light)] text-indigo-300 border border-indigo-500/20">
            {language}
          </span>
          <span className="text-[var(--text-muted)] font-mono text-[11px] hidden sm:inline">
            {lineCount} {lineCount === 1 ? 'line' : 'lines'} · {byteCount > 1024 ? `${(byteCount / 1024).toFixed(1)} KB` : `${byteCount} B`}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all flex items-center gap-1"
            title="Copy source code"
          >
            {copied ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy</span>
              </>
            )}
          </button>

          {!readOnly && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-2 py-1 rounded text-[11px] font-medium text-[var(--text-secondary)] hover:text-rose-300 hover:bg-rose-500/10 transition-all"
              title="Clear editor contents"
            >
              Clear
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
            title={isExpanded ? 'Collapse editor height' : 'Expand editor height'}
          >
            {isExpanded ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Monaco Container */}
      <div className={`w-full ${heightClass} transition-all duration-200`}>
        <Editor
          height="100%"
          language={monacoLang}
          value={code}
          onChange={(val) => onChange?.(val || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            lineNumbersMinChars: isMobile ? 3 : 4,
            glyphMargin: false,
            folding: !isMobile,
            readOnly,
            wordWrap: 'on',
            automaticLayout: true,
            padding: { top: 12, bottom: 12 },
            renderLineHighlight: 'gutter',
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
          }}
        />
      </div>
    </div>
  )
}
