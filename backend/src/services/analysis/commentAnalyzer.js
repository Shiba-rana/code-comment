const { isGenericBoilerplate } = require('../validation/commentQuality.service');

function assessDocumentationQuality(commentText) {
  if (!commentText || typeof commentText !== 'string') {
    return 'none';
  }

  const clean = commentText.replace(/^[/*\s#]+|[/*\s]+$/g, '').trim();
  if (clean.length === 0) {
    return 'none';
  }

  // Generic boilerplate phrases are unacceptable and must be flagged as poor quality
  if (isGenericBoilerplate(commentText) || isGenericBoilerplate(clean)) {
    return 'poor';
  }

  if (
    clean.includes('@param') ||
    clean.includes('@returns') ||
    clean.includes('@return') ||
    clean.includes('@throws') ||
    clean.length > 50
  ) {
    return 'good';
  }

  if (clean.length > 15) {
    return 'moderate';
  }

  return 'poor';
}

function detectFileDocumentationStyle(comments) {
  let jsdocCount = 0;
  let blockCount = 0;
  let lineCount = 0;

  for (const c of comments) {
    if (c.style === 'jsdoc') jsdocCount++;
    else if (c.style === 'block') blockCount++;
    else lineCount++;
  }

  if (jsdocCount >= blockCount && jsdocCount >= lineCount && jsdocCount > 0) {
    return 'jsdoc';
  }
  if (blockCount > jsdocCount && blockCount >= lineCount) {
    return 'block';
  }
  if (lineCount > 0) {
    return 'line';
  }

  return 'jsdoc';
}

function analyzeSymbolComments(symbols, comments) {
  return symbols.map((symbol) => {
    let matchedComment = null;

    for (const c of comments) {
      if (c.endLine === symbol.startLine - 1 || c.endLine === symbol.startLine) {
        matchedComment = c;
        break;
      }
    }

    const quality = matchedComment
      ? assessDocumentationQuality(matchedComment.text)
      : 'none';

    return {
      ...symbol,
      hasDocumentation: Boolean(matchedComment),
      documentationQuality: quality,
      isGenericComment: quality === 'poor',
      existingCommentText: matchedComment ? matchedComment.text : null,
      existingCommentStyle: matchedComment ? matchedComment.style : null,
      existingCommentStartLine: matchedComment ? matchedComment.startLine : null,
      existingCommentEndLine: matchedComment ? matchedComment.endLine : null,
    };
  });
}

module.exports = {
  assessDocumentationQuality,
  detectFileDocumentationStyle,
  analyzeSymbolComments,
};
