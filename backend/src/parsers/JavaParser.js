const BaseParser = require('./BaseParser');

class JavaParser extends BaseParser {
  constructor() {
    super('java');
  }

  parse(code) {
    return { type: 'java_compilation_unit', code };
  }

  extractComments(ast, code) {
    const comments = [];
    const lines = code.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('//')) {
        comments.push({
          text: trimmed,
          style: 'line',
          startLine: index + 1,
          endLine: index + 1,
        });
      } else if (trimmed.startsWith('/*')) {
        comments.push({
          text: trimmed,
          style: trimmed.startsWith('/**') ? 'jsdoc' : 'block',
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
      const classMatch = trimmed.match(/(?:public|protected|private)?\s*(?:static)?\s*class\s+([a-zA-Z0-9_]+)/);
      const methodMatch = trimmed.match(/(?:public|protected|private)\s+[\w<>[\]]+\s+([a-zA-Z0-9_]+)\s*\((.*?)\)/);

      if (classMatch) {
        symbols.push({
          name: classMatch[1],
          type: 'class',
          exported: trimmed.includes('public'),
          async: false,
          startLine: index + 1,
          endLine: index + 1,
          parameters: [],
          hasDocumentation: false,
          hasErrorHandling: false,
          cyclomaticComplexity: 1,
          sourceSnippet: line,
        });
      } else if (methodMatch) {
        symbols.push({
          name: methodMatch[1],
          type: 'method',
          exported: trimmed.includes('public'),
          async: false,
          startLine: index + 1,
          endLine: index + 1,
          parameters: methodMatch[2].split(',').map((p) => p.trim()).filter(Boolean),
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
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*/g, '');
  }

  getStructuralRepresentation(ast) {
    return { type: 'java_compilation_unit' };
  }
}

module.exports = JavaParser;
