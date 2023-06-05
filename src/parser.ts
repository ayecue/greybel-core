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

  skipNewlines() {
    const me = this;
    while (me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      if (me.is(Selectors.Comment)) {
        const comment = me.astProvider.comment({
          value: me.token.value,
          isMultiline: me.token.value.indexOf('\n') !== -1,
          start: me.token.getStart(),
          end: me.token.getEnd(),
          scope: me.currentScope
        });

        me.currentBlock.push(comment);
        me.addLine(comment);
      }

      me.next();
    }
  }

  parseFeaturePath(): string {
    const me = this;
    let path = '';

    while (true) {
      path = path + me.token.value;
      me.next();
      if (
        me.isOneOf(Selectors.EndOfLine, Selectors.Comment, Selectors.EndOfFile)
      )
        break;
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
      return me.raise(`expected from keyword`, me.token, false);
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

    const assign = me.astProvider.assignmentStatement({
      variable: name,
      init: me.astProvider.literal(TokenType.NilLiteral, {
        value: null,
        raw: 'null',
        start: name.start,
        end: name.end,
        scope: me.currentScope
      }),
      start: name.start,
      end: name.end,
      scope: me.currentScope
    });

    me.currentScope.assignments.push(assign);

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

  parseAtom(): ASTBase | null {
    const me = this;

    if (me.is(Selectors.Envar)) {
      me.next();
      return me.parseFeatureEnvarStatement();
    }

    return super.parseAtom();
  }

  parseStatement(): ASTBase | null {
    const me = this;

    if (me.isType(TokenType.Keyword)) {
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
    const block: ASTBase[] = [];

    me.currentBlock = block;

    me.pushScope(chunk);

    while (!me.is(Selectors.EndOfFile)) {
      me.skipNewlines();

      if (me.is(Selectors.EndOfFile)) break;

      const statement = me.parseStatement();

      if (statement) {
        me.addLine(statement);
        block.push(statement);
      }
    }

    me.popScope();

    chunk.body = block;
    chunk.nativeImports = me.nativeImports;
    chunk.literals = me.literals;
    chunk.scopes = me.scopes;
    chunk.lines = me.lines;
    chunk.end = me.token.getEnd();
    chunk.imports = me.imports;
    chunk.includes = me.includes;

    me.currentBlock = null;

    return chunk;
  }
}
