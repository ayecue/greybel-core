import {
  Selector,
  Selectors as CoreSelectors,
  TokenType
} from 'miniscript-core';

import { GreybelKeyword } from './keywords';

export const Selectors: typeof CoreSelectors & {
  From: Selector;
  Envar: Selector;
} = {
  ...CoreSelectors,
  From: new Selector({
    type: TokenType.Identifier,
    value: 'from'
  }),
  Envar: new Selector({
    type: TokenType.Keyword,
    value: GreybelKeyword.Envar
  })
};
