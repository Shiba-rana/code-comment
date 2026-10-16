function identifyMainPoint(symbol) {
  const isTrivial = (symbol.type === 'getter' || symbol.type === 'setter') ||
    (symbol.lineCount <= 3 &&
      (!symbol.parameters || symbol.parameters.length === 0) &&
      (symbol.cyclomaticComplexity <= 1) &&
      !symbol.async &&
      !symbol.isReactComponent &&
      !symbol.hasErrorHandling &&
      (!symbol.externalCalls || symbol.externalCalls.length === 0));

  if (isTrivial) {
    return { isMainPoint: false, mainPointType: null, reason: 'Self-explanatory trivial function or getter' };
  }

  if (symbol.isReactComponent || symbol.type === 'component') {
    const propCount = (symbol.parameters || []).length;
    const propDesc = propCount > 0 ? ` with props (${symbol.parameters.join(', ')})` : '';
    return {
      isMainPoint: true,
      mainPointType: 'REACT_COMPONENT',
      reason: `Renders ${symbol.name} UI component${propDesc}`,
    };
  }

  if (/^(?:calculate|compute|calc|getDiscount|getTotal|evaluate)/i.test(symbol.name)) {
    return {
      isMainPoint: true,
      mainPointType: 'CALCULATION',
      reason: `Calculates ${symbol.name} based on domain business rules and parameters`,
    };
  }

  if (symbol.exported) {
    return {
      isMainPoint: true,
      mainPointType: 'API_ENTRYPOINT',
      reason: `Exported public interface or module API (${symbol.name})`,
    };
  }

  if (symbol.type === 'class') {
    return {
      isMainPoint: true,
      mainPointType: 'CLASS_DECLARATION',
      reason: 'Core class structure and domain model',
    };
  }

  if (symbol.async && symbol.externalCalls && symbol.externalCalls.length > 0) {
    return {
      isMainPoint: true,
      mainPointType: 'SERVICE_ORCHESTRATOR',
      reason: `Asynchronous service orchestrator coordinating external operations in ${symbol.name}`,
    };
  }

  if (symbol.hasErrorHandling && (symbol.cyclomaticComplexity > 2 || symbol.lineCount > 10)) {
    return {
      isMainPoint: true,
      mainPointType: 'BUSINESS_WORKFLOW',
      reason: `Core business workflow with validation and error resilience in ${symbol.name}`,
    };
  }

  if (symbol.cyclomaticComplexity >= 4) {
    return {
      isMainPoint: true,
      mainPointType: 'BUSINESS_LOGIC',
      reason: `Evaluates domain decision rules and conditions in ${symbol.name}`,
    };
  }

  const mainNamePattern = /^(?:process|handle|execute|run|create|build|render|init|login|logout|submit|validate|checkout|calc|transform|fetch|load|parse|save|update|delete|sync|start|stop)[A-Z0-9_]/i;
  if (mainNamePattern.test(symbol.name) && symbol.lineCount >= 5) {
    return {
      isMainPoint: true,
      mainPointType: 'PRIMARY_OPERATION',
      reason: `Primary operation handler (${symbol.name}) managing application workflow`,
    };
  }

  if (symbol.lineCount > 15) {
    return {
      isMainPoint: true,
      mainPointType: 'MAJOR_FUNCTION',
      reason: 'Substantial multi-statement logic block',
    };
  }

  return {
    isMainPoint: false,
    mainPointType: 'UTILITY',
    reason: 'Secondary helper routine',
  };
}

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

  const mainPointInfo = symbol.isMainPoint !== undefined ? symbol : identifyMainPoint(symbol);
  if (mainPointInfo.isMainPoint) {
    score += 4;
    breakdown.mainPoint = 4;
  }

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

  const isTrivial = (symbol.type === 'getter' || symbol.type === 'setter') ||
    (symbol.lineCount <= 3 &&
      (!symbol.parameters || symbol.parameters.length === 0) &&
      (symbol.cyclomaticComplexity <= 1) &&
      !symbol.async &&
      !symbol.isReactComponent &&
      !symbol.hasErrorHandling &&
      (!symbol.externalCalls || symbol.externalCalls.length === 0));

  if (isTrivial) {
    score -= 4;
    breakdown.trivial = -4;
  } else if (symbol.lineCount <= 2 && !symbol.exported && !symbol.async) {
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
      // Poor or generic boilerplate documentation requires improvement/replacement
      score += 2;
      breakdown.needsImprovement = 2;
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
    const mainPointInfo = identifyMainPoint(symbol);
    const scoring = calculateDocumentationScore({ ...symbol, ...mainPointInfo }, options);
    return {
      ...symbol,
      isMainPoint: mainPointInfo.isMainPoint,
      mainPointType: mainPointInfo.mainPointType,
      mainPointReason: mainPointInfo.reason,
      documentationScore: scoring.score,
      documentationThreshold: scoring.threshold,
      scoreBreakdown: scoring.breakdown,
      recommendation: scoring.recommendation,
    };
  });
}

module.exports = {
  identifyMainPoint,
  calculateDocumentationScore,
  scoreAllSymbols,
};
