function parseAIResponse(rawResponse) {
  let cleaned = rawResponse.trim();

  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }

  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('AI response is not valid JSON.');
  }
}

function validateResponseSchema(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI response is not a valid object.');
  }

  if (!parsed.analysis || typeof parsed.analysis !== 'object') {
    throw new Error('AI response missing "analysis" object.');
  }

  if (typeof parsed.analysis.commentsAdded !== 'number') {
    throw new Error('AI response missing "analysis.commentsAdded" number.');
  }

  if (!parsed.updatedCode || typeof parsed.updatedCode !== 'string') {
    throw new Error('AI response missing "updatedCode" string.');
  }

  if (!Array.isArray(parsed.changes)) {
    throw new Error('AI response missing "changes" array.');
  }

  return true;
}

function detectSuspiciousChanges(originalCode, updatedCode) {
  const warnings = [];

  const strippedOriginal = stripComments(originalCode);
  const strippedUpdated = stripComments(updatedCode);

  const normalise = (s) => s.replace(/\s+/g, ' ').trim();

  if (normalise(strippedOriginal) !== normalise(strippedUpdated)) {
    warnings.push(
      'Non-comment code differences detected between original and updated code.'
    );
  }

  return warnings;
}

function stripComments(code) {
  let result = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"""[\s\S]*?"""/g, '')
    .replace(/'''[\s\S]*?'''/g, '');

  result = result.replace(/\/\/.*$/gm, '');
  result = result.replace(/#.*$/gm, '');

  return result;
}

module.exports = {
  parseAIResponse,
  validateResponseSchema,
  detectSuspiciousChanges,
};
