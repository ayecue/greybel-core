const { Lexer, UnsafeLexer } = require('../dist');
const { TokenType } = require('miniscript-core');

describe('multiline comments', function () {
  function tokenize(content) {
    const lexer = new Lexer(content);
    const tokens = [];
    let token = lexer.next();
    while (token.type !== TokenType.EOF) {
      tokens.push({
        type: token.type,
        value: token.value,
        line: token.line
      });
      token = lexer.next();
    }
    return tokens;
  }

  test('multiline comment is parsed as comment token', () => {
    const tokens = tokenize('/* hello */ x = 1');
    const commentToken = tokens.find(t => t.type === TokenType.Comment);
    expect(commentToken).toBeDefined();
    expect(commentToken.value).toContain('hello');
  });

  test('multiline comment spanning multiple lines', () => {
    const tokens = tokenize('/* line one\nline two */ x = 1');
    const commentToken = tokens.find(t => t.type === TokenType.Comment);
    expect(commentToken).toBeDefined();
    expect(commentToken.value).toContain('line one');
    expect(commentToken.value).toContain('line two');
  });

  test('unclosed multiline comment raises error', () => {
    expect(() => {
      const lexer = new Lexer('/* unclosed comment');
      let token = lexer.next();
      while (token.type !== TokenType.EOF) {
        token = lexer.next();
      }
    }).toThrow(/multiline comment/i);
  });

  test('unclosed multiline comment in unsafe mode produces error', () => {
    const lexer = new UnsafeLexer('/* unclosed comment');
    let token = lexer.next();
    while (token.type !== TokenType.EOF) {
      token = lexer.next();
    }
    expect(lexer.errors.length).toBeGreaterThan(0);
    expect(lexer.errors[0].message).toMatch(/multiline comment/i);
  });

  test('empty multiline comment', () => {
    const tokens = tokenize('/**/ x = 1');
    const commentToken = tokens.find(t => t.type === TokenType.Comment);
    expect(commentToken).toBeDefined();
  });

  test('multiline comment with asterisks inside', () => {
    const tokens = tokenize('/* * ** *** */ x = 1');
    const commentToken = tokens.find(t => t.type === TokenType.Comment);
    expect(commentToken).toBeDefined();
  });
});

describe('bitwise operator tokens', function () {
  function tokenize(content) {
    const lexer = new Lexer(content);
    const tokens = [];
    let token = lexer.next();
    while (token.type !== TokenType.EOF) {
      tokens.push({
        type: token.type,
        value: token.value
      });
      token = lexer.next();
    }
    return tokens;
  }

  test('left shift operator <<', () => {
    const tokens = tokenize('a << b');
    expect(tokens.some(t => t.value === '<<')).toBe(true);
  });

  test('right shift operator >>', () => {
    const tokens = tokenize('a >> b');
    expect(tokens.some(t => t.value === '>>')).toBe(true);
  });

  test('unsigned right shift operator >>>', () => {
    const tokens = tokenize('a >>> b');
    expect(tokens.some(t => t.value === '>>>')).toBe(true);
  });

  test('ampersand operator &', () => {
    const tokens = tokenize('a & b');
    expect(tokens.some(t => t.value === '&')).toBe(true);
  });

  test('vertical line operator |', () => {
    const tokens = tokenize('a | b');
    expect(tokens.some(t => t.value === '|')).toBe(true);
  });
});
