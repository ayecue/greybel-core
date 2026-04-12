import LexerBase, {
  LexerOptions as LexerOptionsBase
} from 'miniscript-core/dist/lexer';
import { BaseToken, Token, TokenType } from 'miniscript-core/dist/lexer/token';
import UnsafeLexerMixin from 'miniscript-core/dist/mixins/unsafe-lexer-mixin';
import { CharacterCode as CharacterCodeBase } from 'miniscript-core/dist/types/codes';
import { Range as ASTRange } from 'miniscript-core/dist/types/range';

import Validator from './lexer/validator';
import { CharacterCode } from './types/codes';
import { GreybelKeyword } from './types/keywords';
import { Operator } from './types/operators';

export interface LexerOptions extends LexerOptionsBase {
  validator?: Validator;
}

export default class Lexer extends LexerBase {
  validator: Validator;

  constructor(content: string, options: LexerOptions = {}) {
    options.validator = options.validator || new Validator();
    super(content, options);
  }

  scan(code: number, afterSpace: boolean): BaseToken<any> | null {
    switch (code) {
      case CharacterCodeBase.ARROW_LEFT:
        if (CharacterCodeBase.ARROW_LEFT === this.codeAt(1)) {
          return this.scanPunctuator(Operator.LeftShift, afterSpace);
        }
        break;
      case CharacterCodeBase.ARROW_RIGHT:
        if (CharacterCodeBase.ARROW_RIGHT === this.codeAt(1)) {
          if (CharacterCodeBase.ARROW_RIGHT === this.codeAt(2)) {
            return this.scanPunctuator(Operator.UnsignedRightShift, afterSpace);
          }
          return this.scanPunctuator(Operator.RightShift, afterSpace);
        }
        break;
      case CharacterCode.AMPERSAND:
      case CharacterCode.VERTICAL_LINE: {
        const value = this.content[this.index];
        this.index += value.length;
        return this.createPunctuator(value, afterSpace);
      }
    }

    return super.scan(code, afterSpace);
  }

  scanMultilineComment(afterSpace: boolean) {
    const me = this;
    const beginLine = me.line;
    const commentStart = me.index;
    const commentStartOffset = me.offset;
    let endOffset = me.offset;
    let closed = false;

    while (me.index < me.length) {
      const code = me.codeAt();

      if (me.validator.isEndOfLine(code)) {
        if (me.validator.isWinNewline(code, me.codeAt(1))) {
          me.index++;
        }
        me.line++;
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
          [beginLine, commentStart - commentStartOffset + 1],
          [me.line, me.index - endOffset + 3]
        )
      );
    }

    const content = me.content.slice(commentStart + 2, me.index);

    me.index += 2;

    const token = new Token({
      type: TokenType.Comment,
      value: content,
      line: beginLine,
      rangeStart: me.tokenStart,
      rangeEnd: me.index,
      offsetStart: commentStartOffset,
      offsetEnd: endOffset,
      afterSpace,
      lastLine: me.line
    });

    me.offset = endOffset;

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

export const UnsafeLexer = UnsafeLexerMixin(Lexer);
export type UnsafeLexer = InstanceType<typeof UnsafeLexer>;
