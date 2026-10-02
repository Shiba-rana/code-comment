function findMatchingSymbol(targetName, targetLine, symbols) {
  if (!symbols || symbols.length === 0) return null;

  const exact = symbols.find((s) => s.name === targetName && (!targetLine || Math.abs(s.startLine - targetLine) <= 3));
  if (exact) return exact;

  const byName = symbols.find((s) => s.name === targetName);
  if (byName) return byName;

  if (targetLine) {
    const byLine = symbols.find((s) => Math.abs(s.startLine - targetLine) <= 1);
    if (byLine) return byLine;
  }

  return null;
}

function determineInsertionPoint({ symbol, code, parser }) {
  if (!symbol) return null;

  const lines = code.split('\n');
  const targetLineIndex = Math.max(0, symbol.startLine - 1);
  const targetLine = lines[targetLineIndex] || '';

  const indentMatch = targetLine.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : '';

  return {
    symbolName: symbol.name,
    targetLineNumber: symbol.startLine,
    lineIndex: targetLineIndex,
    indent,
    startIndex: symbol.startIndex,
  };
}

module.exports = {
  findMatchingSymbol,
  determineInsertionPoint,
};
