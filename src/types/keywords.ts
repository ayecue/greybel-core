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
  Inject = '#inject',
  IfEnv = '#if',
  ElseEnv = '#else',
  EndIfEnv = '#endif',
  IncludeType = 'type'
}

export type Keyword = CoreKeyword | GreybelKeyword;
