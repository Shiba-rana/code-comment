const Parser = require('tree-sitter');
const TS = require('tree-sitter-typescript');
const BaseParser = require('./BaseParser');

class TypeScriptParser extends BaseParser {
  constructor(languageName = 'typescript') {
    super(languageName);
    this.isTsx = languageName === 'tsx' || languageName === 'jsx';
    this.parser = new Parser();
    this.parser.setLanguage(this.isTsx ? TS.tsx : TS.typescript);
  }

  parse(code) {
    if (typeof code !== 'string') {
      throw new Error('Code must be a string');
    }
    return this.parser.parse(code);
  }

  extractComments(ast, code) {
    const comments = [];
    const root = ast.rootNode || ast;

    const walk = (node) => {
      if (node.type === 'comment') {
        const text = node.text;
        const isJSDoc = text.startsWith('/**');
        const isBlock = text.startsWith('/*');
        const style = isJSDoc ? 'jsdoc' : isBlock ? 'block' : 'line';

        comments.push({
          text,
          style,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          startColumn: node.startPosition.column,
          endColumn: node.endPosition.column,
          startIndex: node.startIndex,
          endIndex: node.endIndex,
        });
      }

      for (let i = 0; i < node.childCount; i++) {
        walk(node.child(i));
      }
    };

    walk(root);
    return comments;
  }

  extractSymbols(ast, code) {
    const symbols = [];
    const root = ast.rootNode || ast;
    const comments = this.extractComments(ast, code);

    const findPrecedingComment = (startLine) => {
      for (const comment of comments) {
        if (comment.endLine === startLine - 1 || comment.endLine === startLine) {
          return comment;
        }
      }
      return null;
    };

    const extractParams = (paramNode) => {
      if (!paramNode) return [];
      const params = [];
      for (let i = 0; i < paramNode.childCount; i++) {
        const child = paramNode.child(i);
        if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
          const nameChild = child.childForFieldName('pattern') || child.child(0);
          if (nameChild) params.push(nameChild.text);
        } else if (child.type === 'identifier') {
          params.push(child.text);
        } else if (child.type === 'rest_pattern') {
          const arg = child.child(1);
          if (arg) params.push('...' + arg.text);
        } else if (child.type === 'formal_parameters') {
          params.push(...extractParams(child));
        }
      }
      return params;
    };

    const analyzeFunctionBody = (bodyNode) => {
      if (!bodyNode) {
        return {
          externalCalls: [],
          hasErrorHandling: false,
          cyclomaticComplexity: 1,
        };
      }

      const externalCalls = new Set();
      let hasErrorHandling = false;
      let complexity = 1;

      const walkBody = (node) => {
        if (node.type === 'call_expression') {
          const fn = node.childForFieldName('function');
          if (fn) {
            externalCalls.add(fn.text);
          }
        }

        if (
          node.type === 'try_statement' ||
          node.type === 'catch_clause' ||
          node.type === 'throw_statement'
        ) {
          hasErrorHandling = true;
        }

        if (
          node.type === 'if_statement' ||
          node.type === 'for_statement' ||
          node.type === 'for_in_statement' ||
          node.type === 'while_statement' ||
          node.type === 'do_statement' ||
          node.type === 'switch_case' ||
          node.type === 'ternary_expression' ||
          node.type === 'catch_clause'
        ) {
          complexity += 1;
        }

        if (node.type === 'binary_expression') {
          const op = node.child(1)?.text;
          if (op === '&&' || op === '||' || op === '??') {
            complexity += 1;
          }
        }

        for (let i = 0; i < node.childCount; i++) {
          walkBody(node.child(i));
        }
      };

      walkBody(bodyNode);

      return {
        externalCalls: Array.from(externalCalls).slice(0, 10),
        hasErrorHandling,
        cyclomaticComplexity: complexity,
      };
    };

    const processNode = (node, parentExport = null) => {
      const isExported = Boolean(parentExport);
      const effectiveNode = parentExport || node;
      const startLine = effectiveNode.startPosition.row + 1;
      const endLine = effectiveNode.endPosition.row + 1;

      if (node.type === 'export_statement') {
        for (let i = 0; i < node.childCount; i++) {
          const child = node.child(i);
          if (
            child.type === 'function_declaration' ||
            child.type === 'class_declaration' ||
            child.type === 'interface_declaration' ||
            child.type === 'type_alias_declaration' ||
            child.type === 'lexical_declaration' ||
            child.type === 'variable_declaration'
          ) {
            processNode(child, node);
          }
        }
        return;
      }

      if (node.type === 'function_declaration' || node.type === 'generator_function_declaration') {
        const nameNode = node.childForFieldName('name');
        const name = nameNode ? nameNode.text : 'anonymous';
        const isAsync = node.text.trim().startsWith('async');
        const params = extractParams(node.childForFieldName('parameters'));
        const bodyNode = node.childForFieldName('body');
        const bodyAnalysis = analyzeFunctionBody(bodyNode);
        const precedingComment = findPrecedingComment(startLine);

        symbols.push({
          name,
          type: 'function',
          exported: isExported,
          async: isAsync,
          startLine,
          endLine,
          startIndex: effectiveNode.startIndex,
          endIndex: effectiveNode.endIndex,
          parameters: params,
          lineCount: endLine - startLine + 1,
          externalCalls: bodyAnalysis.externalCalls,
          hasErrorHandling: bodyAnalysis.hasErrorHandling,
          cyclomaticComplexity: bodyAnalysis.cyclomaticComplexity,
          hasDocumentation: Boolean(precedingComment),
          existingComment: precedingComment ? precedingComment.text : null,
          nodeStartRow: effectiveNode.startPosition.row,
          nodeStartCol: effectiveNode.startPosition.column,
          sourceSnippet: node.text.slice(0, 500),
        });
        return;
      }

      if (node.type === 'interface_declaration') {
        const nameNode = node.childForFieldName('name');
        const name = nameNode ? nameNode.text : 'AnonymousInterface';
        const precedingComment = findPrecedingComment(startLine);

        symbols.push({
          name,
          type: 'interface',
          exported: isExported,
          async: false,
          startLine,
          endLine,
          startIndex: effectiveNode.startIndex,
          endIndex: effectiveNode.endIndex,
          parameters: [],
          lineCount: endLine - startLine + 1,
          externalCalls: [],
          hasErrorHandling: false,
          cyclomaticComplexity: 1,
          hasDocumentation: Boolean(precedingComment),
          existingComment: precedingComment ? precedingComment.text : null,
          nodeStartRow: effectiveNode.startPosition.row,
          nodeStartCol: effectiveNode.startPosition.column,
          sourceSnippet: node.text.slice(0, 500),
        });
        return;
      }

      if (node.type === 'type_alias_declaration') {
        const nameNode = node.childForFieldName('name');
        const name = nameNode ? nameNode.text : 'AnonymousType';
        const precedingComment = findPrecedingComment(startLine);

        symbols.push({
          name,
          type: 'type',
          exported: isExported,
          async: false,
          startLine,
          endLine,
          startIndex: effectiveNode.startIndex,
          endIndex: effectiveNode.endIndex,
          parameters: [],
          lineCount: endLine - startLine + 1,
          externalCalls: [],
          hasErrorHandling: false,
          cyclomaticComplexity: 1,
          hasDocumentation: Boolean(precedingComment),
          existingComment: precedingComment ? precedingComment.text : null,
          nodeStartRow: effectiveNode.startPosition.row,
          nodeStartCol: effectiveNode.startPosition.column,
          sourceSnippet: node.text.slice(0, 500),
        });
        return;
      }

      if (node.type === 'class_declaration') {
        const nameNode = node.childForFieldName('name');
        const name = nameNode ? nameNode.text : 'AnonymousClass';
        const precedingComment = findPrecedingComment(startLine);

        symbols.push({
          name,
          type: 'class',
          exported: isExported,
          async: false,
          startLine,
          endLine,
          startIndex: effectiveNode.startIndex,
          endIndex: effectiveNode.endIndex,
          parameters: [],
          lineCount: endLine - startLine + 1,
          externalCalls: [],
          hasErrorHandling: false,
          cyclomaticComplexity: 1,
          hasDocumentation: Boolean(precedingComment),
          existingComment: precedingComment ? precedingComment.text : null,
          nodeStartRow: effectiveNode.startPosition.row,
          nodeStartCol: effectiveNode.startPosition.column,
          sourceSnippet: node.text.slice(0, 500),
        });

        const body = node.childForFieldName('body');
        if (body) {
          for (let i = 0; i < body.childCount; i++) {
            const member = body.child(i);
            if (member.type === 'method_definition') {
              const mNameNode = member.childForFieldName('name');
              const mName = mNameNode ? mNameNode.text : 'anonymousMethod';
              const mText = member.text.trim();
              const isConstructor = mName === 'constructor';
              const isGetter = mText.startsWith('get ');
              const isSetter = mText.startsWith('set ');
              const mAsync = mText.startsWith('async ') || mText.includes('async ' + mName);
              const mStartLine = member.startPosition.row + 1;
              const mEndLine = member.endPosition.row + 1;
              const mPreceding = findPrecedingComment(mStartLine);
              const mBody = member.childForFieldName('body');
              const mAnalysis = analyzeFunctionBody(mBody);

              let symType = 'method';
              if (isConstructor) symType = 'constructor';
              else if (isGetter) symType = 'getter';
              else if (isSetter) symType = 'setter';

              symbols.push({
                name: `${name}.${mName}`,
                type: symType,
                exported: isExported,
                async: mAsync,
                startLine: mStartLine,
                endLine: mEndLine,
                startIndex: member.startIndex,
                endIndex: member.endIndex,
                parameters: extractParams(member.childForFieldName('parameters')),
                lineCount: mEndLine - mStartLine + 1,
                externalCalls: mAnalysis.externalCalls,
                hasErrorHandling: mAnalysis.hasErrorHandling,
                cyclomaticComplexity: mAnalysis.cyclomaticComplexity,
                hasDocumentation: Boolean(mPreceding),
                existingComment: mPreceding ? mPreceding.text : null,
                nodeStartRow: member.startPosition.row,
                nodeStartCol: member.startPosition.column,
                sourceSnippet: member.text.slice(0, 500),
              });
            }
          }
        }
        return;
      }

      if (node.type === 'lexical_declaration' || node.type === 'variable_declaration') {
        const isConst = node.text.trim().startsWith('const');
        for (let i = 0; i < node.childCount; i++) {
          const declarator = node.child(i);
          if (declarator.type === 'variable_declarator') {
            const nameNode = declarator.childForFieldName('name');
            const valueNode = declarator.childForFieldName('value');
            const name = nameNode ? nameNode.text : 'anonymous';

            if (valueNode && (valueNode.type === 'arrow_function' || valueNode.type === 'function')) {
              const isAsync = valueNode.text.trim().startsWith('async');
              const params = extractParams(valueNode.childForFieldName('parameters'));
              const bodyNode = valueNode.childForFieldName('body');
              const bodyAnalysis = analyzeFunctionBody(bodyNode);
              const precedingComment = findPrecedingComment(startLine);

              symbols.push({
                name,
                type: 'arrow_function',
                exported: isExported,
                async: isAsync,
                startLine,
                endLine,
                startIndex: effectiveNode.startIndex,
                endIndex: effectiveNode.endIndex,
                parameters: params,
                lineCount: endLine - startLine + 1,
                externalCalls: bodyAnalysis.externalCalls,
                hasErrorHandling: bodyAnalysis.hasErrorHandling,
                cyclomaticComplexity: bodyAnalysis.cyclomaticComplexity,
                hasDocumentation: Boolean(precedingComment),
                existingComment: precedingComment ? precedingComment.text : null,
                nodeStartRow: effectiveNode.startPosition.row,
                nodeStartCol: effectiveNode.startPosition.column,
                sourceSnippet: node.text.slice(0, 500),
              });
            } else if (isConst && isExported) {
              const precedingComment = findPrecedingComment(startLine);
              symbols.push({
                name,
                type: 'constant',
                exported: isExported,
                async: false,
                startLine,
                endLine,
                startIndex: effectiveNode.startIndex,
                endIndex: effectiveNode.endIndex,
                parameters: [],
                lineCount: endLine - startLine + 1,
                externalCalls: [],
                hasErrorHandling: false,
                cyclomaticComplexity: 1,
                hasDocumentation: Boolean(precedingComment),
                existingComment: precedingComment ? precedingComment.text : null,
                nodeStartRow: effectiveNode.startPosition.row,
                nodeStartCol: effectiveNode.startPosition.column,
                sourceSnippet: node.text.slice(0, 500),
              });
            }
          }
        }
        return;
      }

      for (let i = 0; i < node.childCount; i++) {
        processNode(node.child(i), parentExport);
      }
    };

    for (let i = 0; i < root.childCount; i++) {
      processNode(root.child(i), null);
    }

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
      startIndex: symbol.startIndex,
    };
  }

  validate(code) {
    if (typeof code !== 'string') {
      return { valid: false, errors: ['Code must be a string'] };
    }

    const tree = this.parse(code);
    if (tree.rootNode.hasError) {
      return {
        valid: false,
        errors: ['Syntax error detected in TypeScript AST structure'],
      };
    }

    return { valid: true, errors: [] };
  }

  stripComments(code) {
    const tree = this.parse(code);
    const comments = this.extractComments(tree, code);
    if (comments.length === 0) return code;

    const sorted = [...comments].sort((a, b) => b.startIndex - a.startIndex);
    let result = code;
    for (const comment of sorted) {
      result = result.slice(0, comment.startIndex) + result.slice(comment.endIndex);
    }
    return result;
  }

  getStructuralRepresentation(ast) {
    const root = ast.rootNode || ast;

    const serialize = (node) => {
      if (node.type === 'comment') return null;

      const children = [];
      for (let i = 0; i < node.childCount; i++) {
        const child = serialize(node.child(i));
        if (child) children.push(child);
      }

      const res = { type: node.type };
      if (children.length > 0) {
        res.children = children;
      } else {
        res.text = node.text;
      }
      return res;
    };

    return serialize(root);
  }
}

module.exports = TypeScriptParser;
