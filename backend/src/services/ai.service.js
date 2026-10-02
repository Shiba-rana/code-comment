const OpenAI = require('openai');
const { SYSTEM_PROMPT, buildUserPrompt } = require('../prompts/documentation.prompt');

let openaiClient = null;

function getClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      throw new Error(
        'OPENAI_API_KEY is not configured. Set it in the .env file.'
      );
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

async function analyzeCode({ language, filename, code }) {
  const client = getClient();

  const userPrompt = buildUserPrompt({ language, filename, code });

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.2,
    max_tokens: 16384,
    response_format: { type: 'json_object' },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('AI returned an empty response.');
  }

  return content;
}

module.exports = { analyzeCode };
