const { getParserForLanguage } = require('../../parsers');

function validateSyntax(code, language = 'javascript') {
  if (!code || typeof code !== 'string') {
    return {
      valid: false,
      errors: ['Code is empty or not a string'],
    };
  }

  const parser = getParserForLanguage(language);
  const result = parser.validate(code);

  return {
    valid: result.valid,
    errors: result.errors || [],
  };
}

module.exports = {
  validateSyntax,
};
