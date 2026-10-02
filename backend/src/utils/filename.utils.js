const path = require('path');

function sanitizeFilename(inputFilename) {
  if (!inputFilename || typeof inputFilename !== 'string') {
    return 'untitled.js';
  }

  const baseName = path.basename(inputFilename.trim());
  const clean = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const withoutLeadingDots = clean.replace(/^\.+/, '');

  if (!withoutLeadingDots || withoutLeadingDots === '') {
    return 'safe_file.js';
  }

  return withoutLeadingDots;
}

function isPathSafe(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return false;
  if (inputPath.includes('..') || path.isAbsolute(inputPath)) {
    return false;
  }
  return true;
}

module.exports = {
  sanitizeFilename,
  isPathSafe,
};
