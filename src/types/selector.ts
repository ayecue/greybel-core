import {
  Operator as CoreOperator,
  Selector,
  Selectors as CoreSelectors,
  TokenType,
  createSelector,
  SelectorGroups as CoreSelectorGroups,
  SelectorGroup,
  createSelectorGroup
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
  From: createSelector({
    type: TokenType.Identifier,
    value: 'from'
  }),
  Envar: createSelector({
    type: TokenType.Keyword,
    value: GreybelKeyword.Envar
  }),
  Inject: createSelector({
    type: TokenType.Keyword,
    value: GreybelKeyword.Inject
  }),
  Line: createSelector({
    type: TokenType.Keyword,
    value: GreybelKeyword.Line
  }),
  File: createSelector({
    type: TokenType.Keyword,
    value: GreybelKeyword.File
  }),
  LeftShift: createSelector({
    type: TokenType.Punctuator,
    value: Operator.LeftShift
  }),
  RightShift: createSelector({
    type: TokenType.Punctuator,
    value: Operator.RightShift
  }),
  UnsignedRightShift: createSelector({
    type: TokenType.Punctuator,
    value: Operator.UnsignedRightShift
  }),
  BitwiseOr: createSelector({
    type: TokenType.Punctuator,
    value: Operator.BitwiseOr
  }),
  BitwiseAnd: createSelector({
    type: TokenType.Punctuator,
    value: Operator.BitwiseAnd
  }),
  Escape: createSelector({
    type: TokenType.Punctuator,
    value: CoreOperator.Escape
  })
};

export enum SelectorGroupType {
  MapSeparator = 'MapSeparator',
  ListSeparator = 'ListSeparator',
  PathSegmentEnd = 'PathSegmentEnd',
  BitwiseOperators = 'BitwiseOperators'
}

export const SelectorGroups: Record<SelectorGroupType, SelectorGroup> = {
  ...CoreSelectorGroups,
  [SelectorGroupType.MapSeparator]: createSelectorGroup(SelectorGroupType.MapSeparator, [
    Selectors.MapSeperator,
    Selectors.CRBracket
  ]),
  [SelectorGroupType.ListSeparator]: createSelectorGroup(SelectorGroupType.ListSeparator, [
    Selectors.MapSeperator,
    Selectors.SRBracket
  ]),
  [SelectorGroupType.PathSegmentEnd]: createSelectorGroup(SelectorGroupType.PathSegmentEnd, [
    Selectors.EndOfLine,
    Selectors.Comment,
    Selectors.EndOfFile
  ]),
  [SelectorGroupType.BitwiseOperators]: createSelectorGroup(SelectorGroupType.BitwiseOperators, [
    Selectors.LeftShift,
    Selectors.RightShift,
    Selectors.UnsignedRightShift
  ]),
};