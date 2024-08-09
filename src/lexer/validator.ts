import { CharacterCode, Keyword, LexerValidator } from 'miniscript-core';

import { GreybelKeyword } from '../types/keywords';

export default class Validator extends LexerValidator {
  isKeyword = Set.prototype.has.bind(new Set([
    ...Object.values(Keyword),
    ...Object.values(GreybelKeyword)
  ]));

  isIdentifierStart(code: number): boolean {
    return super.isIdentifierStart(code) || code === CharacterCode.HASH;
  }

  isMultilineComment(code: CharacterCode, nextCode: CharacterCode): boolean {
    return CharacterCode.SLASH === code && CharacterCode.ASTERISK === nextCode;
  }

  isMultilineCommentEnd(code: CharacterCode, nextCode: CharacterCode): boolean {
    return CharacterCode.ASTERISK === code && CharacterCode.SLASH === nextCode;
  }

  isComment(code: CharacterCode, nextCode: CharacterCode): boolean {
    return (
      super.isComment(code, nextCode) || this.isMultilineComment(code, nextCode)
    );
  }
}
