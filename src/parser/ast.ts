import {
  ASTBase,
  ASTBaseOptions,
  ASTProvider as ASTProviderBase
} from 'miniscript-core';

import { ASTType } from './ast/base';
import { ASTChunkGreybel, ASTChunkGreybelOptions } from './ast/chunk';
import {
  ASTFeatureEnvarExpression,
  ASTFeatureEnvarExpressionOptions,
  ASTFeatureFileExpression,
  ASTFeatureFileExpressionOptions,
  ASTFeatureImportExpression,
  ASTFeatureImportExpressionOptions,
  ASTFeatureIncludeExpression,
  ASTFeatureIncludeExpressionOptions,
  ASTFeatureInjectExpression,
  ASTFeatureInjectExpressionOptions
} from './ast/feature';

export class ASTProvider extends ASTProviderBase {
  featureImportExpression(
    options: ASTFeatureImportExpressionOptions
  ): ASTFeatureImportExpression {
    return new ASTFeatureImportExpression(options);
  }

  featureIncludeExpression(
    options: ASTFeatureIncludeExpressionOptions
  ): ASTFeatureIncludeExpression {
    return new ASTFeatureIncludeExpression(options);
  }

  featureEnvarExpression(
    options: ASTFeatureEnvarExpressionOptions
  ): ASTFeatureEnvarExpression {
    return new ASTFeatureEnvarExpression(options);
  }

  featureInjectExpression(
    options: ASTFeatureInjectExpressionOptions
  ): ASTFeatureInjectExpression {
    return new ASTFeatureInjectExpression(options);
  }

  featureDebuggerExpression(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.FeatureDebuggerExpression, options);
  }

  featureLineExpression(options: ASTBaseOptions): ASTBase {
    return new ASTBase(ASTType.FeatureLineExpression, options);
  }

  featureFileExpression(
    options: ASTFeatureFileExpressionOptions
  ): ASTFeatureFileExpression {
    return new ASTFeatureFileExpression(options);
  }

  chunk(options: ASTChunkGreybelOptions): ASTChunkGreybel {
    return new ASTChunkGreybel(options);
  }
}

export { ASTType } from './ast/base';
export { ASTChunkGreybel, ASTChunkGreybelOptions } from './ast/chunk';
export {
  ASTFeatureEnvarExpression,
  ASTFeatureEnvarExpressionOptions,
  ASTFeatureFileExpression,
  ASTFeatureFileExpressionOptions,
  ASTFeatureImportExpression,
  ASTFeatureImportExpressionOptions,
  ASTFeatureIncludeExpression,
  ASTFeatureIncludeExpressionOptions,
  ASTFeatureInjectExpression,
  ASTFeatureInjectExpressionOptions
} from './ast/feature';
