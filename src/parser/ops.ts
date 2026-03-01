import { TokenType } from 'miniscript-core/dist/lexer/token';
import ParserBase from 'miniscript-core/dist/parser';
import {
  ASTBase,
  ASTIdentifierKind,
  ASTListValue,
  ASTMapKeyString
} from 'miniscript-core/dist/parser/ast';
import {
  buildAtomOpIndex,
  defaultAtomOpBuilder
} from 'miniscript-core/dist/parser/ops/atom';
import {
  buildInfixOpIndex,
  defaultInfixOpBuilder,
  groupInfixOps,
  parseCallArgs
} from 'miniscript-core/dist/parser/ops/infix';
import {
  buildKeywordOpIndex,
  defaultKeywordHandlerBuilder,
  KeywordHandlerBuilder
} from 'miniscript-core/dist/parser/ops/keyword';
import { KeywordOp } from 'miniscript-core/dist/types/ops';
import { Precedence } from 'miniscript-core/dist/types/precedence';
import { Range as ASTRange } from 'miniscript-core/dist/types/range';
import {
  SelectorGroups as BaseSelectorGroups,
  Selectors as BaseSelectors
} from 'miniscript-core/dist/types/selector';

import type Parser from '../parser';
import { SelectorGroups, Selectors } from '../types/selector';
import { ASTProvider } from './ast';
import {
  isPendingEnvCondition,
  PendingEnvCondition
} from './pending-block';

export const GreybelPrecedence = {
  BitwiseOr: Precedence.Isa + 2,
  BitwiseAnd: Precedence.Isa + 4,
  BitwiseShift: Precedence.AddSub + 5
} as const;

function greybelBinaryParse(precedence: number) {
  return (p: ParserBase, left: ASTBase, startToken: any) => {
    const token = p.token;
    p.next();
    p.consumeNoop();
    const right = p.parseExprPrecedence(precedence + 1);
    return p.astProvider.binaryExpression({
      operator: token.value as any,
      left,
      right,
      startLine: startToken.line,
      startChar: startToken.startChar,
      endLine: p.previousToken.endLine,
      endChar: p.previousToken.endChar,
      rangeStart: startToken.rangeStart,
      rangeEnd: p.previousToken.rangeEnd,
      scope: p.currentScope
    });
  };
}

function greybelParseCallArgs(me: Parser): ASTBase[] {
  const expressions: ASTBase[] = [];

  if (BaseSelectors.LParenthesis(me.token)) {
    me.next();

    if (BaseSelectors.RParenthesis(me.token)) {
      me.next();
    } else {
      while (!BaseSelectors.EndOfFile(me.token)) {
        me.consumeNoop();
        const arg = me.parseExpr(null);
        expressions.push(arg);
        if (!me.strictMode) me.consumeNoop();
        if (
          BaseSelectors.RParenthesis(me.requireTokenOfAny(
            SelectorGroups.CallArgsEnd,
            arg.startLine,
            arg.startChar
          ))
        )
          break;
      }
    }
  }

  return expressions;
}

export function greybelInfixOpBuilder() {
  return defaultInfixOpBuilder()
    .override(BaseSelectors.LParenthesis.selectorId, (p, left, startToken) => {
      const expressions = greybelParseCallArgs(p as Parser);
      return p.astProvider.callExpression({
        base: left,
        arguments: expressions,
        startLine: startToken.line,
        startChar: startToken.startChar,
        endLine: p.previousToken.endLine,
        endChar: p.previousToken.endChar,
        rangeStart: startToken.rangeStart,
        rangeEnd: p.previousToken.rangeEnd,
        scope: p.currentScope
      });
    })
    .add({
      match: (p) => Selectors.BitwiseOr(p.token),
      selectorId: Selectors.BitwiseOr.selectorId,
      precedence: GreybelPrecedence.BitwiseOr,
      parse: greybelBinaryParse(GreybelPrecedence.BitwiseOr)
    })
    .add({
      match: (p) => Selectors.BitwiseAnd(p.token),
      selectorId: Selectors.BitwiseAnd.selectorId,
      precedence: GreybelPrecedence.BitwiseAnd,
      parse: greybelBinaryParse(GreybelPrecedence.BitwiseAnd)
    })
    .add({
      match: (p) => Selectors.LeftShift(p.token),
      selectorId: Selectors.LeftShift.selectorId,
      precedence: GreybelPrecedence.BitwiseShift,
      parse: greybelBinaryParse(GreybelPrecedence.BitwiseShift)
    })
    .add({
      match: (p) => Selectors.RightShift(p.token),
      selectorId: Selectors.RightShift.selectorId,
      precedence: GreybelPrecedence.BitwiseShift,
      parse: greybelBinaryParse(GreybelPrecedence.BitwiseShift)
    })
    .add({
      match: (p) => Selectors.UnsignedRightShift(p.token),
      selectorId: Selectors.UnsignedRightShift.selectorId,
      precedence: GreybelPrecedence.BitwiseShift,
      parse: greybelBinaryParse(GreybelPrecedence.BitwiseShift)
    });
}

function greybelParseMap(p: Parser): ASTBase {
  const me = p;
  const scope = me.currentScope;
  const startToken = me.token;
  const fields: ASTMapKeyString[] = [];
  const mapConstructorExpr = me.astProvider.mapConstructorExpression({
    fields,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: 0,
    endChar: 0,
    rangeStart: startToken.rangeStart,
    rangeEnd: null,
    scope
  });

  me.next();

  if (BaseSelectors.CRBracket(me.token)) {
    me.next();
  } else {
    while (!BaseSelectors.EndOfFile(me.token)) {
      me.consumeNoop();

      if (BaseSelectors.CRBracket(me.token)) {
        me.next();
        break;
      }

      const keyValueItem = me.astProvider.mapKeyString({
        key: null,
        value: null,
        startLine: me.token.line,
        startChar: me.token.startChar,
        endLine: 0,
        endChar: 0,
        rangeStart: me.token.rangeStart,
        rangeEnd: null,
        scope
      });
      keyValueItem.key = me.parseExpr(null);

      me.requireToken(BaseSelectors.MapKeyValueSeparator);
      me.consumeNoop();

      keyValueItem.value = me.parseExpr(keyValueItem);
      keyValueItem.endLine = me.previousToken.endLine;
      keyValueItem.endChar = me.previousToken.endChar;
      keyValueItem.rangeEnd = me.previousToken.rangeEnd;
      fields.push(keyValueItem);

      if (!me.strictMode) me.consumeNoop();

      const token = me.requireTokenOfAny(
        SelectorGroups.MapSeparator,
        startToken.line,
        startToken.startChar
      );

      if (BaseSelectors.CRBracket(token)) break;

      me.consumeNoop();
    }
  }

  mapConstructorExpr.endLine = me.token.line;
  mapConstructorExpr.endChar = me.token.startChar;
  mapConstructorExpr.rangeEnd = me.token.rangeEnd;

  return mapConstructorExpr;
}

function greybelParseList(p: Parser): ASTBase {
  const me = p;
  const scope = me.currentScope;
  const startToken = me.token;
  const fields: ASTListValue[] = [];
  const listConstructorExpr = me.astProvider.listConstructorExpression({
    fields,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: 0,
    endChar: 0,
    rangeStart: startToken.rangeStart,
    rangeEnd: null,
    scope
  });

  me.next();

  if (BaseSelectors.SRBracket(me.token)) {
    me.next();
  } else {
    while (!BaseSelectors.EndOfFile(me.token)) {
      me.consumeNoop();

      if (BaseSelectors.SRBracket(me.token)) {
        me.next();
        break;
      }

      const listValue = me.astProvider.listValue({
        value: null,
        startLine: me.token.line,
        startChar: me.token.startChar,
        endLine: 0,
        endChar: 0,
        rangeStart: me.token.rangeStart,
        rangeEnd: null,
        scope
      });

      listValue.value = me.parseExpr(listValue);
      listValue.endLine = me.previousToken.endLine;
      listValue.endChar = me.previousToken.endChar;
      listValue.rangeEnd = me.previousToken.rangeEnd;
      fields.push(listValue);

      if (!me.strictMode) me.consumeNoop();

      const token = me.requireTokenOfAny(
        SelectorGroups.ListSeparator,
        startToken.line,
        startToken.startChar
      );

      if (BaseSelectors.SRBracket(token)) break;

      me.consumeNoop();
    }
  }

  listConstructorExpr.endLine = me.token.line;
  listConstructorExpr.endChar = me.token.startChar;
  listConstructorExpr.rangeEnd = me.token.rangeEnd;

  return listConstructorExpr;
}

export function greybelAtomOpBuilder() {
  return defaultAtomOpBuilder()
    .override(BaseSelectors.CLBracket.selectorId, greybelParseMap)
    .override(BaseSelectors.SLBracket.selectorId, greybelParseList)
    .add({
      match: (p) => Selectors.Envar(p.token),
      selectorId: Selectors.Envar.selectorId,
      parse: (p) => {
        const startToken = p.token;
        p.next();
        const name = p.token.value;
        p.next();
        return (p.astProvider as ASTProvider).featureEnvarExpression({
          name,
          startLine: startToken.line,
          startChar: startToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: startToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
      }
    })
    .add({
      match: (p) => Selectors.Inject(p.token),
      selectorId: Selectors.Inject.selectorId,
      parse: (p) => {
        const startToken = p.token;
        p.next();
        const path = parsePathSegment(p);
        p.next();
        const expr = (p.astProvider as ASTProvider).featureInjectExpression({
          path,
          startLine: startToken.line,
          startChar: startToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: startToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
        (p as Parser).injects.push(expr);
        return expr;
      }
    })
    .add({
      match: (p) => Selectors.Line(p.token),
      selectorId: Selectors.Line.selectorId,
      parse: (p) => {
        p.next();
        return (p as Parser).astProvider.featureLineExpression({
          startLine: p.previousToken.line,
          startChar: p.previousToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: p.previousToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
      }
    })
    .add({
      match: (p) => Selectors.File(p.token),
      selectorId: Selectors.File.selectorId,
      parse: (p) => {
        p.next();
        return (p as Parser).astProvider.featureFileExpression({
          filename: (p as Parser).filename,
          startLine: p.previousToken.line,
          startChar: p.previousToken.startChar,
          endLine: p.previousToken.endLine,
          endChar: p.previousToken.endChar,
          rangeStart: p.previousToken.rangeStart,
          rangeEnd: p.previousToken.rangeEnd,
          scope: p.currentScope
        });
      }
    });
}

function parsePathSegment(me: ParserBase): string {
  if (me.token.type === TokenType.StringLiteral) {
    const path = me.token.value;
    me.next();
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

function handleInclude(me: Parser): void {
  const pendingBlock = me.backpatches.peek();
  me.next();
  const startToken = me.previousToken;

  const path = parsePathSegment(me);
  const item = (me.astProvider as ASTProvider).featureIncludeExpression({
    path,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: me.previousToken.endLine,
    endChar: me.previousToken.endChar,
    rangeStart: startToken.rangeStart,
    rangeEnd: me.previousToken.rangeEnd,
    scope: me.currentScope
  });

  me.includes.push(item);
  me.lineRegistry.register(item);
  me.attachPendingComments(item);
  pendingBlock.body.push(item);
}

function handleImport(me: Parser): void {
  const pendingBlock = me.backpatches.peek();
  me.next();
  const startToken = me.previousToken;

  const name = me.parseIdentifier(ASTIdentifierKind.Variable);

  if (!me.consume(Selectors.From)) {
    me.raise(
      `expected from keyword`,
      new ASTRange(
        [startToken.line, startToken.startChar],
        [me.token.lastLine ?? me.token.line, me.token.endChar]
      )
    );
    const invalid = me.parseInvalidCode();
    me.lineRegistry.register(invalid);
    me.attachPendingComments(invalid);
    pendingBlock.body.push(invalid);
    return;
  }

  const path = parsePathSegment(me);
  const item = (me.astProvider as ASTProvider).featureImportExpression({
    name,
    path,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: me.previousToken.endLine,
    endChar: me.previousToken.endChar,
    rangeStart: startToken.rangeStart,
    rangeEnd: me.previousToken.rangeEnd,
    scope: me.currentScope
  });

  me.imports.push(item);
  me.currentScope.definitions.push(item);
  me.lineRegistry.register(item);
  me.attachPendingComments(item);
  pendingBlock.body.push(item);
}

function handleEnvar(me: Parser): void {
  const pendingBlock = me.backpatches.peek();
  me.next();
  const startToken = me.previousToken;

  const name = me.token.value;
  me.next();

  const item = (me.astProvider as ASTProvider).featureEnvarExpression({
    name,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: me.previousToken.endLine,
    endChar: me.previousToken.endChar,
    rangeStart: startToken.rangeStart,
    rangeEnd: me.previousToken.rangeEnd,
    scope: me.currentScope
  });

  me.lineRegistry.register(item);
  me.attachPendingComments(item);
  pendingBlock.body.push(item);
}

function handleInject(me: Parser): void {
  const pendingBlock = me.backpatches.peek();
  me.next();
  const startToken = me.previousToken;

  const path = parsePathSegment(me);
  me.next();

  const item = (me.astProvider as ASTProvider).featureInjectExpression({
    path,
    startLine: startToken.line,
    startChar: startToken.startChar,
    endLine: me.previousToken.endLine,
    endChar: me.previousToken.endChar,
    rangeStart: startToken.rangeStart,
    rangeEnd: me.previousToken.rangeEnd,
    scope: me.currentScope
  });

  me.injects.push(item);
  me.lineRegistry.register(item);
  me.attachPendingComments(item);
  pendingBlock.body.push(item);
}

function handleDebugger(me: Parser): void {
  const pendingBlock = me.backpatches.peek();
  me.next();
  const item = (me.astProvider as ASTProvider).featureDebuggerExpression({
    startLine: me.previousToken.line,
    startChar: me.previousToken.startChar,
    endLine: me.previousToken.endLine,
    endChar: me.previousToken.endChar,
    rangeStart: me.previousToken.rangeStart,
    rangeEnd: me.previousToken.rangeEnd,
    scope: me.currentScope
  });
  me.lineRegistry.register(item);
  me.attachPendingComments(item);
  pendingBlock.body.push(item);
}

function handleIfEnv(me: Parser): void {
  const startToken = me.token;
  me.next();

  const key = me.token.value;
  me.next();

  const envValue = me.environmentVariables.get(key);
  const isTruthy = envValue !== undefined && envValue !== '' && envValue !== '0' && envValue !== 'false';

  const pendingBlock = new PendingEnvCondition(isTruthy, startToken);
  me.backpatches.push(pendingBlock);
}

function handleElseEnv(me: Parser): void {
  me.next();

  const pendingBlock = me.backpatches.peek();

  if (!isPendingEnvCondition(pendingBlock)) {
    me.raise(
      `'#else' without matching '#if'`,
      new ASTRange(
        [me.previousToken.line, me.previousToken.startChar],
        [me.previousToken.endLine, me.previousToken.endChar]
      )
    );
    return;
  }

  pendingBlock.next();
}

function handleEndIfEnv(me: Parser): void {
  me.next();

  const pendingBlock = me.backpatches.peek();

  if (!isPendingEnvCondition(pendingBlock)) {
    me.raise(
      `'#endif' without matching '#if'`,
      new ASTRange(
        [me.previousToken.line, me.previousToken.startChar],
        [me.previousToken.endLine, me.previousToken.endChar]
      )
    );
    return;
  }

  pendingBlock.complete(me.previousToken);
  me.backpatches.pop();

  const parent = me.backpatches.peek();
  const resolved = pendingBlock.resolve();
  for (const item of resolved) {
    parent.body.push(item);
  }
}

export function greybelKeywordHandlerBuilder(): KeywordHandlerBuilder {
  return defaultKeywordHandlerBuilder()
    .add(Selectors.Include.selectorId, handleInclude)
    .add(Selectors.IncludeWithComment.selectorId, handleInclude)
    .add(Selectors.Import.selectorId, handleImport)
    .add(Selectors.ImportWithComment.selectorId, handleImport)
    .add(Selectors.Envar.selectorId, handleEnvar)
    .add(Selectors.Inject.selectorId, handleInject)
    .add(Selectors.Debugger.selectorId, handleDebugger)
    .add(Selectors.IfEnv.selectorId, handleIfEnv)
    .add(Selectors.ElseEnv.selectorId, handleElseEnv)
    .add(Selectors.EndIfEnv.selectorId, handleEndIfEnv);
}

export const greybelInfixOps = buildInfixOpIndex(
  groupInfixOps(greybelInfixOpBuilder().build())
);
export const greybelAtomOps = buildAtomOpIndex(greybelAtomOpBuilder().build());
export const greybelKeywordOps: KeywordOp[] = buildKeywordOpIndex(
  greybelKeywordHandlerBuilder().build()
);
