import {
  Selector,
  Selectors as CoreSelectors,
  TokenType
} from 'greyscript-core';

import { GreybelKeyword } from './keywords';

export const Selectors: typeof CoreSelectors & {
  From: Selector;
  Envar: Selector;
} = {
  ...CoreSelectors,
  From: new Selector({
    type: TokenType.Keyword,
    value: GreybelKeyword.From
  }),
  Envar: new Selector({
    type: TokenType.Keyword,
    value: GreybelKeyword.Envar
  })
};
