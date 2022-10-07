import { ASTBase, ASTBaseOptions, ASTChunk } from 'greyscript-core';

import { ASTType } from './base';

export interface ASTFeatureImportExpressionOptions extends ASTBaseOptions {
  name: ASTBase;
  path: string;
  chunk?: ASTChunk;
  namespace?: string;
}

export class ASTFeatureImportExpression extends ASTBase {
  name: ASTBase;
  path: string;
  chunk?: ASTChunk;
  namespace?: string;

  constructor(options: ASTFeatureImportExpressionOptions) {
    super(ASTType.FeatureImportExpression, options);
    this.name = options.name;
    this.path = options.path;
    this.chunk = options.chunk;
    this.namespace = options.namespace;
  }

  toString(): string {
    return `FeatureImportExpression[name = ${this.name}, path = ${this.path}]`
  }
}

export interface ASTFeatureIncludeExpressionOptions extends ASTBaseOptions {
  path: string;
  chunk?: ASTChunk;
  namespace?: string;
}

export class ASTFeatureIncludeExpression extends ASTBase {
  path: string;
  chunk?: ASTChunk;
  namespace?: string;

  constructor(options: ASTFeatureIncludeExpressionOptions) {
    super(ASTType.FeatureIncludeExpression, options);
    this.path = options.path;
    this.chunk = options.chunk;
    this.namespace = options.namespace;
  }

  toString(): string {
    return `FeatureIncludeExpression[path = ${this.path}]`
  }
}

export interface ASTFeatureEnvarExpressionOptions extends ASTBaseOptions {
  name: string;
}

export class ASTFeatureEnvarExpression extends ASTBase {
  name: string;

  constructor(options: ASTFeatureEnvarExpressionOptions) {
    super(ASTType.FeatureEnvarExpression, options);
    this.name = options.name;
  }

  toString(): string {
    return `FeatureEnvarExpression[path = ${this.name}]`
  }
}
