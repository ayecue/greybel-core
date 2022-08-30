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
    return this.addLine(new ASTFeatureImportExpression(options)) as ASTFeatureImportExpression;
  }

  featureIncludeExpression(options: ASTFeatureIncludeExpressionOptions): ASTFeatureIncludeExpression {
    return this.addLine(new ASTFeatureIncludeExpression(options)) as ASTFeatureIncludeExpression;
  }

  featureEnvarExpression(options: ASTFeatureEnvarExpressionOptions): ASTFeatureEnvarExpression {
    return this.addLine(new ASTFeatureEnvarExpression(options)) as ASTFeatureEnvarExpression;
  }

  featureDebuggerExpression(options: ASTBaseOptions): ASTBase {
    return this.addLine(new ASTBase(ASTType.FeatureDebuggerExpression, options));
  }

  chunkAdvanced(options: ASTChunkAdvancedOptions): ASTChunkAdvanced {
    return this.addLine(new ASTChunkAdvanced(options)) as ASTChunkAdvanced;
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