import { CharacterCode, LexerValidator } from 'greyscript-core';

import { GreybelKeyword } from '../types/keywords';

export default class Validator extends LexerValidator {
  getKeywords(index: number): string[] {
    const baseKeywords = super.getKeywords(index);

    switch (index) {
      case 6:
        return [...baseKeywords, GreybelKeyword.Envar];
      case 7:
        return [...baseKeywords, GreybelKeyword.Import];
      case 8:
        return [
          ...baseKeywords,
          GreybelKeyword.Include,
          GreybelKeyword.Debugger
        ];
      default:
        return baseKeywords;
    }
  }

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
