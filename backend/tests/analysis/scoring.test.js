const assert = require('assert');
const { calculateDocumentationScore } = require('../../src/services/analysis/documentationScorer');

function runScoringTests() {
  const simpleFunc = {
    name: 'getName',
    type: 'function',
    exported: false,
    async: false,
    lineCount: 2,
    cyclomaticComplexity: 1,
    externalCalls: [],
    hasErrorHandling: false,
    hasDocumentation: false,
  };
  const resSimple = calculateDocumentationScore(simpleFunc, { mode: 'recommended', threshold: 3 });
  assert.strictEqual(resSimple.recommendation, 'SKIP', 'Case 1: Simple function should be SKIP');

  const exportedFunc = {
    name: 'createOrder',
    type: 'function',
    exported: true,
    async: false,
    lineCount: 8,
    cyclomaticComplexity: 2,
    externalCalls: [],
    hasErrorHandling: true,
    hasDocumentation: false,
  };
  const resExported = calculateDocumentationScore(exportedFunc, { mode: 'recommended', threshold: 3 });
  assert.strictEqual(resExported.recommendation, 'DOCUMENT', 'Case 2: Exported public function should be DOCUMENT');

  const complexFunc = {
    name: 'calculateTaxTier',
    type: 'function',
    exported: false,
    async: false,
    lineCount: 25,
    cyclomaticComplexity: 7,
    externalCalls: [],
    hasErrorHandling: true,
    hasDocumentation: false,
  };
  const resComplex = calculateDocumentationScore(complexFunc, { mode: 'recommended', threshold: 3 });
  assert.strictEqual(resComplex.recommendation, 'DOCUMENT', 'Case 3: Complex business logic should be DOCUMENT');

  const documentedFunc = {
    name: 'processPayment',
    type: 'function',
    exported: true,
    async: true,
    lineCount: 15,
    cyclomaticComplexity: 3,
    externalCalls: ['gateway.charge'],
    hasErrorHandling: true,
    hasDocumentation: true,
    documentationQuality: 'good',
  };
  const resDoc = calculateDocumentationScore(documentedFunc, { mode: 'recommended', threshold: 3 });
  assert.strictEqual(resDoc.breakdown.alreadyDocumentedGood, -5);

  const apiCallFunc = {
    name: 'fetchRemoteInventory',
    type: 'function',
    exported: true,
    async: true,
    lineCount: 10,
    cyclomaticComplexity: 2,
    externalCalls: ['fetch', 'cache.get'],
    hasErrorHandling: true,
    hasDocumentation: false,
  };
  const resApi = calculateDocumentationScore(apiCallFunc, { mode: 'recommended', threshold: 3 });
  assert.strictEqual(resApi.recommendation, 'DOCUMENT', 'Case 5: External API call should be DOCUMENT');

  return true;
}

module.exports = { runScoringTests };
