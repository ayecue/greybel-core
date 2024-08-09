import {
  ASTPosition,
  ASTRange,
  BaseToken,
  CharacterCode as CharacterCodeBase,
  Lexer as LexerBase,
  LexerOptions as LexerOptionsBase,
  Token,
  TokenType
} from 'miniscript-core';

import Validator from './lexer/validator';
import { CharacterCode } from './types/codes';
import { GreybelKeyword } from './types/keywords';
import { Operator } from './types/operators';

export interface LexerOptions extends LexerOptionsBase {
  validator?: Validator;
}

function defaultScanHandler(this: Lexer, afterSpace: boolean) {
  const value = this.content[this.index];
  this.index += value.length;
  return this.createPunctuator(value, afterSpace);
}

export default class Lexer extends LexerBase {
  validator: Validator;

  constructor(content: string, options: LexerOptions = {}) {
    options.validator = options.validator || new Validator();
    super(content, options);
  }

  private static greybelScanHandlers: Record<string, (this: Lexer, afterSpace: boolean) => BaseToken<any> | null> = {
    [CharacterCodeBase.ARROW_LEFT]: function arrowLeftHandler(this, afterSpace) {
      if (CharacterCodeBase.ARROW_LEFT === this.codeAt(1))
        return this.scanPunctuator(Operator.LeftShift, afterSpace);
    },
    [CharacterCodeBase.ARROW_RIGHT]: function arrowRightHandler(this, afterSpace) {
      if (CharacterCodeBase.ARROW_RIGHT === this.codeAt(1)) {
        if (CharacterCodeBase.ARROW_RIGHT === this.codeAt(2))
          return this.scanPunctuator(Operator.UnsignedRightShift, afterSpace);
        return this.scanPunctuator(Operator.RightShift, afterSpace);
      }
    },
    [CharacterCode.AMPERSAND]: defaultScanHandler,
    [CharacterCode.VERTICAL_LINE]: defaultScanHandler,
  };

  scan(
    code: number,
    afterSpace: boolean
  ): BaseToken<any> | null {
    const me = this;

    const handler = Lexer.greybelScanHandlers[code];

    if (handler) return handler.call(this, afterSpace) || super.scan(code, afterSpace);

    return super.scan(code, afterSpace);
  }

  scanMultilineComment(afterSpace: boolean) {
    const me = this;
    const beginLine = me.line;
    const beginLineStart = me.lineStart;
    const commentStart = me.index + 2;
    let tempOffset = 0;
    let endOffset = me.offset;
    let closed = false;

    while (me.index < me.length) {
      const code = me.codeAt();

      if (me.validator.isEndOfLine(code)) {
        if (me.validator.isWinNewline(code, me.codeAt(1))) me.index++;
        me.line++;
        tempOffset = me.index + 1 - me.offset;
        endOffset = me.index + 1;
      } else if (
        me.validator.isMultilineCommentEnd(me.codeAt(), me.codeAt(1))
      ) {
        closed = true;
        break;
      }

      me.index++;
    }

    if (!closed) {
      return me.raise(
        `Unexpected end of file in multiline comment.`,
        new ASTRange(
          new ASTPosition(beginLine, beginLineStart - endOffset + 1),
          new ASTPosition(me.line, me.index - endOffset + 1)
        )
      );
    }

    const content = me.content.slice(commentStart, me.index);

    me.index += 2;

    const token = new Token({
      type: TokenType.Comment,
      value: content,
      line: beginLine,
      lineStart: beginLineStart,
      range: [me.tokenStart, me.index - tempOffset],
      offset: me.offset,
      afterSpace,
      lastLine: me.line,
      lastLineStart: me.lineStart
    });

    me.offset = endOffset;
    me.snapshot.enqueue(token);

    return token;
  }

  scanComment(afterSpace: boolean): Token {
    const me = this;
    const validator = me.validator;

    if (
      me.content.startsWith(GreybelKeyword.ImportWithComment, me.index) ||
      me.content.startsWith(GreybelKeyword.IncludeWithComment, me.index)
    ) {
      me.index++;
      return me.scanIdentifierOrKeyword(afterSpace);
    }

    if (validator.isMultilineComment(me.codeAt(), me.codeAt(1))) {
      return me.scanMultilineComment(afterSpace);
    }

    return super.scanComment(afterSpace);
  }
}
