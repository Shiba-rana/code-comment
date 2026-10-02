const { runParserTests } = require('./parser/parser.test');
const { runScoringTests } = require('./analysis/scoring.test');
const { runPatchTests } = require('./patch/patch.test');
const { runValidationTests } = require('./validation/validation.test');
const { runEndToEndTests } = require('./e2e/cases.test');

async function main() {
  console.log('Running Phase 2 Test Suite...\n');

  try {
    console.log('1. Testing AST Parsers (JS & TS)...');
    runParserTests();
    console.log('   PASSED');

    console.log('2. Testing Documentation Scoring (Cases 1-5)...');
    runScoringTests();
    console.log('   PASSED');

    console.log('3. Testing Patch Engine (Case 10 Duplicate Prevention)...');
    runPatchTests();
    console.log('   PASSED');

    console.log('4. Testing AST & Safety Validation (Cases 7, 8, 9)...');
    runValidationTests();
    console.log('   PASSED');

    console.log('5. Testing End-to-End Pipeline (Case 6 Generated File & Standard Flow)...');
    await runEndToEndTests();
    console.log('   PASSED');

    console.log('\nAll Phase 2 tests passed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('\nTest Suite Failed:');
    console.error(err);
    process.exit(1);
  }
}

main();
