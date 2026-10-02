import { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react'
import { DiffEditor } from '@monaco-editor/react'

const LANG_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  java: 'java',
  python: 'python',
}

const DiffViewer = forwardRef(function DiffViewer(
  { originalCode, updatedCode, language },
  ref
) {
  const monacoLang = LANG_MAP[language] || 'javascript'
  const diffInstanceRef = useRef(null)
  const userToggledRef = useRef(false)
  const [isInline, setIsInline] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 768 : false))
  const [editorHeight, setEditorHeight] = useState('480px')
  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      if (width < 640) {
        setFontSize(12)
        setEditorHeight('360px')
      } else if (width < 768) {
        setFontSize(13)
        setEditorHeight('380px')
      } else if (width < 1024) {
        setFontSize(13)
        setEditorHeight('440px')
      } else {
        setFontSize(14)
        setEditorHeight('500px')
      }

      if (!userToggledRef.current) {
        setIsInline(width < 768)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useImperativeHandle(ref, () => ({
    goToLine(lineNumber) {
      if (!diffInstanceRef.current || !lineNumber) return
      const modifiedEditor = diffInstanceRef.current.getModifiedEditor()
      if (modifiedEditor) {
        modifiedEditor.revealLineInCenter(lineNumber)
        modifiedEditor.setPosition({ lineNumber, column: 1 })
        modifiedEditor.focus()
      }
    },
  }))

  function handleMount(editor) {
    diffInstanceRef.current = editor
  }

  function handleToggle(inlineValue) {
    userToggledRef.current = true
    setIsInline(inlineValue)
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#2ea04370]" /> Added
          <span className="inline-block w-2.5 h-2.5 rounded-sm bg-[#f8514970] ml-1" /> Removed
        </div>

        <div className="flex items-center rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] p-0.5 text-xs">
          <button
            type="button"
            onClick={() => handleToggle(false)}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              !isInline
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            Split
          </button>
          <button
            type="button"
            onClick={() => handleToggle(true)}
            className={`px-2.5 py-1 rounded font-medium transition-all ${
              isInline
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-white'
            }`}
          >
            Unified
          </button>
        </div>
      </div>

      <div className="editor-wrapper w-full">
        <DiffEditor
          height={editorHeight}
          language={monacoLang}
          original={originalCode}
          modified={updatedCode}
          theme="vs-dark"
          onMount={handleMount}
          options={{
            fontSize,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            readOnly: true,
            renderSideBySide: !isInline,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            smoothScrolling: true,
            originalEditable: false,
            wordWrap: 'on',
          }}
        />
      </div>
    </div>
  )
})

export default DiffViewer
