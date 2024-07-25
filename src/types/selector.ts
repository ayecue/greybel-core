import {
  Operator as CoreOperator,
  Selector,
  Selectors as CoreSelectors,
  TokenType
} from 'miniscript-core';

import { GreybelKeyword } from './keywords';
import { Operator } from './operators';

export enum SelectorTypes {
  From = 'From',
  Envar = 'Envar',
  Inject = 'Inject',
  Line = 'Line',
  File = 'File',
  LeftShift = 'LeftShift',
  RightShift = 'RightShift',
  UnsignedRightShift = 'UnsignedRightShift',
  BitwiseOr = 'BitwiseOr',
  BitwiseAnd = 'BitwiseAnd',
  Escape = 'Escape'
}

export const Selectors: typeof CoreSelectors & Record<SelectorTypes, Selector> =
  {
    ...CoreSelectors,
    From: new Selector({
      type: TokenType.Identifier,
      value: 'from'
    }),
    Envar: new Selector({
      type: TokenType.Keyword,
      value: GreybelKeyword.Envar
    }),
    Inject: new Selector({
      type: TokenType.Keyword,
      value: GreybelKeyword.Inject
    }),
    Line: new Selector({
      type: TokenType.Keyword,
      value: GreybelKeyword.Line
    }),
    File: new Selector({
      type: TokenType.Keyword,
      value: GreybelKeyword.File
    }),
    LeftShift: new Selector({
      type: TokenType.Punctuator,
      value: Operator.LeftShift
    }),
    RightShift: new Selector({
      type: TokenType.Punctuator,
      value: Operator.RightShift
    }),
    UnsignedRightShift: new Selector({
      type: TokenType.Punctuator,
      value: Operator.UnsignedRightShift
    }),
    BitwiseOr: new Selector({
      type: TokenType.Punctuator,
      value: Operator.BitwiseOr
    }),
    BitwiseAnd: new Selector({
      type: TokenType.Punctuator,
      value: Operator.BitwiseAnd
    }),
    Escape: new Selector({
      type: TokenType.Punctuator,
      value: CoreOperator.Escape
    })
  };
