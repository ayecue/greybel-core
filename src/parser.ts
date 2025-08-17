import {
  ASTBase,
  ASTIdentifierKind,
  ASTListValue,
  ASTMapKeyString,
  ASTPosition,
  ASTType,
  isPendingChunk,
  Operator as OperatorBase,
  Parser as ParserBase,
  ParserOptions as ParserOptionsBase,
  PendingChunk,
  TokenType
} from 'miniscript-core';
import { Position } from 'miniscript-core/dist/types/position';
import { Range } from 'miniscript-core/dist/types/range';

import Lexer from './lexer';
import {
  ASTChunkGreybel,
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTProvider
} from './parser/ast';
import {
  ASTFeatureEnvarExpression,
  ASTFeatureInjectExpression
} from './parser/ast/feature';
import { GreybelKeyword } from './types/keywords';
import { Operator } from './types/operators';
import { SelectorGroups, Selectors } from './types/selector';

export interface ParserOptions extends ParserOptionsBase {
  astProvider?: ASTProvider;
  lexer?: Lexer;
  filename?: string;
}

export default class Parser extends ParserBase {
  filename: string;
  imports: ASTFeatureImportExpression[];
  includes: ASTFeatureIncludeExpression[];
  injects: ASTFeatureInjectExpression[];
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

    me.filename = options.filename ?? 'unknown';
    me.imports = [];
    me.includes = [];
    me.injects = [];
  }

  skipNewlines(): number {
    const me = this;
    let lines = 0;
    while (true) {
      if (Selectors.Comment(me.token)) {
        const isStatement = me.previousToken?.line !== me.token.line;
        const comment = me.astProvider.comment({
          value: me.token.value,
          isMultiline: me.token.value.indexOf('\n') !== -1,
          start: me.token.start,
          end: me.token.end,
          range: me.token.range,
          scope: me.currentScope,
          isStatement
        });

        me.comments.push(comment);
        me.lineRegistry.addItemToLines(comment);
      } else if (Selectors.EndOfLine(me.token)) {
        lines++;
      } else {
        break;
      }

      me.next();
    }

    return lines;
  }

  parseMap(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!Selectors.CLBracket(me.token)) {
      return me.parseList(asLval, statementStart);
    }

    const scope = me.currentScope;
    const startToken = me.token;
    const fields: ASTMapKeyString[] = [];
    const mapConstructorExpr = me.astProvider.mapConstructorExpression({
      fields,
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope
    });

    me.next();

    if (Selectors.CRBracket(me.token)) {
      me.next();
    } else {
      while (!Selectors.EndOfFile(me.token)) {
        me.skipNewlines();

        if (Selectors.CRBracket(me.token)) {
          me.next();
          break;
        }

        const keyValueItem = me.astProvider.mapKeyString({
          key: null,
          value: null,
          start: me.token.start,
          end: null,
          range: [me.token.range[0], null],
          scope
        });
        keyValueItem.key = me.parseExpr(null);

        me.requireToken(Selectors.MapKeyValueSeperator);
        me.skipNewlines();

        keyValueItem.value = me.parseExpr(keyValueItem);
        keyValueItem.end = me.previousToken.end;
        keyValueItem.range[1] = me.previousToken.range[1];
        fields.push(keyValueItem);

        me.skipNewlines();

        const token = me.requireTokenOfAny(
          SelectorGroups.MapSeparator,
          startToken.start
        );

        if (Selectors.CRBracket(token)) break;
      }
    }

    mapConstructorExpr.end = me.token.start;
    mapConstructorExpr.range[1] = me.token.range[1];

    return mapConstructorExpr;
  }

  parseList(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!Selectors.SLBracket(me.token)) {
      return me.parseQuantity(asLval, statementStart);
    }

    const scope = me.currentScope;
    const startToken = me.token;
    const fields: ASTListValue[] = [];
    const listConstructorExpr = me.astProvider.listConstructorExpression({
      fields,
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null],
      scope
    });

    me.next();

    if (Selectors.SRBracket(me.token)) {
      me.next();
    } else {
      while (!Selectors.EndOfFile(me.token)) {
        me.skipNewlines();

        if (Selectors.SRBracket(me.token)) {
          me.next();
          break;
        }

        const listValue = me.astProvider.listValue({
          value: null,
          start: me.token.start,
          end: null,
          range: [me.token.range[0], null],
          scope
        });

        listValue.value = me.parseExpr(listValue);
        listValue.end = me.previousToken.end;
        listValue.range[1] = me.previousToken.range[1];
        fields.push(listValue);

        me.skipNewlines();

        const token = me.requireTokenOfAny(
          SelectorGroups.ListSeparator,
          startToken.start
        );

        if (Selectors.SRBracket(token)) break;
      }
    }

    listConstructorExpr.end = me.token.start;
    listConstructorExpr.range[1] = me.token.range[1];

    return listConstructorExpr;
  }

  parsePathSegment(): string {
    const me = this;

    if (this.token.type === ASTType.StringLiteral) {
      const path = this.token.value;
      this.next();
      return path;
    }

    let path: string = '';

    while (!SelectorGroups.PathSegmentEnd(me.token)) {
      path = path + me.token.value;
      me.next();
    }

    me.consumeMany(SelectorGroups.PathSegmentEnd);

    return path;
  }

  parseFeatureIncludeStatement(): ASTFeatureIncludeExpression {
    const me = this;
    const startToken = me.previousToken;
    const path = me.parsePathSegment();

    const base = me.astProvider.featureIncludeExpression({
      path,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });

    me.includes.push(base);

    return base;
  }

  parseFeatureImportStatement(): ASTFeatureImportExpression | ASTBase {
    const me = this;
    const startToken = me.previousToken;
    const name = me.parseIdentifier(ASTIdentifierKind.Variable);

    if (!me.consume(Selectors.From)) {
      me.raise(
        `expected from keyword`,
        new Range(
          startToken.start,
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.end.character
          )
        )
      );

      return me.parseInvalidCode();
    }

    const path = me.parsePathSegment();

    const base = me.astProvider.featureImportExpression({
      name,
      path,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });

    me.imports.push(base);

    me.currentScope.definitions.push(base);

    return base;
  }

  parseFeatureEnvarExpression(): ASTFeatureEnvarExpression {
    const me = this;
    const startToken = me.previousToken;
    const name = me.token.value;

    me.next();

    return me.astProvider.featureEnvarExpression({
      name,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });
  }

  parseFeatureInjectExpression(): ASTFeatureInjectExpression {
    const me = this;
    const startToken = me.previousToken;
    const path = this.parsePathSegment();

    me.next();

    const expr = me.astProvider.featureInjectExpression({
      path,
      start: startToken.start,
      end: me.previousToken.end,
      range: [startToken.range[0], me.previousToken.range[1]],
      scope: me.currentScope
    });

    me.injects.push(expr);

    return expr;
  }

  parseIsa(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseBitwiseOr(asLval, statementStart);

    if (Selectors.Isa(me.token)) {
      me.next();

      me.skipNewlines();

      const opB = me.parseBitwiseOr();

      return me.astProvider.isaExpression({
        operator: OperatorBase.Isa,
        left: val,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return val;
  }

  parseBitwiseOr(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseBitwiseAnd(asLval, statementStart);
    let base = val;

    while (Selectors.BitwiseOr(me.token)) {
      me.next();

      const opB = me.parseBitwiseAnd();

      base = me.astProvider.binaryExpression({
        operator: Operator.BitwiseOr as unknown as OperatorBase,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return base;
  }

  parseBitwiseAnd(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseComparisons(asLval, statementStart);
    let base = val;

    while (Selectors.BitwiseAnd(me.token)) {
      me.next();

      const opB = me.parseComparisons();

      base = me.astProvider.binaryExpression({
        operator: Operator.BitwiseAnd,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return base;
  }

  parseAddSub(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseBitwise(asLval, statementStart);
    let base = val;

    while (
      Selectors.Plus(me.token) ||
      (Selectors.Minus(me.token) &&
        (!statementStart || !me.token.afterSpace || me.lexer.isAtWhitespace()))
    ) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseBitwise();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return base;
  }

  parseBitwise(
    asLval: boolean = false,
    statementStart: boolean = false
  ): ASTBase {
    const me = this;
    const startToken = me.token;
    const val = me.parseMultDiv(asLval, statementStart);
    let base = val;

    while (SelectorGroups.BitwiseOperators(me.token)) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseMultDiv();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start: startToken.start,
        end: me.previousToken.end,
        range: [startToken.range[0], me.previousToken.range[1]],
        scope: me.currentScope
      });
    }

    return base;
  }

  parseAtom(): ASTBase | null {
    const me = this;

    if (Selectors.Envar(me.token)) {
      me.next();
      return me.parseFeatureEnvarExpression();
    } else if (Selectors.Inject(me.token)) {
      me.next();
      return me.parseFeatureInjectExpression();
    } else if (Selectors.Line(me.token)) {
      me.next();
      return me.astProvider.featureLineExpression({
        start: new ASTPosition(
          me.previousToken.line,
          me.previousToken.start.character
        ),
        end: new ASTPosition(
          me.previousToken.line,
          me.previousToken.end.character
        ),
        range: me.previousToken.range,
        scope: me.currentScope
      });
    }
    if (Selectors.File(me.token)) {
      me.next();
      return me.astProvider.featureFileExpression({
        filename: me.filename,
        start: new ASTPosition(
          me.previousToken.line,
          me.previousToken.start.character
        ),
        end: new ASTPosition(
          me.previousToken.line,
          me.previousToken.end.character
        ),
        range: me.previousToken.range,
        scope: me.currentScope
      });
    }

    return super.parseAtom();
  }

  parseStatement(): void {
    const me = this;
    const pendingBlock = me.backpatches.peek();

    if (me.isType(TokenType.Keyword)) {
      const value = me.token.value;

      switch (value) {
        case GreybelKeyword.Include:
        case GreybelKeyword.IncludeWithComment: {
          me.next();
          const item = me.parseFeatureIncludeStatement();
          me.lineRegistry.addItemToLines(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Import:
        case GreybelKeyword.ImportWithComment: {
          me.next();
          const item = me.parseFeatureImportStatement();
          me.lineRegistry.addItemToLines(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Envar: {
          me.next();
          const item = me.parseFeatureEnvarExpression();
          me.lineRegistry.addItemToLines(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Inject: {
          me.next();
          const item = me.parseFeatureInjectExpression();
          me.lineRegistry.addItemToLines(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Debugger: {
          me.next();
          const item = me.astProvider.featureDebuggerExpression({
            start: new ASTPosition(
              me.previousToken.line,
              me.previousToken.start.character
            ),
            end: new ASTPosition(
              me.previousToken.line,
              me.previousToken.end.character
            ),
            range: me.previousToken.range,
            scope: me.currentScope
          });
          me.lineRegistry.addItemToLines(item);
          pendingBlock.body.push(item);
          return;
        }
        default:
          break;
      }
    }

    super.parseStatement();
  }

  parseChunk(): ASTChunkGreybel | ASTBase {
    const me = this;

    me.next();

    const startToken = me.token;
    const chunk = me.astProvider.chunk({
      start: startToken.start,
      end: null,
      range: [startToken.range[0], null]
    }) as ASTChunkGreybel;
    const pending = new PendingChunk(chunk, me.lineRegistry);

    me.backpatches.setDefault(pending);
    me.pushScope(chunk);

    while (!Selectors.EndOfFile(me.token)) {
      me.skipNewlines();

      if (Selectors.EndOfFile(me.token)) break;

      me.lexer.recordSnapshot();
      me.statementErrors = [];

      me.parseStatement();

      if (me.statementErrors.length > 0) {
        me.tryToRecover();
      }
    }

    let last = me.backpatches.pop();

    while (!isPendingChunk(last)) {
      const exception = me.raise(
        `found open block ${last.block.type}`,
        new Range(last.block.start, last.block.start)
      );

      last.complete(me.previousToken);

      me.errors.push(exception);

      if (!me.unsafe) {
        throw exception;
      }

      last = me.backpatches.pop();
    }

    me.finishRemaingScopes();
    me.popScope();
    pending.complete(me.token);

    chunk.literals = me.literals;
    chunk.comments = me.comments;
    chunk.scopes = me.scopes;
    chunk.lines = me.lineRegistry.lines;
    chunk.imports = me.imports;
    chunk.includes = me.includes;
    chunk.injects = me.injects;

    return chunk;
  }
}
