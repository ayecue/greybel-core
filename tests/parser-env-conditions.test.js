const { Parser, UnsafeParser, UnsafeLexer } = require('../dist');
const { describeErrors } = require('./test-utils');

describe('#if/#else/#endif', function () {
  test('truthy #if includes body', () => {
    const content = `
#if MY_VAR
print("included")
#endif
print("always")
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['MY_VAR', 'true']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('falsy #if excludes body', () => {
    const content = `
#if MY_VAR
print("excluded")
#endif
print("always")
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map()
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('truthy #if/#else takes if branch', () => {
    const content = `
#if MY_VAR
print("if branch")
#else
print("else branch")
#endif
print("always")
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['MY_VAR', '1']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('falsy #if/#else takes else branch', () => {
    const content = `
#if MY_VAR
print("if branch")
#else
print("else branch")
#endif
print("always")
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map()
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('nested #if blocks', () => {
    const content = `
#if OUTER
print("outer start")
#if INNER
print("inner")
#endif
print("outer end")
#endif
print("always")
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['OUTER', '1'], ['INNER', '1']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('nested #if with outer false', () => {
    const content = `
#if OUTER
print("outer start")
#if INNER
print("inner")
#endif
print("outer end")
#endif
print("always")
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['INNER', '1']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('falsy values: empty string', () => {
    const content = `
#if MY_VAR
print("excluded")
#endif
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['MY_VAR', '']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('falsy values: 0', () => {
    const content = `
#if MY_VAR
print("excluded")
#endif
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['MY_VAR', '0']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('falsy values: false', () => {
    const content = `
#if MY_VAR
print("excluded")
#endif
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['MY_VAR', 'false']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('#if without #endif errors', () => {
    const content = `
#if MY_VAR
print("unclosed")
    `;
    const lexer = new UnsafeLexer(content);
    const parser = new UnsafeParser(content, {
      lexer,
      environmentVariables: new Map([['MY_VAR', '1']])
    });

    parser.parseChunk();

    expect(describeErrors(parser.errors)).toMatchSnapshot();
  });

  test('#else without #if errors', () => {
    const content = `
#else
print("orphan")
#endif
    `;
    const lexer = new UnsafeLexer(content);
    const parser = new UnsafeParser(content, {
      lexer,
      environmentVariables: new Map()
    });

    parser.parseChunk();

    expect(describeErrors(parser.errors)).toMatchSnapshot();
  });

  test('#endif without #if errors', () => {
    const content = `
#endif
    `;
    const lexer = new UnsafeLexer(content);
    const parser = new UnsafeParser(content, {
      lexer,
      environmentVariables: new Map()
    });

    parser.parseChunk();

    expect(describeErrors(parser.errors)).toMatchSnapshot();
  });

  test('#if with multiple statements in branches', () => {
    const content = `
x = 1
#if DEBUG
x = 2
y = 3
print(x + y)
#else
x = 10
print(x)
#endif
print("done")
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['DEBUG', '1']])
    });
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
  });

  test('#if truthy branch - dropped else includes are filtered', () => {
    const content = `
#include "always.src"
#if DEBUG
#include "debug.src"
#import DebugLib from "debug-lib.src"
#else
#include "release.src"
#import ReleaseLib from "release-lib.src"
#endif
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map([['DEBUG', '1']])
    });
    const chunk = parser.parseChunk();

    expect(parser.state.includes.length).toBe(2);
    expect(parser.state.includes[0].path).toBe('always.src');
    expect(parser.state.includes[1].path).toBe('debug.src');
    expect(parser.state.imports.length).toBe(1);
    expect(parser.state.imports[0].path).toBe('debug-lib.src');
  });

  test('#if falsy branch - dropped if includes are filtered', () => {
    const content = `
#include "always.src"
#if DEBUG
#include "debug.src"
#import DebugLib from "debug-lib.src"
#else
#include "release.src"
#import ReleaseLib from "release-lib.src"
#endif
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map()
    });
    const chunk = parser.parseChunk();

    expect(parser.state.includes.length).toBe(2);
    expect(parser.state.includes[0].path).toBe('always.src');
    expect(parser.state.includes[1].path).toBe('release.src');
    expect(parser.state.imports.length).toBe(1);
    expect(parser.state.imports[0].path).toBe('release-lib.src');
  });

  test('#if without else - dropped if includes are filtered', () => {
    const content = `
#include "always.src"
#if FEATURE
#include "feature.src"
#endif
    `;
    const parser = new Parser(content, {
      environmentVariables: new Map()
    });
    const chunk = parser.parseChunk();

    expect(parser.state.includes.length).toBe(1);
    expect(parser.state.includes[0].path).toBe('always.src');
  });
});
