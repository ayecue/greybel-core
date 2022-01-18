import { 
	ASTBase,
	ASTPosition,
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
	chunk?: ASTChunk;
	namespace?: string;
}

export interface ASTFeatureIncludeExpression extends ASTBase {
	type: ASTType.FeatureIncludeExpression;
	path: string;
	chunk?: ASTChunk;
	namespace?: string;
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
	featureImportExpression(name: ASTBase, path: string, start: ASTPosition, end: ASTPosition): ASTFeatureImportExpression {
		return {
			type: ASTType.FeatureImportExpression,
			name,
			path,
			start,
			end
		};
	}

	featureIncludeExpression(path: string, start: ASTPosition, end: ASTPosition): ASTFeatureIncludeExpression {
		return {
			type: ASTType.FeatureIncludeExpression,
			path,
			start,
			end
		};
	}

	featureEnvarExpression(value: ASTBase, start: ASTPosition, end: ASTPosition): ASTFeatureEnvarExpression {
		return {
			type: ASTType.FeatureEnvarExpression,
			value,
			start,
			end
		};
	}

	featureDebuggerExpression(start: ASTPosition, end: ASTPosition): ASTBase {
		return {
			type: ASTType.FeatureDebuggerExpression,
			start,
			end
		};
	}

	chunkAdvanced(
		body: ASTBase[],
		nativeImports: string[],
		namespaces: Set<string>,
		literals: ASTBase[],
		imports: ASTFeatureImportExpression[],
		includes: ASTFeatureIncludeExpression[],
		start: ASTPosition,
		end: ASTPosition
	): ASTChunkAdvanced {
		return {
			...this.chunk(
				body,
				nativeImports,
				namespaces,
				literals,
				start,
				end
			),
			imports,
			includes
		};
	}
}