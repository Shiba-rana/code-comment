const { getParserForLanguage } = require('../../parsers');

function extractFileImports(code) {
  const imports = [];
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('import ') || trimmed.startsWith('const ') && trimmed.includes('require(')) {
      imports.push(trimmed);
    }
  }
  return imports;
}

function extractFileConstants(code) {
  const constants = [];
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(?:export\s+)?const\s+([A-Z0-9_]{3,})\s*=\s*(.+?);?$/);
    if (match) {
      constants.push({ name: match[1], value: match[2] });
    }
  }
  return constants;
}

function extractSymbols(code, language = 'javascript') {
  const parser = getParserForLanguage(language);
  const ast = parser.parse(code);
  const rawSymbols = parser.extractSymbols(ast, code);
  const comments = parser.extractComments(ast, code);
  const imports = extractFileImports(code);
  const constants = extractFileConstants(code);

  const symbols = rawSymbols.map((sym) => {
    let precedingComment = null;
    for (const c of comments) {
      if (c.endLine === sym.startLine - 1 || c.endLine === sym.startLine) {
        precedingComment = c;
        break;
      }
    }

    return {
      ...sym,
      hasDocumentation: Boolean(precedingComment || sym.hasDocumentation),
      existingComment: precedingComment ? precedingComment.text : sym.existingComment || null,
    };
  });

  return {
    symbols,
    ast,
    comments,
    fileMetadata: {
      totalLines: code.split('\n').length,
      imports,
      constants,
    },
  };
}

module.exports = {
  extractSymbols,
  extractFileImports,
  extractFileConstants,
};
