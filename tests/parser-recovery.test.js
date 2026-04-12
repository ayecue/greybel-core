const { UnsafeParser, UnsafeLexer } = require('../dist');

describe('state recovery', function () {
  test('includes/imports/injects are restored after a failed statement', () => {
    const content = `
#include "valid.src"
#import Lib from "lib.src"
bad line @@@
#include "also-valid.src"
print("done")
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, { lexer });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);

    expect(parser.state.includes.length).toBe(2);
    expect(parser.state.includes[0].path).toBe('valid.src');
    expect(parser.state.includes[1].path).toBe('also-valid.src');

    expect(parser.state.imports.length).toBe(1);
    expect(parser.state.imports[0].path).toBe('lib.src');
  });

  test('multiple errors do not leak includes or imports', () => {
    const content = `
#include "first.src"
foo(bar @@@
#include "second.src"
baz(qux @@@
#include "third.src"
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, { lexer });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);
    expect(parser.state.includes.length).toBe(3);
    expect(parser.state.includes[0].path).toBe('first.src');
    expect(parser.state.includes[1].path).toBe('second.src');
    expect(parser.state.includes[2].path).toBe('third.src');
  });

  test('error inside function does not corrupt includes', () => {
    const content = `
#include "before.src"
myFunc = function()
  print("inside")
  bad @@@
  print("after bad")
end function
#include "after.src"
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, { lexer });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);
    expect(parser.state.includes.length).toBe(2);
    expect(parser.state.includes[0].path).toBe('before.src');
    expect(parser.state.includes[1].path).toBe('after.src');
  });

  test('state recovery inside #if env block', () => {
    const content = `
#include "always.src"
#if DEBUG
#include "debug.src"
bad line @@@
#include "debug2.src"
#else
#include "release.src"
#endif
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, {
      lexer,
      environmentVariables: new Map([['DEBUG', '1']])
    });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);

    expect(parser.state.includes.length).toBe(3);
    expect(parser.state.includes[0].path).toBe('always.src');
    expect(parser.state.includes[1].path).toBe('debug.src');
    expect(parser.state.includes[2].path).toBe('debug2.src');
  });

  test('state recovery inside #else env block', () => {
    const content = `
#include "always.src"
#if DEBUG
#include "debug.src"
#else
#include "release.src"
bad line @@@
#include "release2.src"
#endif
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, {
      lexer,
      environmentVariables: new Map()
    });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);

    expect(parser.state.includes.length).toBe(3);
    expect(parser.state.includes[0].path).toBe('always.src');
    expect(parser.state.includes[1].path).toBe('release.src');
    expect(parser.state.includes[2].path).toBe('release2.src');
  });

  test('error after #if block does not lose env includes', () => {
    const content = `
#include "before.src"
#if FEATURE
#include "feature.src"
#import FeatureLib from "feature-lib.src"
#endif
bad line @@@
#include "after.src"
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, {
      lexer,
      environmentVariables: new Map([['FEATURE', '1']])
    });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);

    expect(parser.state.includes.length).toBe(3);
    expect(parser.state.includes[0].path).toBe('before.src');
    expect(parser.state.includes[1].path).toBe('feature.src');
    expect(parser.state.includes[2].path).toBe('after.src');
    expect(parser.state.imports.length).toBe(1);
    expect(parser.state.imports[0].path).toBe('feature-lib.src');
  });

  test('nested #if with error in inner block', () => {
    const content = `
#if OUTER
#include "outer.src"
#if INNER
#include "inner.src"
bad @@@
#include "inner2.src"
#endif
#include "outer2.src"
#endif
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, {
      lexer,
      environmentVariables: new Map([['OUTER', '1'], ['INNER', '1']])
    });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);
    expect(parser.state.includes.length).toBe(4);
    expect(parser.state.includes[0].path).toBe('outer.src');
    expect(parser.state.includes[1].path).toBe('inner.src');
    expect(parser.state.includes[2].path).toBe('inner2.src');
    expect(parser.state.includes[3].path).toBe('outer2.src');
  });
});
