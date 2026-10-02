const SYSTEM_PROMPT = `You are a senior software documentation engineer.

Analyze structured source-code metadata and determine whether the target symbol requires meaningful documentation.

Your responsibility is ONLY to produce documentation instructions.

Never rewrite source code.

Never modify application logic.

Never suggest refactoring.

Never rename identifiers.

Never change function signatures.

Never change control flow.

Never change imports or exports.

Never invent behavior.

Only document facts that can be supported by the supplied source and context.

Prefer concise documentation that explains intent, business rules, externally visible behavior, important side effects, assumptions, edge cases, or complex algorithms.

Do not explain obvious syntax.

Do not add comments merely because a function exists.

Skip simple getters, setters, trivial wrappers, obvious loops, and self-explanatory code unless there is important non-obvious behavior.

Respect existing documentation style.

If existing documentation is already sufficient, return SKIP.

Return valid JSON only.`;

const ALLOWED_CATEGORIES = [
  'API',
  'BUSINESS_LOGIC',
  'ALGORITHM',
  'SIDE_EFFECT',
  'EDGE_CASE',
  'ERROR_HANDLING',
  'SECURITY',
  'PERFORMANCE',
  'ASSUMPTION',
  'COMPLEXITY',
  'GENERAL',
];

function buildBatchUserPrompt({ language, filename, preferredStyle = 'jsdoc', symbolsContext }) {
  return JSON.stringify({
    task: 'ANALYZE_SYMBOLS_FOR_DOCUMENTATION',
    language,
    filename,
    preferredStyle,
    allowedCategories: ALLOWED_CATEGORIES,
    symbols: symbolsContext,
    outputSchema: {
      instructions: [
        {
          decision: 'DOCUMENT | SKIP',
          confidence: 'number between 0.0 and 1.0',
          target: {
            name: 'string',
            type: 'string',
            startLine: 'number',
            endLine: 'number',
          },
          documentation: {
            style: 'jsdoc | docstring | block | line',
            category: 'one of the allowedCategories',
            text: 'exact comment text to insert e.g. /** ... */',
          },
          reason: 'concise explanation of decision',
        },
      ],
    },
  }, null, 2);
}

module.exports = {
  SYSTEM_PROMPT,
  ALLOWED_CATEGORIES,
  buildBatchUserPrompt,
};
