function compareStructuralAst(originalAst, updatedAst, parser) {
  try {
    const origRepr = parser.getStructuralRepresentation(originalAst);
    const updatedRepr = parser.getStructuralRepresentation(updatedAst);

    const origJson = JSON.stringify(origRepr);
    const updatedJson = JSON.stringify(updatedRepr);

    const isEqual = origJson === updatedJson;

    return {
      equal: isEqual,
      reason: isEqual
        ? 'AST structural equality verified (comments stripped)'
        : 'AST structural mismatch: code logic or declarations were altered',
    };
  } catch (err) {
    return {
      equal: false,
      reason: `AST comparison error: ${err.message}`,
    };
  }
}

module.exports = {
  compareStructuralAst,
};
