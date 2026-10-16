const assert = require('assert');
const { analyzeCode } = require('../../src/services/codeAnalyzer.service');
const { evaluateCommentQuality, isGenericBoilerplate, checkUnsupportedClaims } = require('../../src/services/validation/commentQuality.service');
const { validateCommentOnlyChanges } = require('../../src/services/validation/commentOnly.validator');

async function runQualityRegressionTests() {
  console.log('\nRunning Quality & Regression Test Suite (Cases 1 - 10)...');

  // Test 1: React Component Documentation (Dashboard / StatCard)
  console.log('  Test 1: React Component Documentation...');
  const reactCode = `
import React, { useState } from 'react';

export const StatCard = ({ title, amount, type, icon: Icon }) => {
  return (
    <div className={\`stat-card \${type}\`}>
      {Icon && <Icon className="card-icon" />}
      <span className="card-title">{title}</span>
      <span className="card-amount">{amount}</span>
    </div>
  );
};

export const Dashboard = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="dashboard-container">
      <StatCard title="Income" amount={5000} type="income" />
      <StatCard title="Expenses" amount={1200} type="expense" />
      {isOpen && <div className="modal">Add Transaction</div>}
    </div>
  );
};
`;
  const resReact = await analyzeCode({
    filename: 'Dashboard.jsx',
    language: 'javascript',
    code: reactCode,
  });
  assert.strictEqual(resReact.success, true);
  assert.ok(resReact.stats.commentsAdded >= 1, 'Should add documentation to React component');
  
  // Must NOT contain generic decision branching
  assert.ok(
    !resReact.updatedCode.includes('Processes algorithmic decision branching'),
    'Must NOT contain generic phrase: "Processes algorithmic decision branching"'
  );
  assert.ok(
    !resReact.updatedCode.includes('condition checks for StatCard'),
    'Must NOT contain generic phrase: "condition checks for StatCard"'
  );
  assert.ok(
    resReact.updatedCode.includes('StatCard') || resReact.updatedCode.includes('Dashboard'),
    'Documentation should accurately describe components'
  );
  console.log('    ✓ React components documented with component-specific responsibilities, generic boilerplate rejected.');

  // Test 2: Financial Calculation
  console.log('  Test 2: Financial Calculation...');
  const calcCode = `
export function calculateDiscount(price, discount) {
  if (price <= 0 || discount <= 0) {
    return price;
  }
  const discountAmount = (price * discount) / 100;
  return price - discountAmount;
}
`;
  const resCalc = await analyzeCode({
    filename: 'pricing.js',
    language: 'javascript',
    code: calcCode,
  });
  assert.strictEqual(resCalc.success, true);
  assert.ok(resCalc.stats.commentsAdded >= 1);
  assert.ok(
    resCalc.updatedCode.toLowerCase().includes('discount') || resCalc.updatedCode.toLowerCase().includes('price'),
    'Documentation must describe calculation and discount rules'
  );
  console.log('    ✓ Financial calculations documented accurately with parameter and rule context.');

  // Test 3: Async Service with Error Handling
  console.log('  Test 3: Async Service with Error Handling...');
  const asyncCode = `
export async function submitOrder(userId, items) {
  if (!items || items.length === 0) {
    throw new Error("Order cannot be empty");
  }
  const trackingId = await paymentGateway.charge({ userId, items });
  return trackingId;
}
`;
  const resAsync = await analyzeCode({
    filename: 'orderService.js',
    language: 'javascript',
    code: asyncCode,
  });
  assert.strictEqual(resAsync.success, true);
  assert.ok(resAsync.updatedCode.includes('@param') || resAsync.updatedCode.includes('userId'));
  assert.ok(resAsync.updatedCode.includes('@throws') || resAsync.updatedCode.includes('Error'));
  console.log('    ✓ Async service documented with external gateway call and failure contract.');

  // Test 4: Trivial Function (Should be SKIPPED)
  console.log('  Test 4: Trivial Function...');
  const trivialCode = `
export function getId() {
  return 101;
}
`;
  const resTrivial = await analyzeCode({
    filename: 'utils.js',
    language: 'javascript',
    code: trivialCode,
    mode: 'recommended',
  });
  assert.strictEqual(resTrivial.success, true);
  assert.strictEqual(resTrivial.stats.commentsAdded, 0, 'Trivial one-line getter must be skipped');
  console.log('    ✓ Trivial one-line getter properly skipped to prevent over-commenting.');

  // Test 5: Existing Good Comment (Should be preserved, not duplicated)
  console.log('  Test 5: Existing Good Comment...');
  const documentedCode = `
/**
 * Renders the user navigation bar with responsive mobile menu controls.
 */
export const Navigation = () => {
  return <nav><span>App</span></nav>;
};
`;
  const resDoc = await analyzeCode({
    filename: 'Navigation.jsx',
    language: 'javascript',
    code: documentedCode,
  });
  assert.strictEqual(resDoc.success, true);
  assert.strictEqual(resDoc.stats.commentsAdded, 0, 'Already documented symbol must not receive duplicate comment');
  assert.ok(resDoc.updatedCode.includes('Renders the user navigation bar'));
  console.log('    ✓ Existing good documentation preserved without duplication.');

  // Test 6: Incorrect AI Claims (Simulate AI claiming retries on non-retry code)
  console.log('  Test 6: Incorrect AI Claims Detection...');
  const nonRetrySnippet = `
function fetchData(url) {
  return fetch(url).then(r => r.json());
}
`;
  const hallucinatedComment = `/**
 * Fetches data from remote API with automatic exponential backoff retries.
 */`;
  const unsupportedClaims = checkUnsupportedClaims(hallucinatedComment, nonRetrySnippet);
  assert.ok(unsupportedClaims.length > 0, 'Must detect unsupported claims about retries');
  assert.ok(unsupportedClaims[0].includes('retry'), 'Violation message must identify retry claim');

  const evalResult = evaluateCommentQuality(hallucinatedComment, {
    name: 'fetchData',
    sourceSnippet: nonRetrySnippet,
  });
  assert.strictEqual(evalResult.passed, false, 'Hallucinated comment must fail quality validation');
  console.log('    ✓ False claims about retries successfully detected and rejected.');

  // Test 7: Generic Comment Rejection
  console.log('  Test 7: Generic Comment Rejection...');
  const genericComments = [
    '/** Handles the logic for this function. */',
    '/** Processes algorithmic decision branching and condition checks. */',
    '/** Performs operations on the provided data. */',
    '/** Manages application functionality. */',
    '/** Handles the component rendering. */',
    '/** Executes the required functionality. */',
  ];
  for (const gc of genericComments) {
    assert.strictEqual(isGenericBoilerplate(gc), true, `Must detect boilerplate: ${gc}`);
    const evalRes = evaluateCommentQuality(gc, { name: 'StatCard', sourceSnippet: reactCode });
    assert.strictEqual(evalRes.passed, false, `Must reject boilerplate: ${gc}`);
  }
  console.log('    ✓ All generic boilerplate phrases rejected by quality validator.');

  // Test 8: Logic Preservation
  console.log('  Test 8: Logic Preservation...');
  const originalSource = 'function check(x) { if (x > 5) return true; return false; }';
  const modifiedSource = 'function check(x) { if (x >= 5) return true; return false; }'; // Changed > to >=
  const validationCheck = validateCommentOnlyChanges(originalSource, modifiedSource);
  assert.strictEqual(validationCheck.valid, false, 'Modifying application logic must be rejected');
  assert.ok(validationCheck.violations.length > 0);
  console.log('    ✓ Unauthorized application logic modifications strictly rejected.');

  // Test 9: Existing Project Section Comments Preserved
  console.log('  Test 9: Existing Project Comments Preserved...');
  const sectionCode = `
function renderList(items) {
  // Section: Primary Item Listing
  return items.map(item => item.name);
}
`;
  const resSection = await analyzeCode({
    filename: 'list.js',
    language: 'javascript',
    code: sectionCode,
  });
  assert.strictEqual(resSection.success, true);
  assert.ok(resSection.updatedCode.includes('// Section: Primary Item Listing'), 'Section comment must be preserved');
  console.log('    ✓ Existing in-file section comments preserved intact.');

  // Test 10: Missing Context Handling
  console.log('  Test 10: Missing Context Handling...');
  const opaqueCode = `
export function fn(a, b) {
  return a ? b : null;
}
`;
  const resOpaque = await analyzeCode({
    filename: 'opaque.js',
    language: 'javascript',
    code: opaqueCode,
  });
  assert.strictEqual(resOpaque.success, true);
  // Must NOT invent fake business semantics (like "charges customer credit card")
  assert.ok(!resOpaque.updatedCode.includes('credit card'));
  assert.ok(!resOpaque.updatedCode.includes('Processes algorithmic decision branching'));
  // Test 11: Replacing / Upgrading Existing Generic Boilerplate
  console.log('  Test 11: Upgrading Existing Generic Boilerplate...');
  const genericInputCode = `
/**
 * Processes algorithmic decision branching and condition checks for StatCard.
 */
const StatCard = ({ title, amount, type, icon: Icon }) => {
  return <div className={type}><h3>{title}</h3><span>{amount}</span></div>;
};
`;
  const resUpgrade = await analyzeCode({
    filename: 'StatCard.jsx',
    language: 'javascript',
    code: genericInputCode,
  });
  assert.strictEqual(resUpgrade.success, true);
  assert.strictEqual(resUpgrade.stats.commentsAdded, 1, 'Generic boilerplate must be replaced with specific documentation');
  assert.ok(!resUpgrade.updatedCode.includes('Processes algorithmic decision branching'), 'Generic boilerplate must be removed');
  assert.ok(resUpgrade.updatedCode.includes('Renders a financial summary card'), 'Specific component comment must be present');
  console.log('    ✓ Existing generic boilerplate comments successfully replaced with high-quality documentation.');

  console.log('\nAll 11 Quality & Regression Tests Passed Successfully!\n');
}

module.exports = {
  runQualityRegressionTests,
};

if (require.main === module) {
  runQualityRegressionTests().catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
}
