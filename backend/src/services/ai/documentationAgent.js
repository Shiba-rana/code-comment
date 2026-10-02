const { requestDocumentationBatch } = require('./aiClient');
const { validateAIResponse } = require('./responseValidator');
const { buildBatchContext } = require('../analysis/contextBuilder');
const { buildBatchUserPrompt } = require('../../prompts/documentation.prompt');

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function classifyConfidence(confidence) {
  if (confidence >= 0.90) return 'high';
  if (confidence >= 0.75) return 'medium';
  return 'low';
}

async function analyzeCandidateSymbols({
  symbols,
  language,
  filename,
  preferredStyle = 'jsdoc',
  fileMetadata = {},
  options = {},
}) {
  if (!symbols || symbols.length === 0) {
    return [];
  }

  const batchSize = Number(options.batchSize || process.env.AI_BATCH_SIZE || 10);
  const autoApplyThreshold = Number(
    options.autoApplyConfidence !== undefined
      ? options.autoApplyConfidence
      : process.env.AUTO_APPLY_CONFIDENCE || 0.85
  );

  const batches = chunkArray(symbols, batchSize);
  const allInstructions = [];

  for (const batch of batches) {
    const symbolsContext = buildBatchContext(batch, fileMetadata);
    const userPrompt = buildBatchUserPrompt({
      language,
      filename,
      preferredStyle,
      symbolsContext,
    });

    const rawResponse = await requestDocumentationBatch({ userPrompt });
    const validatedInstructions = validateAIResponse(rawResponse);

    for (const instruction of validatedInstructions) {
      const confidence = instruction.confidence || 0.85;
      const confidenceTier = classifyConfidence(confidence);
      const shouldAutoApply = instruction.decision === 'DOCUMENT' && confidence >= autoApplyThreshold;

      allInstructions.push({
        ...instruction,
        confidenceTier,
        autoApply: shouldAutoApply,
      });
    }
  }

  return allInstructions;
}

module.exports = {
  analyzeCandidateSymbols,
  classifyConfidence,
};
