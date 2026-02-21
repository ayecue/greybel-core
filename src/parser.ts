import UnsafeParserMixin from 'miniscript-core/dist/mixins/unsafe-parser-mixin';
import ParserBase, {
  ParserOptions as ParserOptionsBase
} from 'miniscript-core/dist/parser';
import { ASTBase } from 'miniscript-core/dist/parser/ast';
import { Comment } from 'miniscript-core/dist/types/comment';
import { Selectors as BaseSelectors } from 'miniscript-core/dist/types/selector';

import Lexer, { UnsafeLexer } from './lexer';
import {
  ASTChunkGreybel,
  ASTFeatureImportExpression,
  ASTFeatureIncludeExpression,
  ASTProvider
} from './parser/ast';
import { ASTFeatureInjectExpression } from './parser/ast/feature';
import {
  greybelAtomOps,
  greybelInfixOps,
  greybelKeywordOps
} from './parser/ops';

export interface ParserOptions extends ParserOptionsBase {
  astProvider?: ASTProvider;
  lexer?: Lexer;
  filename?: string;
}

export default class Parser extends ParserBase {
  filename: string;
  imports: ASTFeatureImportExpression[];
  includes: ASTFeatureIncludeExpression[];
  injects: ASTFeatureInjectExpression[];
  astProvider: ASTProvider;

  constructor(content: string, options: ParserOptions = {}) {
    options.lexer =
      options.lexer ||
      new Lexer(content, {
        tabWidth: options.tabWidth
      });
    options.astProvider = options.astProvider || new ASTProvider();

    // Use prebuilt op indexes
    options.infixOps = options.infixOps || greybelInfixOps;
    options.atomOps = options.atomOps || greybelAtomOps;
    options.keywordOps = options.keywordOps || greybelKeywordOps;

    super(content, options);

    const me = this;

    me.filename = options.filename ?? 'unknown';
    me.imports = [];
    me.includes = [];
    me.injects = [];
  }

  consumeNoop(): number {
    const me = this;
    let lines = 0;
    while (true) {
      if (BaseSelectors.Comment(me.token)) {
        const isStatement = me.previousToken?.line !== me.token.line;
        const comment: Comment = {
          value: me.token.value,
          isMultiline: me.token.value.indexOf('\n') !== -1
        };

        me.comments.push(comment);
        me.noopConsumer?.onComment(me, comment, isStatement);
        lines = 0;
      } else if (BaseSelectors.EndOfLine(me.token)) {
        me.noopConsumer?.onEmptyLine(me);
      } else {
        break;
      }

      me.next();
    }

    return lines;
  }

  parseChunk(): ASTChunkGreybel | ASTBase {
    const chunk = super.parseChunk();
    const me = this;
    const c = chunk as ASTChunkGreybel;
    c.imports = me.imports;
    c.includes = me.includes;
    c.injects = me.injects;
    return c;
  }
}

export class UnsafeParser extends UnsafeParserMixin(Parser) {
  declare lexer: UnsafeLexer;

  constructor(content: string, options: ParserOptions = {}) {
    const lexer =
      (options.lexer as unknown as UnsafeLexer) ||
      new UnsafeLexer(content, {
        tabWidth: options.tabWidth
      });
    super(content, { ...options, lexer: lexer as any });
  }
}
