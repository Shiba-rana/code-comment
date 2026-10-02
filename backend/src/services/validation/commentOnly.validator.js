const Diff = require('diff');

function isCommentLine(line) {
  const trimmed = line.trim();
  if (trimmed === '') return true;
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.endsWith('*/') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('"""') ||
    trimmed.startsWith("'''")
  );
}

function validateCommentOnlyChanges(originalCode, updatedCode) {
  const patches = Diff.diffLines(originalCode, updatedCode);
  let commentOnly = true;
  const violations = [];

  for (const part of patches) {
    if (part.removed) {
      const removedLines = part.value.split('\n').filter((l) => l.trim().length > 0);
      for (const line of removedLines) {
        if (!isCommentLine(line)) {
          commentOnly = false;
          violations.push(`Unexpected code removal: "${line.slice(0, 80)}"`);
        }
      }
    } else if (part.added) {
      const addedLines = part.value.split('\n').filter((l) => l.trim().length > 0);
      for (const line of addedLines) {
        if (!isCommentLine(line)) {
          commentOnly = false;
          violations.push(`Unexpected code addition: "${line.slice(0, 80)}"`);
        }
      }
    }
  }

  const unifiedDiff = Diff.createTwoFilesPatch(
    'original',
    'documented',
    originalCode,
    updatedCode,
    '',
    ''
  );

  return {
    valid: commentOnly,
    violations,
    diff: unifiedDiff,
  };
}

module.exports = {
  validateCommentOnlyChanges,
  isCommentLine,
};
