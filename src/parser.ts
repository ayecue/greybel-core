import {
  ASTBase,
  ASTPosition,
  Parser as ParserBase,
  ParserOptions as ParserOptionsBase,
  TokenType,
  UnexpectedEOF
} from 'greyscript-core';

import Lexer from './lexer';
import {
  ASTChunkAdvanced,
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTProvider
} from './parser/ast';

export interface ParserOptions extends ParserOptionsBase {
  astProvider?: ASTProvider;
  lexer?: Lexer;
}

export default class Parser extends ParserBase {
  imports: ASTFeatureImportExpression[];
  includes: ASTFeatureIncludeExpression[];
  astProvider: ASTProvider;

  constructor(content: string, options: ParserOptions = {}) {
    options.lexer =
      options.lexer ||
      new Lexer(content, {
        unsafe: options.unsafe,
        tabWidth: options.tabWidth
      });
    options.astProvider = options.astProvider || new ASTProvider();
    super(content, options);

    const me = this;

    me.imports = [];
    me.includes = [];
  }

  parseFeaturePath(): string {
    const me = this;
    let path = '';

    while (true) {
      path = path + me.token.value;
      me.next();
      if (me.token.value === ';' || me.token.value === '<eof>') break;
    }

    return path;
  }

  parseFeatureIncludeStatement(): ASTFeatureIncludeExpression {
    const me = this;
    const start = new ASTPosition(me.previousToken.line, me.previousToken.lineRange[0]);
    const path = me.parseFeaturePath();

    me.expect(';');

    const base = me.astProvider.featureIncludeExpression({
      path,
      start,
      end: new ASTPosition(me.token.line, me.token.lineRange[1]),
      scope: me.currentScope
    });

    me.includes.push(base);

    return base;
  }

  parseFeatureImportStatement(): ASTFeatureImportExpression {
    const me = this;
    const start = new ASTPosition(me.previousToken.line, me.previousToken.lineRange[0]);
    const name = me.parseIdentifier();

    me.expect('from');

    const path = me.parseFeaturePath();

    me.expect(';');

    const base = me.astProvider.featureImportExpression({
      name,
      path,
      start,
      end: new ASTPosition(me.token.line, me.token.lineRange[1]),
      scope: me.currentScope
    });

    me.imports.push(base);

    return base;
  }

  parseFeatureEnvarStatement(): ASTBase {
    const me = this;
    const start = new ASTPosition(me.previousToken.line, me.previousToken.lineRange[0]);
    const name = me.token.value;

    me.next();
    me.expect(';');

    let base: ASTBase = me.astProvider.featureEnvarExpression({
      name,
      start,
      end: new ASTPosition(me.token.line, me.token.lineRange[1]),
      scope: me.currentScope
    });

    if (me.token.value === '.') {
      while (true) {
        const newBase = me.parseRighthandExpressionPart(base);
        if (newBase === null) break;
        base = newBase;
      }
    }

    return base;
  }

  parsePrimaryExpression(): ASTBase | null {
    const me = this;
    const value = me.token.value;
    const type = me.token.type;

    if (TokenType.Keyword === type && value === '#envar') {
      me.next();
      return me.parseFeatureEnvarStatement();
    }

    return super.parsePrimaryExpression();
  }

  parseStatement(isShortcutStatement: boolean = false): ASTBase | null {
    const me = this;

    if (TokenType.Keyword === me.token.type) {
      const value = me.token.value;

      switch (value) {
        case '#include':
          me.next();
          return me.parseFeatureIncludeStatement();
        case '#import':
          me.next();
          return me.parseFeatureImportStatement();
        case '#envar':
          me.next();
          return me.parseFeatureEnvarStatement();
        case 'debugger':
          me.next();
          return me.astProvider.featureDebuggerExpression({
            start: new ASTPosition(me.previousToken.line, me.previousToken.lineRange[0]),
            end: new ASTPosition(me.previousToken.line, me.previousToken.lineRange[1]),
            scope: me.currentScope
          });
        default:
          break;
      }
    }

    return super.parseStatement(isShortcutStatement);
  }

  parseChunk(): ASTChunkAdvanced | ASTBase {
    const me = this;

    me.next();

    const start = new ASTPosition(me.token.line, me.token.lineRange[0]);
    const chunk = me.astProvider.chunkAdvanced({ start, end: null });

    me.pushScope(chunk);

    const body = me.parseBlock();

    me.popScope();

    if (TokenType.EOF !== me.token.type) {
      return me.raise(new UnexpectedEOF(me.token));
    }

    chunk.body = body;
    chunk.nativeImports = me.nativeImports;
    chunk.imports = me.imports;
    chunk.includes = me.includes;
    chunk.literals =  me.literals;
    chunk.scopes = me.scopes;
    chunk.end = new ASTPosition(me.token.line, me.token.lineRange[1]);

    return chunk;
  }
}
