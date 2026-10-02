import { useState, useEffect } from 'react'
import Editor from '@monaco-editor/react'

const LANG_MAP = {
  javascript: 'javascript',
  typescript: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  java: 'java',
  python: 'python',
}

export default function CodeEditor({ code, onChange, language, readOnly = false }) {
  const monacoLang = LANG_MAP[language] || 'javascript'
  const [editorHeight, setEditorHeight] = useState('420px')
  const [fontSize, setFontSize] = useState(14)

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      if (width < 640) {
        setEditorHeight('320px')
        setFontSize(12)
      } else if (width < 1024) {
        setEditorHeight('380px')
        setFontSize(13)
      } else {
        setEditorHeight('440px')
        setFontSize(14)
      }
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="editor-wrapper w-full">
      <Editor
        height={editorHeight}
        language={monacoLang}
        value={code}
        onChange={(val) => onChange?.(val || '')}
        theme="vs-dark"
        options={{
          fontSize,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          lineNumbers: 'on',
          readOnly,
          wordWrap: 'on',
          padding: { top: 14, bottom: 14 },
          renderLineHighlight: 'gutter',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
        }}
      />
    </div>
  )
}
