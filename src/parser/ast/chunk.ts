import { ASTChunk, ASTChunkOptions } from 'greyscript-core';

import {
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression
} from './feature';

export interface ASTChunkAdvancedOptions extends ASTChunkOptions {
  imports?: ASTFeatureImportExpression[];
  includes?: ASTFeatureIncludeExpression[];
}

export class ASTChunkAdvanced extends ASTChunk {
  imports: ASTFeatureImportExpression[];
  includes: ASTFeatureIncludeExpression[];

  constructor(options: ASTChunkAdvancedOptions) {
    super(options);
    this.imports = options.imports || [];
    this.includes = options.includes || [];
  }
}
