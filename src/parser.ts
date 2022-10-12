import {
  ASTBase,
  ASTPosition,
  Parser as ParserBase,
  ParserOptions as ParserOptionsBase,
  TokenType
} from 'greyscript-core';

import Lexer from './lexer';
import {
  ASTChunkAdvanced,
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTProvider
} from './parser/ast';
import { GreybelKeyword } from './types/keywords';
import { Selectors } from './types/selector';

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
      if (me.isOneOf(Selectors.EndOfLine, Selectors.Comment, Selectors.EndOfFile)) break;
    }

    return path;
  }

  parseFeatureIncludeStatement(): ASTFeatureIncludeExpression {
    const me = this;
    const start = me.previousToken.getStart();
    const path = me.parseFeaturePath();

    const base = me.astProvider.featureIncludeExpression({
      path,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });

    me.includes.push(base);

    return base;
  }

  parseFeatureImportStatement(): ASTFeatureImportExpression | ASTBase {
    const me = this;
    const start = me.previousToken.getStart();
    const name = me.parseIdentifier();

    if (!me.consume(Selectors.From)) {
      return me.raise(`Unexpected from at line ${me.token.line}.`, me.token);
    }

    const path = me.parseFeaturePath();

    const base = me.astProvider.featureImportExpression({
      name,
      path,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });

    me.imports.push(base);

    return base;
  }

  parseFeatureEnvarStatement(): ASTBase {
    const me = this;
    const start = me.previousToken.getStart();
    const name = me.token.value;

    me.next();

    const base: ASTBase = me.astProvider.featureEnvarExpression({
      name,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });

    return base;
  }

  parsePrimary(): ASTBase | null {
    const me = this;

    if (me.is(Selectors.Envar)) {
      me.next();
      return me.parseFeatureEnvarStatement();
    }

    return super.parsePrimary();
  }

  parseStatement(): ASTBase | null {
    const me = this;

    if (TokenType.Keyword === me.token.type) {
      const value = me.token.value;

      switch (value) {
        case GreybelKeyword.Include:
          me.next();
          return me.parseFeatureIncludeStatement();
        case GreybelKeyword.Import:
          me.next();
          return me.parseFeatureImportStatement();
        case GreybelKeyword.Envar:
          me.next();
          return me.parseFeatureEnvarStatement();
        case GreybelKeyword.Debugger:
          me.next();
          return me.astProvider.featureDebuggerExpression({
            start: new ASTPosition(
              me.previousToken.line,
              me.previousToken.lineRange[0]
            ),
            end: new ASTPosition(
              me.previousToken.line,
              me.previousToken.lineRange[1]
            ),
            scope: me.currentScope
          });
        default:
          break;
      }
    }

    return super.parseStatement();
  }

  parseChunk(): ASTChunkAdvanced | ASTBase {
    const me = this;

    me.next();

    const start = me.token.getStart();
    const chunk = me.astProvider.chunkAdvanced({ start, end: null });

    me.pushScope(chunk);

    const body = me.parseBlock();

    me.popScope();

    if (TokenType.EOF !== me.token.type) {
      return me.raise(
        `Unexpected end of file at line ${me.token.line}.`,
        me.token
      );
    }

    chunk.body = body;
    chunk.nativeImports = me.nativeImports;
    chunk.imports = me.imports;
    chunk.includes = me.includes;
    chunk.literals = me.literals;
    chunk.scopes = me.scopes;
    chunk.lines = me.lines;
    chunk.end = me.token.getEnd();

    return chunk;
  }
}
