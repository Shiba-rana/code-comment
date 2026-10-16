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
    if (part.removed || part.added) {
      const lines = part.value.split('\n');
      let inDocstring = false;
      let inBlockComment = false;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (inDocstring) {
          if (trimmed.includes('"""') || trimmed.includes("'''")) {
            inDocstring = false;
          }
          continue;
        }

        if (inBlockComment) {
          if (trimmed.includes('*/')) {
            inBlockComment = false;
          }
          continue;
        }

        if (trimmed.startsWith('/*')) {
          if (!trimmed.includes('*/')) inBlockComment = true;
          continue;
        }

        if (trimmed.startsWith('"""')) {
          if (trimmed.length > 3 && trimmed.slice(3).includes('"""')) {
            // closed on same line
          } else {
            inDocstring = true;
          }
          continue;
        }

        if (trimmed.startsWith("'''")) {
          if (trimmed.length > 3 && trimmed.slice(3).includes("'''")) {
            // closed on same line
          } else {
            inDocstring = true;
          }
          continue;
        }

        if (!isCommentLine(line)) {
          commentOnly = false;
          const action = part.removed ? 'removal' : 'addition';
          violations.push(`Unexpected code ${action}: "${line.slice(0, 80)}"`);
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
