const BaseParser = require('./BaseParser');

class PythonParser extends BaseParser {
  constructor() {
    super('python');
  }

  parse(code) {
    return { type: 'python_module', code };
  }

  extractComments(ast, code) {
    const comments = [];
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('#')) {
        comments.push({
          text: trimmed,
          style: 'line',
          startLine: index + 1,
          endLine: index + 1,
        });
      }
    });
    return comments;
  }

  extractSymbols(ast, code) {
    const symbols = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const fnMatch = trimmed.match(/^def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/);
      const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)/);

      if (fnMatch) {
        symbols.push({
          name: fnMatch[1],
          type: 'function',
          exported: !fnMatch[1].startsWith('_'),
          async: trimmed.startsWith('async def'),
          startLine: index + 1,
          endLine: index + 1,
          parameters: fnMatch[2].split(',').map((p) => p.trim()).filter(Boolean),
          hasDocumentation: false,
          hasErrorHandling: false,
          cyclomaticComplexity: 1,
          sourceSnippet: line,
        });
      } else if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          exported: true,
          async: false,
          startLine: index + 1,
          endLine: index + 1,
          parameters: [],
          hasDocumentation: false,
          hasErrorHandling: false,
          cyclomaticComplexity: 1,
          sourceSnippet: line,
        });
      }
    });

    return symbols;
  }

  getInsertionLocation(symbol, code) {
    const lines = code.split('\n');
    const targetLineIndex = Math.max(0, symbol.startLine - 1);
    const targetLine = lines[targetLineIndex] || '';
    const indentMatch = targetLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1] : '';

    return {
      line: symbol.startLine,
      lineIndex: targetLineIndex,
      indent,
    };
  }

  validate(code) {
    if (typeof code !== 'string') {
      return { valid: false, errors: ['Code must be a string'] };
    }
    return { valid: true, errors: [] };
  }

  stripComments(code) {
    return code
      .split('\n')
      .map((line) => {
        const hashIdx = line.indexOf('#');
        return hashIdx !== -1 ? line.slice(0, hashIdx) : line;
      })
      .join('\n');
  }

  getStructuralRepresentation(ast) {
    return { type: 'python_module' };
  }
}

module.exports = PythonParser;
