import { Token } from 'miniscript-core/dist/lexer/token';
import { ASTBase, ASTBaseBlock } from 'miniscript-core/dist/parser/ast';
import { ParserState } from 'miniscript-core/dist/parser/state';
import { PendingBlock } from 'miniscript-core/dist/parser/pending-block';
import { GreybelKeyword } from '../types/keywords';

export enum PendingBlockType {
  PendingEnvCondition = 100
}

export interface StateBranch {
  body: ASTBase[];
  state: ParserState;
}

export function isPendingEnvCondition(
  pendingBlock: PendingBlock
): pendingBlock is PendingEnvCondition {
  return pendingBlock.type as number === PendingBlockType.PendingEnvCondition;
}

export class PendingEnvCondition implements PendingBlock {
  block: ASTBase;
  type: number;
  onComplete: ((pendingBlock: PendingBlock) => void) | null;

  // runtime
  isTruthy: boolean;
  body: ASTBase[] | null = null;
  state: ParserState | null = null;

  // branches
  thruthyBranch: StateBranch;
  falselyBranch: StateBranch;

  constructor(isTruthy: boolean, startToken: Token, emptyCollections: ParserState) {
    this.block = new ASTBaseBlock(GreybelKeyword.IfEnv, {
      startLine: startToken.line,
      startChar: startToken.startChar,
      endLine: startToken.endLine,
      endChar: startToken.endChar,
      rangeStart: startToken.rangeStart,
      rangeEnd: startToken.rangeEnd
    });
    this.thruthyBranch = {
      body: [],
      state: emptyCollections.createEmpty()
    };
    this.falselyBranch = {
      body: [],
      state: emptyCollections.createEmpty()
    };
    this.type = PendingBlockType.PendingEnvCondition;
    this.onComplete = null;
    this.isTruthy = isTruthy;
  }

  enableTruthlyBranch() {
    this.body = this.thruthyBranch.body;
    this.state = this.thruthyBranch.state;
  }

  enableFalselyBranch() {
    this.body = this.falselyBranch.body;
    this.state = this.falselyBranch.state;
  }

  resetBranch() {
    this.body = null;
    this.state = null;
  }

  complete(endToken: Token): void {
    this.block.endLine = endToken.endLine;
    this.block.endChar = endToken.endChar;
    this.block.rangeEnd = endToken.rangeEnd;

    this.onComplete?.(this);
  }

  resolve(): ASTBase[] {
    return this.isTruthy ? this.thruthyBranch.body : this.falselyBranch.body;
  }

  resolveState(): ParserState {
    return this.isTruthy ? this.thruthyBranch.state : this.falselyBranch.state;
  }
}
