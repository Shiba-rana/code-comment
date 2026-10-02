class BaseParser {
  constructor(languageName) {
    this.languageName = languageName;
  }

  parse(code) {
    throw new Error(`parse() must be implemented by ${this.constructor.name}`);
  }

  extractSymbols(ast, code) {
    throw new Error(`extractSymbols() must be implemented by ${this.constructor.name}`);
  }

  extractComments(ast, code) {
    throw new Error(`extractComments() must be implemented by ${this.constructor.name}`);
  }

  getInsertionLocation(symbol, code) {
    throw new Error(`getInsertionLocation() must be implemented by ${this.constructor.name}`);
  }

  validate(code) {
    throw new Error(`validate() must be implemented by ${this.constructor.name}`);
  }

  stripComments(code) {
    throw new Error(`stripComments() must be implemented by ${this.constructor.name}`);
  }

  getStructuralRepresentation(ast) {
    throw new Error(`getStructuralRepresentation() must be implemented by ${this.constructor.name}`);
  }
}

module.exports = BaseParser;
