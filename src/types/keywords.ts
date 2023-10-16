import { Keyword as CoreKeyword } from 'greyscript-core';

export enum GreybelKeyword {
  Envar = '#envar',
  Import = '#import',
  Include = '#include',
  ImportWithComment = '//import',
  IncludeWithComment = '//include',
  Debugger = 'debugger'
}

export type Keyword = CoreKeyword | GreybelKeyword;
