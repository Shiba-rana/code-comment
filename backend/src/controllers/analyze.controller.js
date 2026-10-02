const codeAnalyzerService = require('../services/codeAnalyzer.service');

async function analyzeCode(req, res) {
  try {
    const { filename, language, code, mode, threshold, autoApplyConfidence } = req.body;

    const result = await codeAnalyzerService.analyzeCode({
      filename,
      language,
      code,
      mode,
      threshold,
      autoApplyConfidence,
    });

    return res.status(200).json(result);
  } catch (err) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Unable to analyze code.';

    console.error(`[AnalyzeController] Error (${statusCode}):`, message);

    return res.status(statusCode).json({
      success: false,
      error: message,
    });
  }
}

module.exports = { analyzeCode };
