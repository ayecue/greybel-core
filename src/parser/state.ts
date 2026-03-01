import { ParserState, ParserStateSnapshot } from 'miniscript-core/dist/parser/state';

import {
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTFeatureInjectExpression
} from './ast/feature';

export interface GreybelParserStateSnapshot extends ParserStateSnapshot {
  importsLength: number;
  includesLength: number;
  injectsLength: number;
}

export class GreybelParserState extends ParserState {
  imports: ASTFeatureImportExpression[];
  includes: ASTFeatureIncludeExpression[];
  injects: ASTFeatureInjectExpression[];

  constructor() {
    super();
    this.imports = [];
    this.includes = [];
    this.injects = [];
  }

  merge(other: ParserState): void {
    super.merge(other);
    const o = other as GreybelParserState;
    this.imports.push(...o.imports);
    this.includes.push(...o.includes);
    this.injects.push(...o.injects);
  }

  snapshot(): GreybelParserStateSnapshot {
    return {
      ...super.snapshot(),
      importsLength: this.imports.length,
      includesLength: this.includes.length,
      injectsLength: this.injects.length
    };
  }

  restore(snapshot: ParserStateSnapshot): void {
    super.restore(snapshot);
    const s = snapshot as GreybelParserStateSnapshot;
    this.imports.length = s.importsLength;
    this.includes.length = s.includesLength;
    this.injects.length = s.injectsLength;
  }

  createEmpty(): GreybelParserState {
    return new GreybelParserState();
  }

  clone(): GreybelParserState {
    const c = super.clone() as GreybelParserState;
    c.imports = [...this.imports];
    c.includes = [...this.includes];
    c.injects = [...this.injects];
    return c;
  }
}
