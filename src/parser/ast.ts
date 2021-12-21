import { 
	ASTBase,
	ASTChunk,
	ASTProvider as ASTProviderBase
} from 'greyscript-core';

export enum ASTType {
	FeatureImportExpression = 'FeatureImportExpression',
	FeatureIncludeExpression = 'FeatureIncludeExpression',
	FeatureEnvarExpression = 'FeatureEnvarExpression',
	FeatureDebuggerExpression = 'FeatureDebuggerExpression'
}

export interface ASTFeatureImportExpression extends ASTBase {
	type: ASTType.FeatureImportExpression;
	name: ASTBase;
	path: string;
}

export interface ASTFeatureIncludeExpression extends ASTBase {
	type: ASTType.FeatureIncludeExpression;
	path: string;
}

export interface ASTFeatureEnvarExpression extends ASTBase {
	type: ASTType.FeatureEnvarExpression;
	value: ASTBase;
}

export interface ASTChunkAdvanced extends ASTChunk {
	imports: ASTFeatureImportExpression[];
	includes: ASTFeatureIncludeExpression[];
}

export class ASTProvider extends ASTProviderBase {
	featureImportExpression(name: ASTBase, path: string, line: number): ASTFeatureImportExpression {
		return {
			type: ASTType.FeatureImportExpression,
			name,
			path,
			line
		};
	}

	featureIncludeExpression(path: string, line: number): ASTFeatureIncludeExpression {
		return {
			type: ASTType.FeatureIncludeExpression,
			path,
			line
		};
	}

	featureEnvarExpression(value: ASTBase, line: number): ASTFeatureEnvarExpression {
		return {
			type: ASTType.FeatureEnvarExpression,
			value,
			line
		};
	}

	featureDebuggerExpression(line: number): ASTBase {
		return {
			type: ASTType.FeatureDebuggerExpression,
			line
		};
	}

	chunkAdvanced(
		body: ASTBase[],
		nativeImports: string[],
		namespaces: Set<string>,
		literals: ASTBase[],
		imports: ASTFeatureImportExpression[],
		includes: ASTFeatureIncludeExpression[],
		line: number
	): ASTChunkAdvanced {
		return {
			...this.chunk(
				body,
				nativeImports,
				namespaces,
				literals,
				line
			),
			imports,
			includes
		};
	}
}