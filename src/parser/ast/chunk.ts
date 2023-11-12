import { ASTChunk, ASTChunkOptions } from 'miniscript-core';

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

  clone(): ASTChunkAdvanced {
    return new ASTChunkAdvanced({
      literals: this.literals.map((it) => it.clone()),
      scopes: this.scopes.map((it) => it.clone()),
      imports: this.imports.map((it) => it.clone()),
      includes: this.includes.map((it) => it.clone()),
      lines: this.lines,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
