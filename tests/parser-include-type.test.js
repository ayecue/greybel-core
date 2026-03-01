const { Parser } = require('../dist');

describe('#include type', function () {
  test('regular #include has typeOnly false', () => {
    const content = `#include "mylib.src"`;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
    expect(parser.state.includes[0].typeOnly).toBe(false);
  });

  test('#include type sets typeOnly true', () => {
    const content = `#include type "mylib.src"`;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
    expect(parser.state.includes[0].typeOnly).toBe(true);
  });

  test('#include type with bare path', () => {
    const content = `#include type mylib.src`;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
    expect(parser.state.includes[0].typeOnly).toBe(true);
  });

  test('mixed includes', () => {
    const content = `
#include "real.src"
#include type "types-only.src"
#include "another.src"
    `;
    const parser = new Parser(content);
    const chunk = parser.parseChunk();

    expect(chunk.toString()).toMatchSnapshot();
    expect(parser.state.includes[0].typeOnly).toBe(false);
    expect(parser.state.includes[1].typeOnly).toBe(true);
    expect(parser.state.includes[2].typeOnly).toBe(false);
  });
});
