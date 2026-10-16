/**
 * Comment Quality Validation Service
 * 
 * Enforces strict quality standards on all generated documentation comments:
 * - Detects and rejects generic boilerplate phrases.
 * - Enforces specificity to the actual code implementation.
 * - Detects unsupported/hallucinated claims (e.g., retries on non-retrying code).
 * - Implements the 10-point Quality Rubric:
 *     Accuracy (0-2), Specificity (0-2), Usefulness (0-2), Clarity (0-2), Non-redundancy (0-2).
 */

const FORBIDDEN_GENERIC_PATTERNS = [
  /processes\s+algorithmic\s+decision/i,
  /decision\s+branching\s+and\s+condition\s+checks/i,
  /handles\s+(?:the\s+)?logic\s+for/i,
  /performs\s+operations\s+on\s+the\s+provided\s+data/i,
  /manages\s+application\s+functionality/i,
  /processes\s+data\s+and\s+returns\s+the\s+result/i,
  /handles\s+the\s+component\s+rendering/i,
  /executes\s+the\s+required\s+functionality/i,
  /handles\s+operations\s+for/i,
  /handles\s+[a-zA-Z0-9_]+\s+operations\.?$/i,
  /performs\s+operations\s+on/i,
  /processes\s+operations/i,
  /default\s+functionality\s+for/i,
];

function isGenericBoilerplate(text) {
  if (!text || typeof text !== 'string') return true;
  const clean = text.replace(/[\/\*#]/g, ' ').replace(/\s+/g, ' ').trim();
  if (clean.length < 10) return true;

  for (const pattern of FORBIDDEN_GENERIC_PATTERNS) {
    if (pattern.test(clean)) {
      return true;
    }
  }

  return false;
}

function checkUnsupportedClaims(text, snippet = '') {
  const violations = [];
  const lowerText = text.toLowerCase();
  const lowerSnippet = snippet.toLowerCase();

  // 1. Check for claimed retries / backoff when snippet has none
  const claimsRetry = /\b(retries|retry|exponential\s+backoff|automatic\s+retry|retrying)\b/i.test(lowerText);
  const snippetHasRetry = /\b(retry|retries|attempt|maxretries|backoff)\b/i.test(lowerSnippet);
  if (claimsRetry && !snippetHasRetry) {
    violations.push('Claims retry or backoff behavior not present in source implementation.');
  }

  // 2. Check for claimed caching when snippet has none
  const claimsCache = /\b(caches|caching|memoizes|memoization|cache\s+invalidation)\b/i.test(lowerText);
  const snippetHasCache = /\b(cache|memo|memoize|lru|usememo)\b/i.test(lowerSnippet);
  if (claimsCache && !snippetHasCache) {
    violations.push('Claims caching or memoization behavior not present in source implementation.');
  }

  // 3. Check for claimed database / SQL operations when snippet has none
  const claimsDb = /\b(database|sql|queries\s+table|persists\s+to\s+db)\b/i.test(lowerText);
  const snippetHasDb = /\b(db|database|query|sql|prisma|repository|dao)\b/i.test(lowerSnippet);
  if (claimsDb && !snippetHasDb) {
    violations.push('Claims direct database operations not supported by source implementation.');
  }

  return violations;
}

function evaluateCommentQuality(commentText, symbol = {}, options = {}) {
  const minScore = Number(options.minScore || process.env.MIN_COMMENT_QUALITY_SCORE || 8);
  const snippet = symbol.source || symbol.sourceSnippet || '';
  const violations = [];

  if (!commentText || commentText.trim().length === 0) {
    return {
      passed: false,
      totalScore: 0,
      scores: { accuracy: 0, specificity: 0, usefulness: 0, clarity: 0, nonRedundancy: 0 },
      violations: ['Comment is empty.'],
      isGeneric: true,
      hasUnsupportedClaims: false,
    };
  }

  const isGeneric = isGenericBoilerplate(commentText);
  if (isGeneric) {
    violations.push('Comment contains rejected generic boilerplate phrases.');
  }

  const unsupportedClaims = checkUnsupportedClaims(commentText, snippet);
  violations.push(...unsupportedClaims);

  let accuracy = 2;
  let specificity = 2;
  let usefulness = 2;
  let clarity = 2;
  let nonRedundancy = 2;

  // Accuracy checks
  if (unsupportedClaims.length > 0) {
    accuracy = Math.max(0, accuracy - unsupportedClaims.length);
  }

  // If React component, must describe UI / rendering / props, not generic computation
  if (symbol.isReactComponent || symbol.type === 'component') {
    const mentionsUi = /\b(renders|display|displays|card|component|view|layout|indicator|button|modal|interface|props|ui)\b/i.test(commentText);
    if (!mentionsUi) {
      accuracy = Math.max(0, accuracy - 1);
      violations.push('React component comment fails to describe UI rendering or props responsibility.');
    }
  }

  // Specificity checks
  if (isGeneric) {
    specificity = 0;
  } else {
    // Check if comment references meaningful domain terms, props, parameters, or return concepts
    const symName = symbol.name || '';
    const cleanSymName = symName.replace(/^[A-Z]/, (c) => c.toLowerCase());
    const params = symbol.parameters || [];
    
    let hasConcreteReference = false;
    if (params.some((p) => commentText.toLowerCase().includes(p.toLowerCase()))) {
      hasConcreteReference = true;
    }
    if (symName && commentText.toLowerCase().includes(cleanSymName)) {
      hasConcreteReference = true;
    }
    // Check for domain words
    if (/\b(discount|order|payment|metric|budget|transaction|card|tax|balance|total|user|event|stream|token|amount)\b/i.test(commentText)) {
      hasConcreteReference = true;
    }

    if (!hasConcreteReference) {
      specificity = 1;
      violations.push('Comment lacks concrete references to parameters, properties, or domain terms.');
    }
  }

  // Usefulness checks
  if (isGeneric) {
    usefulness = 0;
  } else if (commentText.length < 35 && !commentText.includes('@param') && !commentText.includes('Args:')) {
    usefulness = 1;
  }

  // Clarity checks
  if (!commentText.includes('/**') && !commentText.includes('"""') && !commentText.includes('//') && !commentText.includes('#')) {
    clarity = 1;
    violations.push('Comment does not adhere to standard documentation formatting conventions.');
  }

  // Non-redundancy checks
  const justRestatesName = new RegExp(`^\\s*(?:\\/\\*\\*|"""|\\/\\/|#)?\\s*${symbol.name}\\s+(?:function|method|component)?\\.?\\s*(?:\\*\\/|""")?$`, 'i');
  if (justRestatesName.test(commentText)) {
    nonRedundancy = 0;
    violations.push('Comment merely repeats the symbol identifier without explanatory value.');
  }

  const totalScore = accuracy + specificity + usefulness + clarity + nonRedundancy;
  const passed = totalScore >= minScore && !isGeneric && unsupportedClaims.length === 0;

  return {
    passed,
    totalScore,
    scores: {
      accuracy,
      specificity,
      usefulness,
      clarity,
      nonRedundancy,
    },
    violations,
    isGeneric,
    hasUnsupportedClaims: unsupportedClaims.length > 0,
  };
}

module.exports = {
  evaluateCommentQuality,
  isGenericBoilerplate,
  checkUnsupportedClaims,
  FORBIDDEN_GENERIC_PATTERNS,
};
