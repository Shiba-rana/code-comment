const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('../../prompts/documentation.prompt');

let clientInstance = null;
let lastApiKey = null;

function hasValidApiKey() {
  const key = process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key !== 'your_key_here' && key.length > 10);
}

function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || key === 'your_key_here') {
    return null;
  }

  const isAtria = key.startsWith('atr_');
  const baseURL = process.env.OPENAI_BASE_URL || (isAtria ? 'https://api.atria-asi.ai/v1' : undefined);

  if (!clientInstance || lastApiKey !== key) {
    lastApiKey = key;
    clientInstance = new OpenAI({
      apiKey: key,
      baseURL,
    });
  }
  return clientInstance;
}

function generateDeterministicFallback(userPromptText) {
  try {
    const parsed = JSON.parse(userPromptText);
    const symbols = parsed.symbols || [];
    const instructions = [];

    for (const sym of symbols) {
      if (sym.existingDocumentation && sym.existingDocumentation !== 'None') {
        instructions.push({
          decision: 'SKIP',
          confidence: 0.95,
          target: {
            name: sym.name,
            type: sym.type,
            startLine: sym.startLine,
            endLine: sym.endLine,
          },
          reason: 'Symbol is already sufficiently documented.',
        });
        continue;
      }

      if (sym.type === 'getter' || sym.type === 'setter' || sym.lineCount <= 2 && !sym.exported) {
        instructions.push({
          decision: 'SKIP',
          confidence: 0.92,
          target: {
            name: sym.name,
            type: sym.type,
            startLine: sym.startLine,
            endLine: sym.endLine,
          },
          reason: 'Trivial getter/setter or self-explanatory one-liner.',
        });
        continue;
      }

      let category = 'GENERAL';
      let purpose = `Handles ${sym.name} operations.`;

      if (sym.exported && sym.async) {
        category = 'SIDE_EFFECT';
        purpose = `Executes asynchronous ${sym.name} workflow and coordinates external services.`;
      } else if (sym.exported) {
        category = 'API';
        purpose = `Public API entry point for ${sym.name}.`;
      } else if (sym.hasErrorHandling) {
        category = 'ERROR_HANDLING';
        purpose = `Executes ${sym.name} with error handling and validation logic.`;
      } else if (sym.cyclomaticComplexity > 3) {
        category = 'BUSINESS_LOGIC';
        purpose = `Processes business rules and conditional decision branching for ${sym.name}.`;
      }

      const paramDocs = (sym.parameters || []).map((p) => `\n * @param {*} ${p}`).join('');
      const commentText = `/**\n * ${purpose}${paramDocs}\n */`;

      instructions.push({
        decision: 'DOCUMENT',
        confidence: 0.96,
        target: {
          name: sym.name,
          type: sym.type,
          startLine: sym.startLine,
          endLine: sym.endLine,
        },
        documentation: {
          style: 'jsdoc',
          category,
          text: commentText,
        },
        reason: `${category} requirement identified for ${sym.name}.`,
      });
    }

    return JSON.stringify({ instructions });
  } catch (err) {
    return JSON.stringify({ instructions: [] });
  }
}

async function requestDocumentationBatch({ userPrompt, maxRetries = 2 }) {
  const client = getOpenAIClient();

  if (!client) {
    return generateDeterministicFallback(userPrompt);
  }

  const key = process.env.OPENAI_API_KEY?.trim() || '';
  const isAtria = key.startsWith('atr_');
  const defaultModel = isAtria ? 'Atria-Dawn-Preview' : 'gpt-4o';
  const model = process.env.OPENAI_MODEL || defaultModel;
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 4096,
        response_format: { type: 'json_object' },
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('AI returned an empty response.');
      }
      return content;
    } catch (err) {
      lastError = err;
      if (err.status === 401) {
        throw new Error(`OpenAI API Key is invalid or expired (401: ${err.message})`);
      }
      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw new Error(`OpenAI API failed after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

module.exports = {
  requestDocumentationBatch,
  hasValidApiKey,
  generateDeterministicFallback,
};
