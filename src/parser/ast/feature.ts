import { ASTBase, ASTBaseOptions, ASTChunk } from 'miniscript-core';

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
    return `FeatureImportExpression[${this.start}-${this.end}][name = ${this.name}, path = ${this.path}]`;
  }

  clone(): ASTFeatureImportExpression {
    return new ASTFeatureImportExpression({
      name: this.name.clone(),
      path: this.path,
      chunk: this.chunk.clone(),
      namespace: this.namespace,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
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
    return `FeatureIncludeExpression[${this.start}-${this.end}][path = ${this.path}]`;
  }

  clone(): ASTFeatureIncludeExpression {
    return new ASTFeatureIncludeExpression({
      path: this.path,
      chunk: this.chunk.clone(),
      namespace: this.namespace,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
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
    return `FeatureEnvarExpression[${this.start}-${this.end}][name = ${this.name}]`;
  }

  clone(): ASTFeatureEnvarExpression {
    return new ASTFeatureEnvarExpression({
      name: this.name,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}

export interface ASTFeatureInjectExpressionOptions extends ASTBaseOptions {
  path: string;
}

export class ASTFeatureInjectExpression extends ASTBase {
  path: string;

  constructor(options: ASTFeatureInjectExpressionOptions) {
    super(ASTType.FeatureInjectExpression, options);
    this.path = options.path;
  }

  toString(): string {
    return `FeatureInjectExpression[${this.start}-${this.end}][path = ${this.path}]`;
  }

  clone(): ASTFeatureInjectExpression {
    return new ASTFeatureInjectExpression({
      path: this.path,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}

export interface ASTFeatureFileExpressionOptions extends ASTBaseOptions {
  filename: string;
}

export class ASTFeatureFileExpression extends ASTBase {
  filename: string;

  constructor(options: ASTFeatureFileExpressionOptions) {
    super(ASTType.FeatureFileExpression, options);
    this.filename = options.filename;
  }

  toString(): string {
    return `FeatureFileExpression[${this.start}-${this.end}][path = ${this.filename}]`;
  }

  clone(): ASTFeatureFileExpression {
    return new ASTFeatureFileExpression({
      filename: this.filename,
      start: this.start,
      end: this.end,
      scope: this.scope
    });
  }
}
