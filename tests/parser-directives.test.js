const { Parser, UnsafeParser, UnsafeLexer, ASTType } = require('../dist');
const { describeErrors } = require('./test-utils');

describe('greybel directives', function () {
  describe('#import', function () {
    test('basic import with from keyword', () => {
      const parser = new Parser('#import foo from "bar";', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.imports.length).toBe(1);
      const imp = chunk.imports[0];
      expect(imp.type).toBe(ASTType.FeatureImportExpression);
      expect(imp.toString()).toContain('foo');
      expect(imp.toString()).toContain('bar');
    });

    test('import is added to state.imports', () => {
      const parser = new Parser('#import foo from "bar";', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(parser.state.imports.length).toBe(1);
    });

    test('import name appears in scope definitions', () => {
      const parser = new Parser('#import foo from "bar";', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.definitions.length).toBeGreaterThanOrEqual(1);
    });

    test('import missing from keyword raises error', () => {
      expect(() => {
        new Parser('#import foo "bar";', { tabWidth: 2 }).parseChunk();
      }).toThrow(/expected from keyword/i);
    });

    test('multiple imports are tracked', () => {
      const content = '#import a from "x";\n#import b from "y";';
      const parser = new Parser(content, { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.imports.length).toBe(2);
    });
  });

  describe('#include', function () {
    test('basic include with string path', () => {
      const parser = new Parser('#include "myfile";', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.includes.length).toBe(1);
      const inc = chunk.includes[0];
      expect(inc.type).toBe(ASTType.FeatureIncludeExpression);
      expect(inc.toString()).toContain('myfile');
    });

    test('include is added to state.includes', () => {
      const parser = new Parser('#include "myfile";', { tabWidth: 2 });
      parser.parseChunk();

      expect(parser.state.includes.length).toBe(1);
    });

    test('multiple includes are tracked', () => {
      const content = '#include "a";\n#include "b";';
      const parser = new Parser(content, { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.includes.length).toBe(2);
    });
  });

  describe('#inject', function () {
    test('basic inject with string path', () => {
      const parser = new Parser('#inject "mycode";', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.injects.length).toBe(1);
      const inj = chunk.injects[0];
      expect(inj.type).toBe(ASTType.FeatureInjectExpression);
      expect(inj.toString()).toContain('mycode');
    });

    test('inject is added to state.injects', () => {
      const parser = new Parser('#inject "mycode";', { tabWidth: 2 });
      parser.parseChunk();

      expect(parser.state.injects.length).toBe(1);
    });
  });

  describe('#envar', function () {
    test('envar as keyword statement', () => {
      const envVars = new Map([['MY_VAR', 'hello']]);
      const parser = new Parser('#envar MY_VAR;', {
        tabWidth: 2,
        environmentVariables: envVars
      });
      const chunk = parser.parseChunk();

      expect(chunk.body.length).toBeGreaterThanOrEqual(1);
      const envarNode = chunk.body.find(n => n.type === ASTType.FeatureEnvarExpression);
      expect(envarNode).toBeDefined();
      expect(envarNode.toString()).toContain('MY_VAR');
    });

    test('envar as atom in expression', () => {
      const envVars = new Map([['MY_VAR', 'hello']]);
      const parser = new Parser('x = #envar MY_VAR;', {
        tabWidth: 2,
        environmentVariables: envVars
      });
      const chunk = parser.parseChunk();

      expect(chunk.toString()).toContain('FeatureEnvarExpression');
    });
  });

  describe('debugger', function () {
    test('debugger statement produces correct AST type', () => {
      const parser = new Parser('debugger', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.body.length).toBe(1);
      expect(chunk.body[0].type).toBe(ASTType.FeatureDebuggerExpression);
    });
  });

  describe('#line', function () {
    test('line expression in assignment', () => {
      const parser = new Parser('x = #line', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.toString()).toContain('FeatureLineExpression');
    });
  });

  describe('#filename', function () {
    test('filename expression with custom filename', () => {
      const parser = new Parser('x = #filename', {
        tabWidth: 2,
        filename: 'test.src'
      });
      const chunk = parser.parseChunk();

      expect(chunk.toString()).toContain('FeatureFileExpression');
      expect(chunk.toString()).toContain('test.src');
    });

    test('filename defaults to unknown', () => {
      const parser = new Parser('x = #filename', { tabWidth: 2 });
      const chunk = parser.parseChunk();

      expect(chunk.toString()).toContain('FeatureFileExpression');
      expect(chunk.toString()).toContain('unknown');
    });
  });
});
