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

function buildSymbolContext(symbol, fileMetadata = {}) {
  const snippet = symbol.sourceSnippet || '';
  const relevantImports = findRelevantImports(snippet, fileMetadata.imports || []);
  const relevantConstants = findRelevantConstants(snippet, fileMetadata.constants || []);

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
    existingDocumentation: symbol.existingComment || 'None',
    relevantImports,
    relevantConstants: relevantConstants.map((c) => `${c.name} = ${c.value}`),
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
