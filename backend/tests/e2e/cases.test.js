const assert = require('assert');
const { analyzeCode } = require('../../src/services/codeAnalyzer.service');

async function runEndToEndTests() {
  const generatedCode = '/* @generated DO NOT EDIT */\nfunction autogen() { return 42; }';
  const genRes = await analyzeCode({
    filename: 'schema.generated.js',
    language: 'javascript',
    code: generatedCode,
  });
  assert.strictEqual(genRes.stats.commentsAdded, 0, 'Case 6: Generated file should skip documentation');

  const standardCode = 'export async function createOrder(userId, items) {\n  const user = await getUser(userId);\n  if (!user) throw new Error("not found");\n  const total = calculateTotal(items);\n  return await orderService.create({ userId, items, total });\n}\n\nfunction getLocalId() {\n  return 1;\n}';
  const res = await analyzeCode({
    filename: 'order.js',
    language: 'javascript',
    code: standardCode,
    mode: 'recommended',
  });

  assert.strictEqual(res.success, true);
  assert.strictEqual(res.validation.syntaxValid, true);
  assert.strictEqual(res.validation.logicPreserved, true);
  assert.strictEqual(res.validation.commentOnlyChanges, true);
  assert.ok(res.stats.commentsAdded >= 1, 'createOrder was documented');
  assert.ok(res.updatedCode.includes('createOrder'));
  assert.ok(res.updatedCode.includes('/**'));

  return true;
}

module.exports = { runEndToEndTests };
