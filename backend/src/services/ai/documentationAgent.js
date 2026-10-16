const { requestDocumentationBatch } = require('./aiClient');
const { validateAIResponse } = require('./responseValidator');
const { buildBatchContext } = require('../analysis/contextBuilder');
const { buildBatchUserPrompt } = require('../../prompts/documentation.prompt');
const { evaluateCommentQuality } = require('../validation/commentQuality.service');

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

  let detectedEngine = 'ai';
  let detectedNotice = null;

  const batches = chunkArray(symbols, batchSize);
  const batchPromises = batches.map(async (batch) => {
    const symbolsContext = buildBatchContext(batch, fileMetadata);
    const userPrompt = buildBatchUserPrompt({
      language,
      filename,
      preferredStyle,
      symbolsContext,
    });

    const rawResult = await requestDocumentationBatch({
      userPrompt,
      apiKey: options.apiKey,
      baseURL: options.baseURL,
      model: options.model,
    });

    const responseText = typeof rawResult === 'string' ? rawResult : (rawResult?.content || '');
    if (rawResult && typeof rawResult === 'object') {
      if (rawResult.engineUsed && rawResult.engineUsed !== 'ai') {
        detectedEngine = rawResult.engineUsed;
      }
      if (rawResult.notice) {
        detectedNotice = rawResult.notice;
      }
    }

    const validatedInstructions = validateAIResponse(responseText);

    return validatedInstructions.map((instruction) => {
      const confidence = instruction.confidence || 0.85;
      const confidenceTier = classifyConfidence(confidence);

      if (instruction.decision === 'DOCUMENT') {
        const matchingSymbol = batch.find((s) => s.name === instruction.target?.name);
        const qualityResult = evaluateCommentQuality(
          instruction.documentation?.text,
          matchingSymbol || { name: instruction.target?.name, type: instruction.target?.type },
          options
        );

        if (!qualityResult.passed) {
          return {
            ...instruction,
            decision: 'SKIP',
            autoApply: false,
            confidenceTier: 'low',
            qualityScore: qualityResult.totalScore,
            rejected: true,
            reason: `Rejected by Quality Evaluator: ${qualityResult.violations.join('; ')}`,
          };
        }

        return {
          ...instruction,
          confidenceTier,
          autoApply: confidence >= autoApplyThreshold,
          replaceExisting: Boolean(instruction.replaceExisting || matchingSymbol?.isGenericComment),
          qualityScore: qualityResult.totalScore,
        };
      }

      return {
        ...instruction,
        confidenceTier,
        autoApply: false,
      };
    });
  });

  const batchResults = await Promise.all(batchPromises);
  const flattened = batchResults.flat();
  flattened.engineUsed = detectedEngine;
  flattened.notice = detectedNotice;
  return flattened;
}

module.exports = {
  analyzeCandidateSymbols,
  classifyConfidence,
};
