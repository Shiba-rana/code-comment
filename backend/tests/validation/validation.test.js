const assert = require('assert');
const { getParserForLanguage } = require('../../src/parsers');
const { compareStructuralAst } = require('../../src/services/validation/astDiff.validator');
const { validateCommentOnlyChanges } = require('../../src/services/validation/commentOnly.validator');
const { validateSyntax } = require('../../src/services/validation/syntax.validator');
const { validateAIResponse } = require('../../src/services/ai/responseValidator');

function runValidationTests() {
  const parser = getParserForLanguage('javascript');

  const origCode = 'function calc(a, b) {\n  return a + b;\n}';
  const logicChangedCode = 'function calc(a, b) {\n  return a * b;\n}';
  const commentedCode = '/**\n * Adds two numbers\n */\nfunction calc(a, b) {\n  return a + b;\n}';

  const origAst = parser.parse(origCode);
  const logicAst = parser.parse(logicChangedCode);
  const commentAst = parser.parse(commentedCode);

  const commentCompare = compareStructuralAst(origAst, commentAst, parser);
  assert.strictEqual(commentCompare.equal, true, 'AST match when comments added');

  const logicCompare = compareStructuralAst(origAst, logicAst, parser);
  assert.strictEqual(logicCompare.equal, false, 'Case 7: AST mismatch when logic changed');

  const diffCheckOk = validateCommentOnlyChanges(origCode, commentedCode);
  assert.strictEqual(diffCheckOk.valid, true, 'Comment-only diff passes');

  const diffCheckBad = validateCommentOnlyChanges(origCode, logicChangedCode);
  assert.strictEqual(diffCheckBad.valid, false, 'Case 7: Logic change in diff is rejected');

  assert.throws(
    () => {
      validateAIResponse('{ invalid json string ...');
    },
    /Invalid AI JSON/,
    'Case 8: Invalid AI JSON should throw'
  );

  const syntaxBad = validateSyntax('function broken( {', 'javascript');
  assert.strictEqual(syntaxBad.valid, false, 'Case 9: Syntax-invalid output should be rejected');

  return true;
}

module.exports = { runValidationTests };
