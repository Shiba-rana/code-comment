const { findMatchingSymbol, determineInsertionPoint } = require('./insertionPoint.service');

function formatCommentText(rawText, indent = '') {
  if (!rawText) return '';
  const lines = rawText.split('\n');

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return indent;
      if (trimmed.startsWith('*') && !trimmed.startsWith('*/')) {
        return `${indent} ${trimmed}`;
      }
      if (trimmed === '*/') {
        return `${indent} */`;
      }
      return `${indent}${trimmed}`;
    })
    .join('\n');
}

function hasPrecedingComment(lines, lineIndex) {
  let prevIdx = lineIndex - 1;
  while (prevIdx >= 0 && lines[prevIdx].trim() === '') {
    prevIdx--;
  }
  if (prevIdx < 0) return false;

  const prevLine = lines[prevIdx].trim();
  return (
    prevLine.startsWith('//') ||
    prevLine.startsWith('/*') ||
    prevLine.startsWith('*') ||
    prevLine.endsWith('*/')
  );
}

function applyCommentPatches({ originalCode, instructions, symbols, parser }) {
  if (!instructions || instructions.length === 0) {
    return {
      updatedCode: originalCode,
      appliedChanges: [],
      skippedChanges: [],
    };
  }

  const lines = originalCode.split('\n');
  const patchCandidates = [];
  const skippedChanges = [];

  for (const inst of instructions) {
    if (inst.decision !== 'DOCUMENT' || !inst.autoApply) {
      skippedChanges.push({
        symbol: inst.target?.name || 'unknown',
        category: inst.documentation?.category || 'GENERAL',
        reason: inst.reason || 'Decision was SKIP or below confidence threshold',
        confidence: inst.confidence,
        applied: false,
      });
      continue;
    }

    const symbol = findMatchingSymbol(
      inst.target?.name,
      inst.target?.startLine,
      symbols
    );

    if (!symbol) {
      skippedChanges.push({
        symbol: inst.target?.name || 'unknown',
        category: inst.documentation?.category || 'GENERAL',
        reason: 'Symbol could not be located in AST',
        confidence: inst.confidence,
        applied: false,
      });
      continue;
    }

    if (symbol.hasDocumentation) {
      skippedChanges.push({
        symbol: symbol.name,
        category: inst.documentation?.category || 'GENERAL',
        reason: 'Symbol already has documentation (prevent duplicate)',
        confidence: inst.confidence,
        applied: false,
      });
      continue;
    }

    const loc = determineInsertionPoint({ symbol, code: originalCode, parser });
    if (!loc) continue;

    if (hasPrecedingComment(lines, loc.lineIndex)) {
      skippedChanges.push({
        symbol: symbol.name,
        category: inst.documentation?.category || 'GENERAL',
        reason: 'Preceding comment already present at insertion point',
        confidence: inst.confidence,
        applied: false,
      });
      continue;
    }

    const formattedComment = formatCommentText(
      inst.documentation?.text || '',
      loc.indent
    );

    patchCandidates.push({
      lineIndex: loc.lineIndex,
      targetLineNumber: loc.targetLineNumber,
      formattedComment,
      symbolName: symbol.name,
      category: inst.documentation?.category || 'GENERAL',
      reason: inst.reason || 'Documentation added',
      confidence: inst.confidence,
    });
  }

  patchCandidates.sort((a, b) => b.lineIndex - a.lineIndex);

  const appliedChanges = [];
  const workingLines = [...lines];

  for (const patch of patchCandidates) {
    const isDuplicate = appliedChanges.some((a) => a.symbol === patch.symbolName);
    if (isDuplicate) {
      skippedChanges.push({
        symbol: patch.symbolName,
        category: patch.category,
        reason: 'Duplicate patch for same symbol prevented',
        confidence: patch.confidence,
        applied: false,
      });
      continue;
    }

    workingLines.splice(patch.lineIndex, 0, patch.formattedComment);

    appliedChanges.push({
      symbol: patch.symbolName,
      category: patch.category,
      line: patch.targetLineNumber,
      reason: patch.reason,
      confidence: patch.confidence,
      applied: true,
      text: patch.formattedComment,
    });
  }

  appliedChanges.reverse();

  return {
    updatedCode: workingLines.join('\n'),
    appliedChanges,
    skippedChanges,
  };
}

module.exports = {
  applyCommentPatches,
  formatCommentText,
  hasPrecedingComment,
};
