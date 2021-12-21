import { CharacterCode, LexerValidator } from 'greyscript-core';

export default class Validator extends LexerValidator {
	getKeywords(index: number): string[] {
		const baseKeywords = super.getKeywords(index);

		switch (index) {
			case 6:
				return [...baseKeywords, '#envar'];
			case 7:
				return [...baseKeywords, '#import'];
			case 8:
				return [...baseKeywords, '#include', 'debugger'];
			default:
				return baseKeywords;
		}
	}

	isIdentifierStart (code: number): boolean {
		return super.isIdentifierStart(code) || code === CharacterCode.HASH;
	}
}