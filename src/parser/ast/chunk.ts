import { ASTChunk, ASTChunkOptions } from 'miniscript-core';

import {
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTFeatureInjectExpression
} from './feature';

export interface ASTChunkGreybelOptions extends ASTChunkOptions {
  imports?: ASTFeatureImportExpression[];
  includes?: ASTFeatureIncludeExpression[];
  injects?: ASTFeatureInjectExpression[];
}

export class ASTChunkGreybel extends ASTChunk {
  imports: ASTFeatureImportExpression[];
  includes: ASTFeatureIncludeExpression[];
  injects: ASTFeatureInjectExpression[];

  constructor(options: ASTChunkGreybelOptions) {
    super(options);
    this.imports = options.imports || [];
    this.includes = options.includes || [];
    this.injects = options.injects || [];
  }

  clone(): ASTChunkGreybel {
    return new ASTChunkGreybel({
      literals: this.literals.map((it) => it.clone()),
      scopes: this.scopes.map((it) => it.clone()),
      imports: this.imports.map((it) => it.clone()),
      includes: this.includes.map((it) => it.clone()),
      injects: this.injects.map((it) => it.clone()),
      lines: this.lines,
      start: this.start,
      end: this.end,
      range: this.range,
      scope: this.scope
    });
  }
}
