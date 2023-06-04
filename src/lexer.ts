import {
  Lexer as LexerBase,
  LexerOptions as LexerOptionsBase,
  Token,
  TokenType
} from 'greyscript-core';

import Validator from './lexer/validator';

export interface LexerOptions extends LexerOptionsBase {
  validator?: Validator;
}

export default class Lexer extends LexerBase {
  validator: Validator;

  constructor(content: string, options: LexerOptions = {}) {
    options.validator = options.validator || new Validator();
    super(content, options);
  }

  scanMultilineComment(afterSpace: boolean) {
    const me = this;
    const beginLine = me.line;
    const beginLineStart = me.lineStart;
    const commentStart = me.index + 2;
    let tempOffset = 0;
    let endOffset = me.offset;

    while (true) {
      const code = me.codeAt();

      if (me.validator.isEndOfLine(code)) {
        if (me.isWinNewline()) me.nextIndex();
        me.nextLine();
        tempOffset = me.index + 1 - me.offset;
        endOffset = me.index + 1;
      } else if (me.validator.isMultilineCommentEnd(me.codeAt(), me.codeAt(1))) {
        break;
      } else if (!me.isNotEOF()) {
        const line = beginLine;
        return me.raise(`Unexpected multiline comment ending at line ${line}.`, line);
      }

      me.nextIndex();
    }

    me.nextIndex(2);

    const content = me.content.slice(commentStart, me.index - 2);

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

    return token;
  }

  scanComment(afterSpace: boolean): Token {
    const me = this;
    const validator = me.validator;

    if (validator.isMultilineComment(me.codeAt(), me.codeAt(1))) {
      return me.scanMultilineComment(afterSpace);
    }

    return super.scanComment(afterSpace);
  }
}
