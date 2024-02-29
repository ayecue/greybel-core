import {
  Selector,
  Selectors as CoreSelectors,
  TokenType
} from 'miniscript-core';

import { GreybelKeyword } from './keywords';
import { Operator } from './operators';

export const Selectors: typeof CoreSelectors & {
  From: Selector;
  Envar: Selector;
  Line: Selector;
  File: Selector;
  LeftShift: Selector;
  RightShift: Selector;
  UnsignedRightShift: Selector;
  BitwiseOr: Selector;
  BitwiseAnd: Selector;
} = {
  ...CoreSelectors,
  From: new Selector({
    type: TokenType.Identifier,
    value: 'from'
  }),
  Envar: new Selector({
    type: TokenType.Keyword,
    value: GreybelKeyword.Envar
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
  })
};
