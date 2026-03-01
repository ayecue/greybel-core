import { Token } from 'miniscript-core/dist/lexer/token';
import { ASTBase } from 'miniscript-core/dist/parser/ast';
import { PendingBlock } from 'miniscript-core/dist/parser/pending-block';

export enum PendingBlockType {
  PendingEnvCondition = 100
}

export function isPendingEnvCondition(
  pendingBlock: PendingBlock
): pendingBlock is PendingEnvCondition {
  return pendingBlock.type as number === PendingBlockType.PendingEnvCondition;
}

export class PendingEnvCondition implements PendingBlock {
  block: ASTBase;
  body: ASTBase[];
  type: number;
  onComplete: ((pendingBlock: PendingBlock) => void) | null;

  isTruthy: boolean;
  ifBody: ASTBase[] | null;
  elseBody: ASTBase[] | null;

  constructor(isTruthy: boolean, startToken: Token) {
    this.block = new ASTBase('#if', {
      startLine: startToken.line,
      startChar: startToken.startChar,
      endLine: startToken.endLine,
      endChar: startToken.endChar,
      rangeStart: startToken.rangeStart,
      rangeEnd: startToken.rangeEnd
    });
    this.body = [];
    this.type = PendingBlockType.PendingEnvCondition;
    this.onComplete = null;
    this.isTruthy = isTruthy;
    this.ifBody = null;
    this.elseBody = null;
  }

  next(): void {
    this.ifBody = this.body;
    this.body = [];
  }

  complete(endToken: Token): void {
    if (this.ifBody === null) {
      this.ifBody = this.body;
    } else {
      this.elseBody = this.body;
    }

    this.block.endLine = endToken.endLine;
    this.block.endChar = endToken.endChar;
    this.block.rangeEnd = endToken.rangeEnd;

    this.onComplete?.(this);
  }

  resolve(): ASTBase[] {
    if (this.isTruthy) {
      return this.ifBody ?? [];
    }
    return this.elseBody ?? [];
  }
}
