import { ASTChunk, ASTChunkOptions } from 'miniscript-core/dist/parser/ast';

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
      registry: this._reg,
      startLine: this.startLine,
      startChar: this.startChar,
      endLine: this.endLine,
      endChar: this.endChar,
      rangeStart: this.rangeStart,
      rangeEnd: this.rangeEnd,
      scope: this.scope
    });
  }
}
