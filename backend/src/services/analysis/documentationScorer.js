function calculateDocumentationScore(symbol, options = {}) {
  const mode = options.mode || 'recommended';
  const customThreshold = options.threshold !== undefined
    ? Number(options.threshold)
    : Number(process.env.DOCUMENTATION_SCORE_THRESHOLD || 3);

  let threshold = customThreshold;
  if (mode === 'minimal') {
    threshold = Math.max(customThreshold, 5);
  } else if (mode === 'detailed') {
    threshold = Math.min(customThreshold, 1);
  }

  let score = 0;
  const breakdown = {};

  if (symbol.exported) {
    score += 3;
    breakdown.exportedApi = 3;
  }

  if (symbol.cyclomaticComplexity > 3) {
    score += 2;
    breakdown.complexLogic = 2;
  }

  if (symbol.async || (symbol.externalCalls && symbol.externalCalls.length > 0)) {
    score += 2;
    breakdown.sideEffects = 2;
  }

  if (symbol.hasErrorHandling || (symbol.cyclomaticComplexity > 1 && symbol.type === 'function')) {
    score += 3;
    breakdown.businessLogic = 3;
  }

  if (symbol.lineCount > 12) {
    score += 1;
    breakdown.substantialLength = 1;
  }

  if (symbol.type === 'getter' || symbol.type === 'setter') {
    score -= 3;
    breakdown.getterSetter = -3;
  }

  if (symbol.lineCount <= 2 && !symbol.exported && !symbol.async) {
    score -= 3;
    breakdown.trivialOneLiner = -3;
  }

  if (symbol.hasDocumentation) {
    if (symbol.documentationQuality === 'good') {
      score -= 5;
      breakdown.alreadyDocumentedGood = -5;
    } else if (symbol.documentationQuality === 'moderate') {
      score -= 3;
      breakdown.alreadyDocumentedModerate = -3;
    } else {
      score -= 1;
      breakdown.alreadyDocumentedPoor = -1;
    }
  }

  const recommendation = score >= threshold ? 'DOCUMENT' : 'SKIP';

  return {
    score,
    threshold,
    breakdown,
    recommendation,
  };
}

function scoreAllSymbols(symbols, options = {}) {
  return symbols.map((symbol) => {
    const scoring = calculateDocumentationScore(symbol, options);
    return {
      ...symbol,
      documentationScore: scoring.score,
      documentationThreshold: scoring.threshold,
      scoreBreakdown: scoring.breakdown,
      recommendation: scoring.recommendation,
    };
  });
}

module.exports = {
  calculateDocumentationScore,
  scoreAllSymbols,
};
