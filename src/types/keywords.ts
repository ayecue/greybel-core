import { Keyword as CoreKeyword } from 'greyscript-core';

export enum GreybelKeyword {
  Envar = '#envar',
  Import = '#import',
  Include = '#include',
  Debugger = 'debugger',
  From = 'from'
}

export type Keyword = CoreKeyword | GreybelKeyword;
