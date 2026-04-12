const { Parser } = require('../dist');

describe('bitwise operators', function () {
  test('left shift', () => {
    const parser = new Parser('result = 1 << 2', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('right shift', () => {
    const parser = new Parser('result = 8 >> 2', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('unsigned right shift', () => {
    const parser = new Parser('result = 8 >>> 2', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('bitwise and', () => {
    const parser = new Parser('result = a & b', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('bitwise or', () => {
    const parser = new Parser('result = a | b', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('bitwise precedence: shift binds tighter than and', () => {
    const parser = new Parser('result = a << 1 & b', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('bitwise precedence: and binds tighter than or', () => {
    const parser = new Parser('result = a & b | c', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });

  test('bitwise with arithmetic', () => {
    const parser = new Parser('result = (a + b) << 2', { tabWidth: 2 });
    const chunk = parser.parseChunk();
    expect(chunk.toString()).toMatchSnapshot();
  });
});
