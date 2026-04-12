const { Parser, UnsafeParser, UnsafeLexer } = require('../dist');

describe('strictMode', function () {
  test('shorthand assignment throws in strict mode', () => {
    const content = `x = 1\nx += 2`;
    expect(() => {
      new Parser(content, { strictMode: true }).parseChunk();
    }).toThrow(/shorthand assignment/);
  });

  test('shorthand assignment allowed without strict mode', () => {
    const content = `x = 1\nx += 2`;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('map with trailing newline after value rejected in strict mode', () => {
    const content = `x = {"a": 1\n}`;
    expect(() => {
      new Parser(content, { strictMode: true }).parseChunk();
    }).toThrow();
  });

  test('list with trailing newline after value rejected in strict mode', () => {
    const content = `x = [1\n]`;
    expect(() => {
      new Parser(content, { strictMode: true }).parseChunk();
    }).toThrow();
  });

  test('map with newline after value allowed without strict mode', () => {
    const content = `x = {"a": 1\n}`;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('list with newline after value allowed without strict mode', () => {
    const content = `x = [1\n]`;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('strict mode with includes still works', () => {
    const content = `
#include "mylib.src"
x = 1
y = 2
    `;
    const parser = new Parser(content, { strictMode: true });
    const chunk = parser.parseChunk();
    expect(parser.state.includes.length).toBe(1);
    expect(parser.state.includes[0].path).toBe('mylib.src');
  });

  test('unsafe parser recovers from shorthand in strict mode', () => {
    const content = `
#include "before.src"
x += 2
#include "after.src"
    `;
    const lexer = new UnsafeLexer(content, { tabWidth: 2 });
    const parser = new UnsafeParser(content, {
      lexer,
      strictMode: true
    });
    parser.parseChunk();

    expect(parser.errors.length).toBeGreaterThan(0);
    expect(parser.errors[0].message).toMatch(/shorthand assignment/);

    expect(parser.state.includes.length).toBe(2);
    expect(parser.state.includes[0].path).toBe('before.src');
    expect(parser.state.includes[1].path).toBe('after.src');
  });
});
