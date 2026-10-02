const JavaScriptParser = require('./JavaScriptParser');
const TypeScriptParser = require('./TypeScriptParser');
const PythonParser = require('./PythonParser');
const JavaParser = require('./JavaParser');

const parsers = {
  javascript: new JavaScriptParser('javascript'),
  jsx: new JavaScriptParser('jsx'),
  typescript: new TypeScriptParser('typescript'),
  tsx: new TypeScriptParser('tsx'),
  python: new PythonParser(),
  java: new JavaParser(),
};

function getParserForLanguage(language) {
  if (!language || typeof language !== 'string') {
    return parsers.javascript;
  }
  const key = language.toLowerCase();
  return parsers[key] || parsers.javascript;
}

module.exports = {
  getParserForLanguage,
  JavaScriptParser,
  TypeScriptParser,
  PythonParser,
  JavaParser,
};
