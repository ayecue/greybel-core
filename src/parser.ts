import UnsafeParserMixin from 'miniscript-core/dist/mixins/unsafe-parser-mixin';
import ParserBase, {
  ParserOptions as ParserOptionsBase
} from 'miniscript-core/dist/parser';
import { ASTBase } from 'miniscript-core/dist/parser/ast';
import { Comment } from 'miniscript-core/dist/types/comment';
import { Stack } from 'miniscript-core/dist/utils/stack';

import Lexer, { UnsafeLexer } from './lexer';
import {
  ASTChunkGreybel,
  ASTProvider
} from './parser/ast';
import { GreybelParserState } from './parser/state';
import {
  greybelAtomOps,
  greybelInfixOps,
  greybelKeywordOps
} from './parser/ops';

export interface ParserOptions extends ParserOptionsBase {
  astProvider?: ASTProvider;
  lexer?: Lexer;
  filename?: string;
  environmentVariables?: Map<string, string>;
}

export default class Parser extends ParserBase {
  filename: string;
  declare state: GreybelParserState;
  astProvider: ASTProvider;
  environmentVariables: Map<string, string>;
  protected _stateStack: Stack<GreybelParserState> = new Stack();

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
    options.state = options.state || new GreybelParserState();

    super(content, options);

    const me = this;

    me.filename = options.filename ?? 'unknown';
    me._stateStack.setDefault(me.state);
    me.environmentVariables = options.environmentVariables ?? new Map();
  }

  pushState(state: GreybelParserState): void {
    this._stateStack.push(state);
  }

  popState(): GreybelParserState {
    return this._stateStack.pop();
  }

  getState(): GreybelParserState {
    return this._stateStack.peek();
  }

  protected createComment(token: any): Comment {
    return {
      value: token.value,
      isMultiline: token.value.indexOf('\n') !== -1
    };
  }

  parseChunk(): ASTChunkGreybel | ASTBase {
    const chunk = super.parseChunk();
    const me = this;

    const c = chunk as ASTChunkGreybel;
    c.imports = me.state.imports;
    c.includes = me.state.includes;
    c.injects = me.state.injects;
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
