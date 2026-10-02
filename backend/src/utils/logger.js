function formatLog({
  level = 'INFO',
  requestId = 'req',
  language = 'unknown',
  fileSize = 0,
  symbolsFound = 0,
  symbolsAnalyzed = 0,
  commentsAdded = 0,
  aiLatencyMs = 0,
  validationResult = 'pending',
  extra = '',
}) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] requestId=${requestId} language=${language} fileSize=${fileSize}B symbolsFound=${symbolsFound} symbolsAnalyzed=${symbolsAnalyzed} commentsAdded=${commentsAdded} latency=${aiLatencyMs}ms validation=${validationResult}${extra ? ' ' + extra : ''}`;
}

const logger = {
  info(metadata) {
    console.log(formatLog({ level: 'INFO', ...metadata }));
  },
  warn(metadata) {
    console.warn(formatLog({ level: 'WARN', ...metadata }));
  },
  error(metadata) {
    console.error(formatLog({ level: 'ERROR', ...metadata }));
  },
};

module.exports = logger;
