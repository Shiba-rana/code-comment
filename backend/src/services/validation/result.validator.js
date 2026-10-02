const { compareStructuralAst } = require('./astDiff.validator');
const { validateCommentOnlyChanges } = require('./commentOnly.validator');
const { validateSyntax } = require('./syntax.validator');

function validateTransformation({
  originalCode,
  updatedCode,
  originalAst,
  updatedAst,
  language,
  parser,
}) {
  const errors = [];

  const syntaxResult = validateSyntax(updatedCode, language);
  if (!syntaxResult.valid) {
    errors.push(...syntaxResult.errors);
  }

  const astDiffResult = compareStructuralAst(originalAst, updatedAst, parser);
  if (!astDiffResult.equal) {
    errors.push(astDiffResult.reason);
  }

  const commentOnlyResult = validateCommentOnlyChanges(originalCode, updatedCode);
  if (!commentOnlyResult.valid) {
    errors.push(...commentOnlyResult.violations);
  }

  const allPassed = syntaxResult.valid && astDiffResult.equal && commentOnlyResult.valid;

  return {
    valid: allPassed,
    syntaxValid: syntaxResult.valid,
    logicPreserved: astDiffResult.equal,
    commentOnlyChanges: commentOnlyResult.valid,
    errors,
    diff: commentOnlyResult.diff,
  };
}

module.exports = {
  validateTransformation,
};
