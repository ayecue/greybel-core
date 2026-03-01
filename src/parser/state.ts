import { ParserState } from 'miniscript-core/dist/parser/state';

import {
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTFeatureInjectExpression
} from './ast/feature';

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
