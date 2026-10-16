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
    const comments = this.extractComments(ast, code);

    const hasPrecedingComment = (startLine) => {
      return comments.some((c) => c.endLine === startLine - 1 || c.endLine === startLine);
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      const fnMatch = trimmed.match(/^(?:async\s+)?def\s+([a-zA-Z0-9_]+)\s*\((.*?)\):/);
      const classMatch = trimmed.match(/^class\s+([a-zA-Z0-9_]+)(?:\((.*?)\))?:/);

      if (fnMatch || classMatch) {
        const isClass = Boolean(classMatch);
        const name = isClass ? classMatch[1] : fnMatch[1];
        const isExported = !name.startsWith('_');
        const isAsync = trimmed.startsWith('async ');
        const startLine = index + 1;

        const indentMatch = line.match(/^(\s*)/);
        const baseIndent = indentMatch ? indentMatch[1].length : 0;

        // Scan ahead to find endLine and extract full body snippet
        let endLine = startLine;
        const bodyLines = [line];
        for (let j = index + 1; j < lines.length; j++) {
          const nextLine = lines[j];
          const nextTrimmed = nextLine.trim();
          if (!nextTrimmed) {
            bodyLines.push(nextLine);
            continue;
          }
          const nextIndentMatch = nextLine.match(/^(\s*)/);
          const nextIndent = nextIndentMatch ? nextIndentMatch[1].length : 0;
          if (nextIndent <= baseIndent) {
            break;
          }
          endLine = j + 1;
          if (bodyLines.length < 50) {
            bodyLines.push(nextLine);
          }
        }

        const snippet = bodyLines.join('\n');
        const hasErrorHandling = /try:|except\s+|raise\s+/i.test(snippet);
        const complexity = 1 + (snippet.match(/\b(if|elif|for|while|except)\b/g) || []).length;

        const externalCalls = new Set();
        const callMatches = snippet.matchAll(/([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)?)\s*\(/g);
        for (const m of callMatches) {
          const callName = m[1];
          if (!['def', 'class', 'if', 'elif', 'while', 'for', 'return', 'print', name].includes(callName)) {
            externalCalls.add(callName);
          }
        }

        // Check for existing docstrings inside function/class body
        const firstBodyLine = lines[index + 1] ? lines[index + 1].trim() : '';
        const hasDocstring = firstBodyLine.startsWith('"""') || firstBodyLine.startsWith("'''");
        const hasDoc = hasDocstring || hasPrecedingComment(startLine);

        let params = [];
        if (!isClass) {
          params = fnMatch[2]
            .split(',')
            .map((p) => p.split('=')[0].split(':')[0].trim())
            .filter((p) => p && p !== 'self' && p !== 'cls');
        }

        symbols.push({
          name,
          type: isClass ? 'class' : 'function',
          exported: isExported,
          async: isAsync,
          startLine,
          endLine,
          parameters: params,
          lineCount: endLine - startLine + 1,
          hasDocumentation: hasDoc,
          hasErrorHandling,
          cyclomaticComplexity: complexity,
          externalCalls: Array.from(externalCalls).slice(0, 10),
          sourceSnippet: snippet.slice(0, 1500),
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
    let stripped = code.replace(/"""[\s\S]*?"""/g, '').replace(/'''[\s\S]*?'''/g, '');
    return stripped
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
