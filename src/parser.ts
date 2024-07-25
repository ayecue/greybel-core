import {
  ASTBase,
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
  ASTChunkAdvanced,
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
import { Selectors } from './types/selector';

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
    while (me.isOneOf(Selectors.EndOfLine, Selectors.Comment)) {
      if (me.is(Selectors.Comment)) {
        const comment = me.astProvider.comment({
          value: me.token.value,
          isMultiline: me.token.value.indexOf('\n') !== -1,
          start: me.token.getStart(),
          end: me.token.getEnd(),
          scope: me.currentScope
        });

        me.addLine(comment);
        me.backpatches.peek().body.push(comment);
      } else {
        lines++;
      }

      me.next();
    }

    return lines;
  }

  parseMap(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!me.is(Selectors.CLBracket)) {
      return me.parseList(asLval, statementStart);
    }

    const scope = me.currentScope;
    const start = me.token.getStart();
    const fields: ASTMapKeyString[] = [];
    const mapConstructorExpr = me.astProvider.mapConstructorExpression({
      fields,
      start,
      end: null,
      scope
    });

    me.next();

    if (me.is(Selectors.CRBracket)) {
      me.next();
    } else {
      while (!me.is(Selectors.EndOfFile)) {
        me.skipNewlines();

        if (me.is(Selectors.CRBracket)) {
          me.next();
          break;
        }

        const keyValueItem = me.astProvider.mapKeyString({
          key: null,
          value: null,
          start: me.token.getStart(),
          end: null,
          scope
        });
        keyValueItem.key = me.parseExpr(null);

        me.requireToken(Selectors.MapKeyValueSeperator);
        me.skipNewlines();

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: keyValueItem.key,
              base: me.currentAssignment.variable,
              start: keyValueItem.start,
              end: me.token.getEnd(),
              scope
            }),
            init: null,
            start: keyValueItem.start,
            end: null
          });
          const previousAssignment = me.currentAssignment;

          me.currentAssignment = assign;
          keyValueItem.value = me.parseExpr(keyValueItem);
          me.currentAssignment = previousAssignment;

          assign.init = keyValueItem.value;
          assign.end = me.previousToken.getEnd();

          scope.assignments.push(assign);
        } else {
          keyValueItem.value = me.parseExpr(keyValueItem);
        }

        keyValueItem.end = me.previousToken.getEnd();
        fields.push(keyValueItem);

        me.skipNewlines();

        if (
          Selectors.CRBracket.is(
            me.requireTokenOfAny(
              [Selectors.MapSeperator, Selectors.CRBracket],
              start
            )
          )
        )
          break;
      }
    }

    mapConstructorExpr.end = me.token.getStart();

    return mapConstructorExpr;
  }

  parseList(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;

    if (!me.is(Selectors.SLBracket)) {
      return me.parseQuantity(asLval, statementStart);
    }

    const scope = me.currentScope;
    const start = me.token.getStart();
    const fields: ASTListValue[] = [];
    const listConstructorExpr = me.astProvider.listConstructorExpression({
      fields,
      start,
      end: null,
      scope
    });

    me.next();

    if (me.is(Selectors.SRBracket)) {
      me.next();
    } else {
      while (!me.is(Selectors.EndOfFile)) {
        me.skipNewlines();

        if (me.is(Selectors.SRBracket)) {
          me.next();
          break;
        }

        const listValue = me.astProvider.listValue({
          value: null,
          start: me.token.getStart(),
          end: null,
          scope
        });

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: me.astProvider.literal(TokenType.NumericLiteral, {
                value: fields.length,
                raw: `${fields.length}`,
                start,
                end: me.token.getEnd(),
                scope
              }),
              base: me.currentAssignment.variable,
              start: null,
              end: null,
              scope
            }),
            init: null,
            start: null,
            end: null
          });
          const previousAssignment = me.currentAssignment;
          const startToken = me.token;

          me.currentAssignment = previousAssignment;

          listValue.value = me.parseExpr(listValue);

          me.currentAssignment = previousAssignment;

          assign.variable.start = startToken.getStart();
          assign.variable.end = me.previousToken.getEnd();
          assign.init = listValue.value;
          assign.start = listValue.start;
          assign.end = me.previousToken.getEnd();

          scope.assignments.push(assign);
        } else {
          listValue.value = me.parseExpr(listValue);
        }

        listValue.end = me.previousToken.getEnd();
        fields.push(listValue);

        me.skipNewlines();

        if (
          Selectors.SRBracket.is(
            me.requireTokenOfAny(
              [Selectors.ListSeperator, Selectors.SRBracket],
              start
            )
          )
        )
          break;
      }
    }

    listConstructorExpr.end = me.token.getStart();

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

    while (
      !me.isOneOf(Selectors.EndOfLine, Selectors.Comment, Selectors.EndOfFile)
    ) {
      path = path + me.token.value;
      me.next();
    }

    me.consumeMany(Selectors.EndOfLine, Selectors.Comment, Selectors.EndOfFile);

    return path;
  }

  parseFeatureIncludeStatement(): ASTFeatureIncludeExpression {
    const me = this;
    const start = me.previousToken.getStart();
    const path = me.parsePathSegment();

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
      me.raise(
        `expected from keyword`,
        new Range(
          start,
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        )
      );

      return me.parseInvalidCode();
    }

    const path = me.parsePathSegment();

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

  parseFeatureEnvarExpression(): ASTFeatureEnvarExpression {
    const me = this;
    const start = me.previousToken.getStart();
    const name = me.token.value;

    me.next();

    return me.astProvider.featureEnvarExpression({
      name,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });
  }

  parseFeatureInjectExpression(): ASTFeatureInjectExpression {
    const me = this;
    const start = me.previousToken.getStart();
    const path = this.parsePathSegment();

    me.next();

    const expr = me.astProvider.featureInjectExpression({
      path,
      start,
      end: me.previousToken.getEnd(),
      scope: me.currentScope
    });

    me.injects.push(expr);

    return expr;
  }

  parseIsa(asLval: boolean = false, statementStart: boolean = false): ASTBase {
    const me = this;
    const start = me.token.getStart();
    const val = me.parseBitwiseOr(asLval, statementStart);

    if (me.is(Selectors.Isa)) {
      me.next();

      me.skipNewlines();

      const opB = me.parseBitwiseOr();

      return me.astProvider.binaryExpression({
        operator: OperatorBase.Isa,
        left: val,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
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
    const start = me.token.getStart();
    const val = me.parseBitwiseAnd(asLval, statementStart);
    let base = val;

    while (me.is(Selectors.BitwiseOr)) {
      me.next();

      const opB = me.parseBitwiseAnd();

      base = me.astProvider.binaryExpression({
        operator: Operator.BitwiseOr as unknown as OperatorBase,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
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
    const start = me.token.getStart();
    const val = me.parseComparisons(asLval, statementStart);
    let base = val;

    while (me.is(Selectors.BitwiseAnd)) {
      me.next();

      const opB = me.parseComparisons();

      base = me.astProvider.binaryExpression({
        operator: Operator.BitwiseAnd,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
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
    const start = me.token.getStart();
    const val = me.parseBitwise(asLval, statementStart);
    let base = val;

    while (
      me.is(Selectors.Plus) ||
      (me.is(Selectors.Minus) &&
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
        start,
        end: me.previousToken.getEnd(),
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
    const start = me.token.getStart();
    const val = me.parseMultDiv(asLval, statementStart);
    let base = val;

    while (
      me.isOneOf(
        Selectors.LeftShift,
        Selectors.RightShift,
        Selectors.UnsignedRightShift
      )
    ) {
      const token = me.token;

      me.next();
      me.skipNewlines();

      const opB = me.parseMultDiv();

      base = me.astProvider.binaryExpression({
        operator: <Operator>token.value,
        left: base,
        right: opB,
        start,
        end: me.previousToken.getEnd(),
        scope: me.currentScope
      });
    }

    return base;
  }

  parseAtom(): ASTBase | null {
    const me = this;

    if (me.is(Selectors.Envar)) {
      me.next();
      return me.parseFeatureEnvarExpression();
    } else if (me.is(Selectors.Inject)) {
      me.next();
      return me.parseFeatureInjectExpression();
    } else if (me.is(Selectors.Line)) {
      me.next();
      return me.astProvider.featureLineExpression({
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
    }
    if (me.is(Selectors.File)) {
      me.next();
      return me.astProvider.featureFileExpression({
        filename: me.filename,
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
          me.addLine(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Import:
        case GreybelKeyword.ImportWithComment: {
          me.next();
          const item = me.parseFeatureImportStatement();
          me.addLine(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Envar: {
          me.next();
          const item = me.parseFeatureEnvarExpression();
          me.addLine(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Inject: {
          me.next();
          const item = me.parseFeatureInjectExpression();
          me.addLine(item);
          pendingBlock.body.push(item);
          return;
        }
        case GreybelKeyword.Debugger: {
          me.next();
          const item = me.astProvider.featureDebuggerExpression({
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
          me.addLine(item);
          pendingBlock.body.push(item);
          return;
        }
        default:
          break;
      }
    }

    super.parseStatement();
  }

  parseChunk(): ASTChunkAdvanced | ASTBase {
    const me = this;

    me.next();

    const start = me.token.getStart();
    const chunk = me.astProvider.chunkAdvanced({ start, end: null });
    const pending = new PendingChunk(chunk);

    me.backpatches.setDefault(pending);
    me.pushScope(chunk);

    while (!me.is(Selectors.EndOfFile)) {
      me.skipNewlines();

      if (me.is(Selectors.EndOfFile)) break;

      me.lexer.recordSnapshot();
      me.statementErrors = [];

      me.parseStatement();

      if (me.statementErrors.length > 0) {
        me.errors.push(me.statementErrors[0]);

        if (!me.unsafe) {
          me.lexer.clearSnapshot();
          throw me.statementErrors[0];
        }

        me.lexer.recoverFromSnapshot();

        me.next();

        while (
          me.token.type !== TokenType.EOL &&
          me.token.type !== TokenType.EOF
        ) {
          me.next();
        }
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
    me.popScope();

    chunk.body = last.body;
    chunk.literals = me.literals;
    chunk.scopes = me.scopes;
    chunk.lines = me.lines;
    chunk.end = me.token.getEnd();
    chunk.imports = me.imports;
    chunk.includes = me.includes;
    chunk.injects = me.injects;

    return chunk;
  }
}
