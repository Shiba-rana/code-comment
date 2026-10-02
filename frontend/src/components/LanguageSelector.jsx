const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx',        label: 'JSX' },
  { value: 'tsx',        label: 'TSX' },
  { value: 'java',       label: 'Java' },
  { value: 'python',     label: 'Python' },
]

export default function LanguageSelector({ value, onChange, disabled }) {
  return (
    <select
      id="language-selector"
      className="select-field w-full"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      aria-label="Select programming language"
    >
      {LANGUAGES.map((lang) => (
        <option key={lang.value} value={lang.value}>
          {lang.label}
        </option>
      ))}
    </select>
  )
}
