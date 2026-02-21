import { Keyword as CoreKeyword } from 'miniscript-core/dist/types/keywords';

export enum GreybelKeyword {
  Envar = '#envar',
  Import = '#import',
  Include = '#include',
  ImportWithComment = '//import',
  IncludeWithComment = '//include',
  Debugger = 'debugger',
  Line = '#line',
  File = '#filename',
  Inject = '#inject'
}

export type Keyword = CoreKeyword | GreybelKeyword;
