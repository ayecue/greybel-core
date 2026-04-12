# greybel-core

[![greybel-core](https://circleci.com/gh/ayecue/greybel-core.svg?style=svg)](https://circleci.com/gh/ayecue/greybel-core)

A lexer and parser that extends [miniscript-core](../miniscript-core) with Greybel-specific language features. Greybel is a superset of [MiniScript](https://miniscript.org) that adds a preprocessor, file management directives, bitwise operators, and other utilities. It produces a full AST and is designed to be extended further by [greyscript-core](../greyscript-core).

## Features on top of miniscript-core

### Preprocessor conditionals

Conditional compilation via environment variables:

```
#if DEBUG
print("debug mode")
#else
print("release mode")
#endif
```

### File directives

| Directive | Description |
|---|---|
| `#include "file.src"` | Include and inline a file |
| `#include type "file.src"` | Type-only include (definitions only, no runtime code) |
| `#import Name from "file.src"` | Import a file and bind it to a variable |
| `#inject "file.src"` | Raw code injection |

Comment-style aliases `//include` and `//import` are also supported.

### Built-in macros

| Macro | Description |
|---|---|
| `#line` | Expands to the current source line number |
| `#filename` | Expands to the current source filename |
| `#envar NAME` | Expands to an environment variable value |

### Debugger statement

```
debugger
```

Emits a debugger breakpoint AST node.

### Bitwise operators

| Operator | Description |
|---|---|
| `&` | Bitwise AND |
| `\|` | Bitwise OR |
| `<<` | Left shift |
| `>>` | Right shift |
| `>>>` | Unsigned right shift |

## Install

```
npm install greybel-core
```

## Usage

```ts
import { Parser } from 'greybel-core';

const parser = new Parser('#include "utils.src"\nprint("hello")', {
  filename: 'main.src'
});
const chunk = parser.parseChunk();

console.log(chunk.imports);   // []
console.log(chunk.includes);  // [ASTFeatureIncludeExpression]
console.log(chunk.toString());
```

### Preprocessor conditionals

```ts
import { Parser } from 'greybel-core';

const code = `
#if DEBUG
print("debug")
#else
print("release")
#endif
`;

const parser = new Parser(code, {
  environmentVariables: new Map([['DEBUG', '1']])
});
const chunk = parser.parseChunk();
// Only the truthy branch is included in the AST
```

### Unsafe mode

```ts
import { UnsafeParser, UnsafeLexer } from 'greybel-core';

const code = 'print("hello"\nprint("world")';
const lexer = new UnsafeLexer(code);
const parser = new UnsafeParser(code, { lexer });

parser.parseChunk();

console.log(parser.errors); // recoverable errors
console.log(lexer.errors);  // lexer-level errors
```

## Extending

greybel-core follows the same extension patterns as miniscript-core. The keyword handler builder is available via `greybelKeywordHandlerBuilder()` and can be extended with additional entries. The operator builders (`greybelInfixOpBuilder`, `greybelAtomOpBuilder`) work the same way.

`GreybelParserState` extends `ParserState` with `imports`, `includes`, and `injects` arrays. Subclasses that add their own state fields should override `snapshot()`, `restore()`, `merge()`, `createEmpty()`, and `clone()`.

## Testing

```
npm test
```