import { useRef } from 'react'

const ACCEPTED_EXTENSIONS = '.js,.mjs,.cjs,.ts,.jsx,.tsx,.java,.py'

export default function FileUploader({ onFileLoaded, disabled }) {
  const inputRef = useRef(null)

  function handleFile(file) {
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      onFileLoaded({
        filename: file.name,
        content: e.target.result,
      })
    }
    reader.onerror = () => {
      alert('Could not read the file. Please try again.')
    }
    reader.readAsText(file)
  }

  function handleChange(e) {
    handleFile(e.target.files?.[0])
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    handleFile(e.dataTransfer.files?.[0])
  }

  function handleDragOver(e) {
    e.preventDefault()
  }

  return (
    <div
      className="upload-zone w-full sm:w-auto"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{ opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>
      <span className="truncate">Upload file or drag & drop</span>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS}
        onChange={handleChange}
        style={{ display: 'none' }}
        aria-label="Upload source code file"
      />
    </div>
  )
}
