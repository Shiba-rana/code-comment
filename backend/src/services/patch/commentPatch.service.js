const { findMatchingSymbol, determineInsertionPoint } = require('./insertionPoint.service');
const { isGenericBoilerplate } = require('../validation/commentQuality.service');

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
      const leadingSpaces = (line.match(/^(\s*)/) || [''])[0];
      return `${indent}${leadingSpaces}${trimmed}`;
    })
    .join('\n');
}

function findPrecedingCommentRange(lines, lineIndex) {
  let endIdx = lineIndex - 1;
  while (endIdx >= 0 && lines[endIdx].trim() === '') {
    endIdx--;
  }
  if (endIdx < 0) return null;

  const endLine = lines[endIdx].trim();
  const isComment =
    endLine.startsWith('//') ||
    endLine.startsWith('/*') ||
    endLine.startsWith('*') ||
    endLine.endsWith('*/') ||
    endLine.startsWith('#') ||
    endLine.endsWith('"""') ||
    endLine.endsWith("'''");
  if (!isComment) return null;

  let startIdx = endIdx;
  if (endLine.endsWith('*/') || endLine.endsWith('"""') || endLine.endsWith("'''")) {
    const isTriple = endLine.endsWith('"""') || endLine.endsWith("'''");
    const quote = isTriple ? endLine.slice(-3) : null;
    while (startIdx > 0) {
      const line = lines[startIdx].trim();
      if (isTriple) {
        if (startIdx < endIdx && (line.startsWith(quote) || line.includes(quote))) {
          break;
        }
      } else {
        if (line.startsWith('/*')) {
          break;
        }
      }
      startIdx--;
    }
  } else {
    const prefix = endLine.startsWith('//') ? '//' : endLine.startsWith('#') ? '#' : null;
    if (prefix) {
      while (startIdx > 0 && lines[startIdx - 1].trim().startsWith(prefix)) {
        startIdx--;
      }
    }
  }

  const commentText = lines.slice(startIdx, endIdx + 1).join('\n');
  return {
    startLineIndex: startIdx,
    endLineIndex: endIdx,
    deleteCount: endIdx - startIdx + 1,
    commentText,
  };
}

function hasPrecedingComment(lines, lineIndex) {
  return Boolean(findPrecedingCommentRange(lines, lineIndex));
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

    const loc = determineInsertionPoint({ symbol, code: originalCode, parser });
    if (!loc) continue;

    const precedingRange = findPrecedingCommentRange(lines, loc.lineIndex);
    const isPoorOrGenericDoc =
      symbol.isGenericComment ||
      symbol.documentationQuality === 'poor' ||
      Boolean(inst.replaceExisting) ||
      Boolean(precedingRange && isGenericBoilerplate(precedingRange.commentText));

    if (symbol.hasDocumentation && !isPoorOrGenericDoc) {
      skippedChanges.push({
        symbol: symbol.name,
        category: inst.documentation?.category || 'GENERAL',
        reason: 'Symbol already has documentation (prevent duplicate)',
        confidence: inst.confidence,
        applied: false,
      });
      continue;
    }

    if (precedingRange && !isPoorOrGenericDoc) {
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

    const patchLineIndex =
      isPoorOrGenericDoc && precedingRange
        ? precedingRange.startLineIndex
        : loc.lineIndex;

    const deleteCount =
      isPoorOrGenericDoc && precedingRange
        ? precedingRange.deleteCount
        : 0;

    patchCandidates.push({
      lineIndex: patchLineIndex,
      deleteCount,
      targetLineNumber: loc.targetLineNumber,
      formattedComment,
      symbolName: symbol.name,
      category: inst.documentation?.category || 'GENERAL',
      reason: inst.reason || (isPoorOrGenericDoc ? 'Upgraded generic boilerplate documentation' : 'Documentation added'),
      confidence: inst.confidence,
      qualityScore: inst.qualityScore || 9,
      isMainPoint: Boolean(symbol.isMainPoint),
      mainPointType: symbol.mainPointType || null,
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
        isMainPoint: patch.isMainPoint,
        mainPointType: patch.mainPointType,
      });
      continue;
    }

    workingLines.splice(patch.lineIndex, patch.deleteCount || 0, patch.formattedComment);

    appliedChanges.push({
      symbol: patch.symbolName,
      category: patch.category,
      line: patch.targetLineNumber,
      reason: patch.reason,
      confidence: patch.confidence,
      qualityScore: patch.qualityScore,
      applied: true,
      text: patch.formattedComment,
      isMainPoint: patch.isMainPoint,
      mainPointType: patch.mainPointType,
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
