const assert = require('assert');
const { applyCommentPatches } = require('../../src/services/patch/commentPatch.service');
const { getParserForLanguage } = require('../../src/parsers');

function runPatchTests() {
  const parser = getParserForLanguage('javascript');
  const code = 'export async function processPayment(orderId, amount) {\n  return true;\n}';
  const ast = parser.parse(code);
  const symbols = parser.extractSymbols(ast, code);

  const instructions = [
    {
      decision: 'DOCUMENT',
      confidence: 0.95,
      autoApply: true,
      target: { name: 'processPayment', startLine: 1 },
      documentation: {
        category: 'SIDE_EFFECT',
        text: '/**\n * Processes payment.\n */',
      },
    },
  ];

  const patchRes = applyCommentPatches({
    originalCode: code,
    instructions,
    symbols,
    parser,
  });

  assert.strictEqual(patchRes.appliedChanges.length, 1);
  assert.ok(patchRes.updatedCode.includes('/**\n * Processes payment.\n */\nexport async function'));

  const dupInstructions = [
    {
      decision: 'DOCUMENT',
      confidence: 0.95,
      autoApply: true,
      target: { name: 'processPayment', startLine: 1 },
      documentation: {
        category: 'SIDE_EFFECT',
        text: '/**\n * Duplicate comment.\n */',
      },
    },
  ];

  const updatedAst = parser.parse(patchRes.updatedCode);
  const updatedSymbols = parser.extractSymbols(updatedAst, patchRes.updatedCode);

  const dupRes = applyCommentPatches({
    originalCode: patchRes.updatedCode,
    instructions: dupInstructions,
    symbols: updatedSymbols,
    parser,
  });

  assert.strictEqual(dupRes.appliedChanges.length, 0, 'Case 10: Duplicate documentation must be prevented');
  assert.strictEqual(dupRes.skippedChanges.length, 1);

  return true;
}

module.exports = { runPatchTests };
