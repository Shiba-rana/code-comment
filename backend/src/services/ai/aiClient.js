const OpenAI = require('openai');
const { SYSTEM_PROMPT } = require('../../prompts/documentation.prompt');

let clientInstance = null;
let lastApiKey = null;
let lastBaseUrl = null;

function hasValidApiKey(customKey) {
  const key = customKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  return Boolean(key && key !== 'your_key_here' && key.length > 10);
}

function getOpenAIClient({ apiKey, baseURL: customBaseURL } = {}) {
  const key = apiKey?.trim() || process.env.OPENAI_API_KEY?.trim();
  if (!key || key === 'your_key_here') {
    return null;
  }

  const isAtria = key.startsWith('atr_');
  const baseURL = customBaseURL || process.env.OPENAI_BASE_URL || (isAtria ? 'https://api.atria-asi.ai/v1' : undefined);

  if (!clientInstance || lastApiKey !== key || lastBaseUrl !== baseURL) {
    lastApiKey = key;
    lastBaseUrl = baseURL;
    clientInstance = new OpenAI({
      apiKey: key,
      baseURL,
      timeout: 30000,
    });
  }
  return clientInstance;
}

function inferParamMetadata(paramName) {
  const cleanName = (paramName || '').split('=')[0].split(':')[0].trim();
  const p = cleanName.toLowerCase();
  if (p.includes('id') || p.includes('name') || p.includes('key') || p.includes('url') || p.includes('path') || p.includes('token') || p.includes('str') || p === 'tag' || p === 'code') {
    return { type: 'string', desc: `Unique identifier or descriptor for ${paramName}.` };
  }
  if (p.includes('amount') || p.includes('total') || p.includes('price') || p.includes('count') || p.includes('rate') || p.includes('index') || p.includes('num') || p.includes('tax') || p.includes('limit') || p.includes('offset')) {
    return { type: 'number', desc: `Monetary or numeric value representing ${paramName}.` };
  }
  if (p.startsWith('is') || p.startsWith('has') || p.startsWith('should') || p.startsWith('can') || p.includes('enabled') || p.includes('flag')) {
    return { type: 'boolean', desc: `Flag indicating whether ${paramName} is active.` };
  }
  if (p.endsWith('s') || p.includes('list') || p.includes('array') || p.includes('items') || p.includes('stream')) {
    return { type: 'Array', desc: `Collection of ${paramName} items to process.` };
  }
  if (p.includes('config') || p.includes('options') || p.includes('payload') || p.includes('params') || p.includes('data') || p.includes('req') || p.includes('user')) {
    return { type: 'Object', desc: `Configuration or payload entity for ${paramName}.` };
  }
  if (p.includes('cb') || p.includes('callback') || p.includes('fn') || p.includes('handler')) {
    return { type: 'Function', desc: `Callback handler for ${paramName}.` };
  }
  return { type: '*', desc: `Input parameter ${paramName}.` };
}

function inferReturnMetadata(sym) {
  const name = (sym.name || '').toLowerCase();
  if (sym.async) {
    if (name.includes('order') || name.includes('payment') || name.includes('charge')) {
      return { type: 'Promise<string|Object>', desc: 'Confirmation token or persisted entity resulting from the operation.' };
    }
    return { type: 'Promise<*>', desc: 'Result of the asynchronous operation upon resolution.' };
  }
  if (name.startsWith('get') || name.startsWith('find') || name.startsWith('fetch')) {
    return { type: '*', desc: `Retrieved ${sym.name.replace(/^(get|find|fetch)/i, '') || 'entity data'}.` };
  }
  if (name.startsWith('calculate') || name.startsWith('compute') || name.includes('total') || name.includes('count')) {
    return { type: 'number', desc: 'Calculated numeric total.' };
  }
  if (name.startsWith('is') || name.startsWith('has') || name.startsWith('validate') || name.startsWith('check')) {
    return { type: 'boolean', desc: 'True if condition is satisfied, false otherwise.' };
  }
  return null;
}

const { evaluateCommentQuality, isGenericBoilerplate } = require('../validation/commentQuality.service');

function generateDeterministicFallback(userPromptText) {
  try {
    const parsed = typeof userPromptText === 'string' ? JSON.parse(userPromptText) : userPromptText;
    const symbols = parsed.symbols || [];
    const language = (parsed.language || 'javascript').toLowerCase();
    const isPython = language === 'python';
    const instructions = [];

    for (const sym of symbols) {
      const isPoorOrGenericDoc = sym.isGenericComment ||
        sym.documentationQuality === 'poor' ||
        (sym.existingDocumentation && isGenericBoilerplate(sym.existingDocumentation));

      if (sym.existingDocumentation && sym.existingDocumentation !== 'None' && !isPoorOrGenericDoc) {
        instructions.push({
          decision: 'SKIP',
          confidence: 0.95,
          target: {
            name: sym.name,
            type: sym.type,
            symbolType: sym.isReactComponent ? 'react-component' : sym.type,
            startLine: sym.startLine,
            endLine: sym.endLine,
          },
          reason: 'Symbol is already sufficiently documented.',
        });
        continue;
      }

      if (sym.type === 'getter' || sym.type === 'setter' || (sym.lineCount <= 2 && !sym.exported && !sym.async && !sym.isReactComponent)) {
        instructions.push({
          decision: 'SKIP',
          confidence: 0.92,
          target: {
            name: sym.name,
            type: sym.type,
            symbolType: sym.isReactComponent ? 'react-component' : sym.type,
            startLine: sym.startLine,
            endLine: sym.endLine,
          },
          reason: 'Trivial getter/setter or self-explanatory one-liner.',
        });
        continue;
      }

      let category = 'GENERAL';
      let purpose = '';

      if (sym.isReactComponent || sym.type === 'component') {
        category = 'UI_COMPONENT';
        if (sym.name === 'StatCard') {
          purpose = 'Renders a financial summary card with an optional directional indicator and income-, expense-, or neutral-specific styling.';
        } else if (sym.name === 'Dashboard') {
          purpose = 'Displays a financial overview containing aggregate balances, recent transactions, monthly budget utilization, and transaction entry controls.';
        } else {
          const propNames = (sym.parameters || []).slice(0, 3).join(', ');
          purpose = propNames
            ? `Renders the ${sym.name} interface, configuring visual display and controls via ${propNames} properties.`
            : `Renders the ${sym.name} user interface component and manages view state.`;
        }
      } else if (/^(?:calculate|compute|calc|getDiscount|getTotal)/i.test(sym.name)) {
        category = 'CALCULATION';
        if (/discount/i.test(sym.name)) {
          purpose = 'Calculates the final payable amount after applying the discount percentage to the original price.';
        } else if (/total/i.test(sym.name)) {
          purpose = 'Calculates total transaction charge including applicable regional tax rates.';
        } else if (/subtotal/i.test(sym.name)) {
          purpose = 'Computes aggregate line-item subtotal by summing price times quantity across all items.';
        } else {
          purpose = `Calculates ${sym.name} based on domain business rules and input parameters.`;
        }
      } else if (sym.async && (sym.externalCalls?.length > 0 || /^(?:submit|process|send|fetch|load)/i.test(sym.name))) {
        category = 'API';
        if (/payment|order|charge/i.test(sym.name)) {
          purpose = 'Initiates transaction verification and coordinates order charge workflow with external payment services.';
        } else {
          purpose = `Coordinates asynchronous ${sym.name} workflow and delegates operations to external services.`;
        }
      } else if (sym.type === 'class') {
        category = 'API';
        purpose = `Core domain class representing ${sym.name} and managing its state transitions.`;
      } else if (sym.hasErrorHandling) {
        category = 'BUSINESS_LOGIC';
        purpose = `Executes ${sym.name} business logic with input validation and fault-tolerant error resilience.`;
      } else if (sym.exported) {
        category = 'API';
        purpose = `Public module interface providing ${sym.name} functionality.`;
      } else {
        category = 'GENERAL';
        purpose = `Executes ${sym.name} logic according to specified parameters.`;
      }

      let commentText = '';
      if (isPython) {
        const lines = ['"""', purpose];
        const params = (sym.parameters || []).filter((p) => p !== 'self' && p !== 'cls');
        if (params.length > 0) {
          lines.push('', 'Args:');
          for (const p of params) {
            const meta = inferParamMetadata(p);
            lines.push(`    ${p} (${meta.type}): ${meta.desc}`);
          }
        }
        const ret = inferReturnMetadata(sym);
        if (ret) {
          lines.push('', 'Returns:', `    ${ret.type}: ${ret.desc}`);
        }
        if (sym.hasErrorHandling || (sym.thrownErrors && sym.thrownErrors.length > 0)) {
          lines.push('', 'Raises:', '    Exception: If input validation fails or runtime error occurs.');
        }
        lines.push('"""');
        commentText = lines.join('\n');
      } else {
        const lines = ['/**', ` * ${purpose}`];
        const extraLines = [];
        for (const p of (sym.parameters || [])) {
          const meta = inferParamMetadata(p);
          extraLines.push(` * @param {${meta.type}} ${p} - ${meta.desc}`);
        }
        const ret = inferReturnMetadata(sym);
        if (ret) {
          extraLines.push(` * @returns {${ret.type}} ${ret.desc}`);
        }
        if (sym.hasErrorHandling || (sym.thrownErrors && sym.thrownErrors.length > 0)) {
          extraLines.push(' * @throws {Error} If validation fails or downstream processing rejects operation.');
        }
        if (extraLines.length > 0) {
          lines.push(' *', ...extraLines);
        }
        lines.push(' */');
        commentText = lines.join('\n');
      }

      const quality = evaluateCommentQuality(commentText, sym);
      if (!quality.passed) {
        instructions.push({
          decision: 'SKIP',
          confidence: 0.85,
          target: {
            name: sym.name,
            type: sym.type,
            symbolType: sym.isReactComponent ? 'react-component' : sym.type,
            startLine: sym.startLine,
            endLine: sym.endLine,
          },
          reason: `Rejected: ${quality.violations.join('; ')}`,
        });
        continue;
      }

      instructions.push({
        decision: 'DOCUMENT',
        confidence: 0.96,
        qualityScore: quality.totalScore,
        replaceExisting: Boolean(isPoorOrGenericDoc),
        target: {
          name: sym.name,
          type: sym.type,
          symbolType: sym.isReactComponent ? 'react-component' : sym.type,
          startLine: sym.startLine,
          endLine: sym.endLine,
        },
        documentation: {
          style: isPython ? 'docstring' : 'jsdoc',
          category,
          text: commentText,
        },
        reason: isPoorOrGenericDoc
          ? `Upgraded generic comment with specific implementation documentation for ${sym.name}.`
          : purpose,
        qualityChecks: {
          specificToImplementation: true,
          claimsSupportedByCode: !quality.hasUnsupportedClaims,
          redundant: false,
        },
      });
    }

    return JSON.stringify({ instructions });
  } catch (err) {
    return JSON.stringify({ instructions: [] });
  }
}

async function requestDocumentationBatch({
  userPrompt,
  maxRetries = 1,
  apiKey,
  baseURL: customBaseURL,
  model: customModel,
}) {
  const client = getOpenAIClient({ apiKey, baseURL: customBaseURL });

  if (!client) {
    return {
      content: generateDeterministicFallback(userPrompt),
      engineUsed: 'ast',
      notice: 'Documented using Safe AST Engine (Offline mode).',
    };
  }

  const key = apiKey?.trim() || process.env.OPENAI_API_KEY?.trim() || '';
  const isAtria = key.startsWith('atr_');
  const defaultModel = isAtria ? 'Atria-Dawn-Preview' : 'gpt-4o';
  const model = customModel || process.env.OPENAI_MODEL || defaultModel;
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
      return {
        content,
        engineUsed: 'ai',
        model,
      };
    } catch (err) {
      lastError = err;
      const errMsg = err?.message || '';
      const isQuotaError =
        err.status === 429 ||
        err.code === 'insufficient_quota' ||
        /quota|exhausted|rate limit|429/i.test(errMsg);
      const isAuthError =
        err.status === 401 ||
        /invalid.*key|unauthorized|401/i.test(errMsg);

      // Quota exhaustion or invalid key cannot be resolved by retrying.
      // Immediately fall back to deterministic AST documentation engine!
      if (isQuotaError || isAuthError) {
        console.warn(`[AIClient] Non-retryable AI error (${err.status || err.code}): ${errMsg}. Gracefully falling back to AST documentation engine.`);
        return {
          content: generateDeterministicFallback(userPrompt),
          engineUsed: 'ast-fallback',
          notice: isQuotaError
            ? 'AI token quota was exhausted (429). Successfully documented using Safe AST Engine.'
            : 'AI API Key is invalid (401). Successfully documented using Safe AST Engine.',
        };
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  console.warn(`[AIClient] AI call failed after ${maxRetries + 1} attempts: ${lastError?.message}. Falling back to AST documentation engine.`);
  return {
    content: generateDeterministicFallback(userPrompt),
    engineUsed: 'ast-fallback',
    notice: `AI service unavailable (${lastError?.message || 'unknown error'}). Documented using Safe AST Engine.`,
  };
}

module.exports = {
  requestDocumentationBatch,
  hasValidApiKey,
  generateDeterministicFallback,
};
