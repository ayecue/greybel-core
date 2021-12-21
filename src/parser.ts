import {
	Parser as ParserBase,
	ParserOptions as ParserOptionsBase,
	ASTLiteral,
	TokenType,
	UnexpectedEOF,
	ASTBase
} from 'greyscript-core';
import Lexer from './lexer';
import {
	ASTType,
	ASTFeatureImportExpression,
	ASTFeatureIncludeExpression,
	ASTFeatureEnvarExpression,
	ASTChunkAdvanced,
	ASTProvider
} from './parser/ast';

export interface ParserOptions extends ParserOptionsBase {
	astProvider?: ASTProvider;
	environmentVariables?: Map<string, string>;
	lexer?: Lexer;
}

export default class Parser extends ParserBase {
	imports: ASTFeatureImportExpression[];
	includes: ASTFeatureIncludeExpression[];
	astProvider: ASTProvider;
	environmentVariables: Map<string, string>;

	constructor(content: string, options: ParserOptions = {}) {
		options.lexer = options.lexer || new Lexer(content);
		options.astProvider = options.astProvider || new ASTProvider();
		super(content, options);

		const me = this;

		me.imports = [];
		me.includes = [];
		me.environmentVariables = options.environmentVariables || new Map();
	}

	parseFeaturePath(): string {
		const me = this;
		let path = '';

		while (true) {
			path = path + me.token.value;
			me.next();
			if (';' === me.token.value) break;
		}

		return path;
	}

	parseFeatureIncludeStatement(): ASTFeatureIncludeExpression {
		const me = this;
		const mainStatementLine = me.token.line;
		const path = me.parseFeaturePath();

		me.expect(';');

		const base = me.astProvider.featureIncludeExpression(path, mainStatementLine);

		me.includes.push(base);

		return base;
	}

	parseFeatureImportStatement(): ASTFeatureImportExpression {
		const me = this;
		const mainStatementLine = me.token.line;
		const name = me.parseIdentifier();

		me.expect('from');

		const path = me.parseFeaturePath();

		me.expect(';');

		const base = me.astProvider.featureImportExpression(name, path, mainStatementLine);
		me.imports.push(base);
		return base;
	}

	parseFeatureEnvarNameStatement(): ASTLiteral {
		const me = this;
		const mainStatementLine = me.token.line;
		const name = me.token.value;
		const value = me.environmentVariables.get(name);
		let raw;
		let type = TokenType.StringLiteral;

		if (value == null) {
			type = TokenType.NilLiteral;
			raw = 'null';
		} else {
			raw = '"' + value + '"';
		}

		const literal = me.astProvider.literal(type, value, raw, mainStatementLine);

		me.literals.push(literal);
		me.next();

		return literal;
	}

	parseFeatureEnvarStatement(): ASTBase {
		const me = this;
		const mainStatementLine = me.token.line;
		const name = me.parseFeatureEnvarNameStatement();

		me.expect(';');

		let base: ASTBase = me.astProvider.featureEnvarExpression(name, mainStatementLine);

		if ('.' === me.token.value) {
			while (true) {
				const newBase = me.parseRighthandExpressionPart(base);
				if (newBase === null) break;
				base = newBase;
			}
		}
		
		return base;
	}

	parsePrimaryExpression(): ASTBase | null {
		const me = this;
		const value = me.token.value;
		const type = me.token.type;

		if (TokenType.Keyword === type && '#envar' === value) {
			me.next();
			return me.parseFeatureEnvarStatement();
		}

		return super.parsePrimaryExpression();
	}

	parseStatement(isShortcutStatement: boolean = false): ASTBase | null {
		const me = this;

		if (TokenType.Keyword === me.token.type) {
			const value = me.token.value;

			switch (value) {
				case '#include':
					me.next();
					return me.parseFeatureIncludeStatement();
				case '#import':
					me.next();
					return me.parseFeatureImportStatement();
				case '#envar':
					me.next();
					return me.parseFeatureEnvarStatement();
				case 'debugger':
					me.next();
					return me.astProvider.featureDebuggerExpression(me.token.line);
				default:
					break;
			}
		}

		return super.parseStatement(isShortcutStatement);
	}

	parseChunk(): ASTChunkAdvanced {
		const me = this;

		me.next();

		const mainStatementLine = me.token.line;
		const body = me.parseBlock();

		if (TokenType.EOF !== me.token.type) {
			throw new UnexpectedEOF(me.token);
		}

		return me.astProvider.chunkAdvanced(
			body,
			me.nativeImports,
			me.namespaces,
			me.literals,
			me.imports,
			me.includes,
			mainStatementLine
		);
	};
}