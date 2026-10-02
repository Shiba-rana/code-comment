const assert = require('assert');
const { getParserForLanguage } = require('../../src/parsers');

function runParserTests() {
  const jsParser = getParserForLanguage('javascript');
  const tsParser = getParserForLanguage('typescript');

  const jsCode = 'export async function processPayment(orderId, amount) {\n  const user = await getUser(orderId);\n  if (!user) throw new Error("not found");\n  return user;\n}';
  const jsAst = jsParser.parse(jsCode);
  const jsSymbols = jsParser.extractSymbols(jsAst, jsCode);

  assert.strictEqual(jsSymbols.length, 1);
  assert.strictEqual(jsSymbols[0].name, 'processPayment');
  assert.strictEqual(jsSymbols[0].type, 'function');
  assert.strictEqual(jsSymbols[0].exported, true);
  assert.strictEqual(jsSymbols[0].async, true);
  assert.deepStrictEqual(jsSymbols[0].parameters, ['orderId', 'amount']);

  const tsCode = 'export interface PaymentResult {\n  success: boolean;\n}\nexport class PaymentManager {\n  process(id: string): PaymentResult {\n    return { success: true };\n  }\n}';
  const tsAst = tsParser.parse(tsCode);
  const tsSymbols = tsParser.extractSymbols(tsAst, tsCode);

  const iface = tsSymbols.find((s) => s.type === 'interface');
  const cls = tsSymbols.find((s) => s.type === 'class');
  const method = tsSymbols.find((s) => s.type === 'method');

  assert.ok(iface, 'Interface extracted');
  assert.strictEqual(iface.name, 'PaymentResult');
  assert.ok(cls, 'Class extracted');
  assert.strictEqual(cls.name, 'PaymentManager');
  assert.ok(method, 'Method extracted');
  assert.strictEqual(method.name, 'PaymentManager.process');

  const invalidCode = 'function broken( {';
  const invalidResult = jsParser.validate(invalidCode);
  assert.strictEqual(invalidResult.valid, false, 'Invalid syntax caught');

  return true;
}

module.exports = { runParserTests };
