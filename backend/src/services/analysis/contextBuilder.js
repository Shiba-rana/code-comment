function findRelevantImports(snippet, imports) {
  if (!imports || imports.length === 0) return [];
  return imports.filter((imp) => {
    const tokens = imp.replace(/[{}(),;*]/g, ' ').split(/\s+/).filter(Boolean);
    return tokens.some((token) => token.length > 2 && snippet.includes(token));
  });
}

function findRelevantConstants(snippet, constants) {
  if (!constants || constants.length === 0) return [];
  return constants.filter((c) => snippet.includes(c.name));
}

function extractThrownErrors(snippet) {
  if (!snippet) return [];
  const errors = [];
  const regex = /(?:throw\s+new\s+([A-Za-z0-9_]+)\s*\((.*?)\)|raise\s+([A-Za-z0-9_]+)\s*\((.*?)\))/g;
  let match;
  while ((match = regex.exec(snippet)) !== null) {
    const errType = match[1] || match[3] || 'Error';
    const rawMsg = (match[2] || match[4] || '').replace(/['"]/g, '').trim();
    errors.push(rawMsg ? `${errType}: "${rawMsg}"` : errType);
  }
  return errors;
}

function extractReturnExpressions(snippet) {
  if (!snippet) return [];
  const returns = [];
  const regex = /return\s+([^\n;]+)/g;
  let match;
  while ((match = regex.exec(snippet)) !== null) {
    const expr = match[1].trim();
    if (expr && expr.length <= 100) {
      returns.push(expr);
    }
  }
  return returns;
}

function extractAwaitedCalls(snippet) {
  if (!snippet) return [];
  const awaited = [];
  const regex = /await\s+([a-zA-Z0-9_$.]+(?:\(.*?\))?)/g;
  let match;
  while ((match = regex.exec(snippet)) !== null) {
    awaited.push(match[1].slice(0, 80));
  }
  return awaited;
}

function buildSymbolContext(symbol, fileMetadata = {}) {
  const snippet = symbol.sourceSnippet || '';
  const relevantImports = findRelevantImports(snippet, fileMetadata.imports || []);
  const relevantConstants = findRelevantConstants(snippet, fileMetadata.constants || []);
  const thrownErrors = extractThrownErrors(snippet);
  const returnExpressions = extractReturnExpressions(snippet);
  const awaitedCalls = extractAwaitedCalls(snippet);

  const signature = `${symbol.async ? 'async ' : ''}${symbol.type} ${symbol.name}(${(symbol.parameters || []).join(', ')})`;

  return {
    name: symbol.name,
    type: symbol.type,
    signature,
    exported: symbol.exported,
    async: symbol.async,
    startLine: symbol.startLine,
    endLine: symbol.endLine,
    lineCount: symbol.lineCount,
    parameters: symbol.parameters,
    externalCalls: symbol.externalCalls,
    hasErrorHandling: symbol.hasErrorHandling,
    isMainPoint: Boolean(symbol.isMainPoint),
    mainPointType: symbol.mainPointType || 'UTILITY',
    mainPointReason: symbol.mainPointReason || null,
    existingDocumentation: symbol.existingComment || 'None',
    relevantImports,
    relevantConstants: relevantConstants.map((c) => `${c.name} = ${c.value}`),
    isReactComponent: Boolean(symbol.isReactComponent),
    hooksUsed: symbol.hooksUsed || [],
    renderedChildren: symbol.jsxElements || [],
    hasJsx: Boolean(symbol.hasJsx),
    thrownErrors,
    returnExpressions,
    awaitedCalls,
    source: snippet,
  };
}

function buildBatchContext(symbols, fileMetadata = {}) {
  return symbols.map((symbol) => buildSymbolContext(symbol, fileMetadata));
}

module.exports = {
  buildSymbolContext,
  buildBatchContext,
};
