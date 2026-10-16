import {
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import { DiffEditor } from "@monaco-editor/react";

const LANG_MAP = {
  javascript: "javascript",
  typescript: "typescript",
  jsx: "javascript",
  tsx: "typescript",
  java: "java",
  python: "python",
};

const DiffViewer = forwardRef(function DiffViewer(
  { originalCode, updatedCode, language },
  ref,
) {
  const monacoLang = LANG_MAP[language] || "javascript";
  const diffInstanceRef = useRef(null);
  const userToggledRef = useRef(false);
  const [isInline, setIsInline] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [fontSize, setFontSize] = useState(14);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Approximate added lines
  const origLines = (originalCode || '').split('\n').length;
  const updLines = (updatedCode || '').split('\n').length;
  const addedLines = Math.max(0, updLines - origLines);

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth;
      if (width < 640) {
        setFontSize(12);
      } else if (width < 768) {
        setFontSize(13);
      } else if (width < 1024) {
        setFontSize(13);
      } else {
        setFontSize(14);
      }

      if (!userToggledRef.current) {
        setIsInline(width < 768);
      }

      diffInstanceRef.current?.layout();
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useImperativeHandle(ref, () => ({
    goToLine(lineNumber) {
      if (!diffInstanceRef.current || !lineNumber) return;
      const modifiedEditor = diffInstanceRef.current.getModifiedEditor();
      if (modifiedEditor) {
        modifiedEditor.revealLineInCenter(lineNumber);
        modifiedEditor.setPosition({ lineNumber, column: 1 });
        modifiedEditor.focus();
      }
    },
  }));

  function handleMount(editor) {
    diffInstanceRef.current = editor;
    editor.layout();
  }

  function handleToggle(inlineValue) {
    userToggledRef.current = true;
    setIsInline(inlineValue);
    setTimeout(() => {
      diffInstanceRef.current?.layout();
    }, 50);
  }

  async function handleCopyDocumented() {
    if (!updatedCode) return;
    try {
      await navigator.clipboard.writeText(updatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  const heightClass = isExpanded
    ? 'h-[620px] sm:h-[700px] lg:h-[800px]'
    : 'h-[360px] sm:h-[460px] lg:h-[520px]';

  return (
    <div className="flex flex-col gap-3 max-w-full w-full">
      {/* Top Diff Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2.5 px-1">
        <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] font-mono">
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-medium">
            +{addedLines} lines added
          </span>
          <span className="hidden sm:inline text-[var(--text-muted)]">
            Original (Left) vs Documented (Right)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopyDocumented}
            className="px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-white bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-all flex items-center gap-1.5"
            title="Copy documented code"
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
                <span>Copy Result</span>
              </>
            )}
          </button>

          {/* View Mode Toggle: Split vs Unified */}
          <div className="flex items-center rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleToggle(false)}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                !isInline
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => handleToggle(true)}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                isInline
                  ? "bg-[var(--accent)] text-white shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-white"
              }`}
            >
              Unified
            </button>
          </div>

          {/* Expand Height Toggle */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded((prev) => !prev);
              setTimeout(() => diffInstanceRef.current?.layout(), 50);
            }}
            className="p-1.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
            title={isExpanded ? 'Collapse height' : 'Expand height'}
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

      {/* Monaco Diff Container */}
      <div className={`editor-wrapper w-full ${heightClass} transition-all duration-200`}>
        <DiffEditor
          height="100%"
          language={monacoLang}
          original={originalCode}
          modified={updatedCode}
          theme="vs-dark"
          onMount={handleMount}
          options={{
            fontSize,
            fontFamily:
              "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
            readOnly: true,
            renderSideBySide: !isInline,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 12, bottom: 12 },
            smoothScrolling: true,
            originalEditable: false,
            wordWrap: "on",
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
});

export default DiffViewer;
