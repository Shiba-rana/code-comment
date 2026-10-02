const { ALLOWED_CATEGORIES } = require('../../prompts/documentation.prompt');

function validateAIResponse(rawResponse) {
  if (!rawResponse || typeof rawResponse !== 'string') {
    throw new Error('AI response is empty or not a string');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawResponse);
  } catch (err) {
    throw new Error(`Invalid AI JSON response: ${err.message}`);
  }

  let instructions = [];
  if (Array.isArray(parsed.instructions)) {
    instructions = parsed.instructions;
  } else if (parsed.decision) {
    instructions = [parsed];
  } else {
    throw new Error('AI response must contain an instructions array or instruction object');
  }

  const validated = instructions.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Instruction at index ${index} is not an object`);
    }

    const decision = String(item.decision || '').toUpperCase();
    if (decision !== 'DOCUMENT' && decision !== 'SKIP') {
      throw new Error(`Invalid decision "${item.decision}" at index ${index}. Must be DOCUMENT or SKIP`);
    }

    const confidence = typeof item.confidence === 'number' ? item.confidence : 0.85;

    const targetName = item.target?.name || item.targetSymbol || 'unknown';

    if (decision === 'DOCUMENT') {
      const doc = item.documentation || {};
      const docText = typeof doc === 'string' ? doc : doc.text;

      if (!docText || typeof docText !== 'string' || docText.trim().length === 0) {
        throw new Error(`Missing documentation text for symbol "${targetName}"`);
      }

      let category = (doc.category || 'GENERAL').toUpperCase();
      if (!ALLOWED_CATEGORIES.includes(category)) {
        category = 'GENERAL';
      }

      return {
        decision: 'DOCUMENT',
        confidence,
        target: {
          name: targetName,
          type: item.target?.type || 'function',
          startLine: item.target?.startLine,
          endLine: item.target?.endLine,
        },
        documentation: {
          style: doc.style || 'jsdoc',
          category,
          text: docText.trim(),
        },
        reason: item.reason || 'Documentation recommended',
      };
    }

    return {
      decision: 'SKIP',
      confidence,
      target: {
        name: targetName,
        type: item.target?.type || 'function',
      },
      reason: item.reason || 'Documentation not required',
    };
  });

  return validated;
}

module.exports = {
  validateAIResponse,
};
