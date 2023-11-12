import {
  ASTBase,
  ASTListValue,
  ASTMapKeyString,
  ASTPosition,
  Operator as OperatorBase,
  Parser as ParserBase,
  ParserOptions as ParserOptionsBase,
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
import { GreybelKeyword } from './types/keywords';
import { Operator } from './types/operators';
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

        me.currentBlock.push(comment);
        me.addLine(comment);
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

    const start = me.token.getStart();
    const fields: ASTMapKeyString[] = [];
    const mapConstructorExpr = me.astProvider.mapConstructorExpression({
      fields,
      start,
      end: null,
      scope: me.currentScope
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

        const key = me.parseExpr();
        let value: ASTBase = null;

        me.requireToken(Selectors.MapKeyValueSeperator);
        me.skipNewlines();

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: key,
              base: me.currentAssignment.variable,
              start: key.start,
              end: key.end,
              scope: me.currentScope
            }),
            init: null,
            start: key.start,
            end: null
          });
          const previousAssignment = me.currentAssignment;

          me.currentAssignment = assign;
          value = me.parseExpr();
          me.currentAssignment = previousAssignment;

          assign.init = value;
          assign.end = value.end;

          me.currentScope.assignments.push(assign);
        } else {
          value = me.parseExpr();
        }

        fields.push(
          me.astProvider.mapKeyString({
            key,
            value,
            start: key.start,
            end: value.end,
            scope: me.currentScope
          })
        );

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

    const start = me.token.getStart();
    const fields: ASTListValue[] = [];
    const listConstructorExpr = me.astProvider.listConstructorExpression({
      fields,
      start,
      end: null,
      scope: me.currentScope
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

        let value: ASTBase = null;

        if (me.currentAssignment) {
          const assign = me.astProvider.assignmentStatement({
            variable: me.astProvider.indexExpression({
              index: me.astProvider.literal(TokenType.NumericLiteral, {
                value: fields.length,
                raw: `${fields.length}`,
                start,
                end: me.token.getEnd(),
                scope: me.currentScope
              }),
              base: me.currentAssignment.variable,
              start: null,
              end: null,
              scope: me.currentScope
            }),
            init: null,
            start: null,
            end: null
          });
          const previousAssignment = me.currentAssignment;

          me.currentAssignment = previousAssignment;

          value = me.parseExpr();

          me.currentAssignment = previousAssignment;

          assign.variable.start = value.start;
          assign.variable.end = value.end;
          assign.init = value;
          assign.start = value.start;
          assign.end = value.end;

          me.currentScope.assignments.push(assign);
        } else {
          value = me.parseExpr();
        }

        fields.push(
          me.astProvider.listValue({
            value,
            start: value.start,
            end: value.end,
            scope: me.currentScope
          })
        );

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
      return me.raise(
        `expected from keyword`,
        new Range(
          start,
          new Position(
            me.token.lastLine ?? me.token.line,
            me.token.lineRange[1]
          )
        ),
        false
      );
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

    while (me.isOneOf(Selectors.Plus, Selectors.Minus)) {
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
        case GreybelKeyword.IncludeWithComment:
          me.next();
          return me.parseFeatureIncludeStatement();
        case GreybelKeyword.Import:
        case GreybelKeyword.ImportWithComment:
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
