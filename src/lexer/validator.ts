import { CharacterCode, LexerValidator } from 'greyscript-core';

import { GreybelKeyword } from '../types/keywords';

export default class Validator extends LexerValidator {
  getKeywords(index: number): string[] {
    const baseKeywords = super.getKeywords(index);

    switch (index) {
      case 4:
        return [...baseKeywords, GreybelKeyword.From];
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
}
