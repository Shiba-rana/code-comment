const SUPPORTED_LANGUAGES = {
  javascript: {
    extensions: ['.js', '.mjs', '.cjs'],
    monacoId: 'javascript',
    displayName: 'JavaScript',
  },
  typescript: {
    extensions: ['.ts'],
    monacoId: 'typescript',
    displayName: 'TypeScript',
  },
  jsx: {
    extensions: ['.jsx'],
    monacoId: 'javascript',
    displayName: 'JSX',
  },
  tsx: {
    extensions: ['.tsx'],
    monacoId: 'typescript',
    displayName: 'TSX',
  },
  java: {
    extensions: ['.java'],
    monacoId: 'java',
    displayName: 'Java',
  },
  python: {
    extensions: ['.py'],
    monacoId: 'python',
    displayName: 'Python',
  },
};

function detectLanguageFromFilename(filename) {
  if (!filename) return null;

  const ext = '.' + filename.split('.').pop().toLowerCase();

  for (const [langKey, langConfig] of Object.entries(SUPPORTED_LANGUAGES)) {
    if (langConfig.extensions.includes(ext)) {
      return langKey;
    }
  }

  return null;
}

function isSupportedLanguage(language) {
  return language && SUPPORTED_LANGUAGES.hasOwnProperty(language.toLowerCase());
}

function getSupportedLanguages() {
  return Object.keys(SUPPORTED_LANGUAGES);
}

module.exports = {
  SUPPORTED_LANGUAGES,
  detectLanguageFromFilename,
  isSupportedLanguage,
  getSupportedLanguages,
};
