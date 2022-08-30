import {
  ASTFeatureEnvarExpression,
  ASTFeatureEnvarExpressionOptions,
  ASTFeatureImportExpression,
  ASTFeatureImportExpressionOptions,
  ASTFeatureIncludeExpression,
  ASTFeatureIncludeExpressionOptions
} from './ast/feature';
import {
  ASTChunkAdvanced,
  ASTChunkAdvancedOptions
} from './ast/chunk';
import {
  ASTType
} from './ast/base';
import { ASTBase, ASTBaseOptions, ASTProvider as ASTProviderBase } from 'greyscript-core';

export class ASTProvider extends ASTProviderBase {
  featureImportExpression(options: ASTFeatureImportExpressionOptions): ASTFeatureImportExpression {
    return new ASTFeatureImportExpression(options);
  }

  featureIncludeExpression(options: ASTFeatureIncludeExpressionOptions): ASTFeatureIncludeExpression {
    return new ASTFeatureIncludeExpression(options);
  }

  featureEnvarExpression(options: ASTFeatureEnvarExpressionOptions): ASTFeatureEnvarExpression {
    return new ASTFeatureEnvarExpression(options);
  }

  featureDebuggerExpression(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.FeatureDebuggerExpression, options);
  }

  chunkAdvanced(options: ASTChunkAdvancedOptions): ASTChunkAdvanced {
    return new ASTChunkAdvanced(options);
  }
}

export {
  ASTFeatureEnvarExpression,
  ASTFeatureEnvarExpressionOptions,
  ASTFeatureImportExpression,
  ASTFeatureImportExpressionOptions,
  ASTFeatureIncludeExpression,
  ASTFeatureIncludeExpressionOptions
} from './ast/feature';
export {
  ASTChunkAdvanced,
  ASTChunkAdvancedOptions
} from './ast/chunk';
export {
  ASTType
} from './ast/base';