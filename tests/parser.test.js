const { Parser, Lexer, UnsafeParser, UnsafeLexer } = require('../dist');
const { ASTType } = require('miniscript-core');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');

function describeErrors(errors) {
  return errors.map((e) => ({
    message: e.message,
    range: e.range ? { start: e.range.start, end: e.range.end } : null,
    code: e.code,
    hint: e.hint ?? null
  }));
}

describe('parse', function () {
  describe('default scripts', function () {
    fs
      .readdirSync(testFolder)
      .forEach(file => {
        const filepath = path.resolve(testFolder, file);

        test(path.basename(filepath), () => {
          const content = fs.readFileSync(filepath, 'utf-8');
          const parser = new Parser(content, {
            tabWidth: 4
          });
          const payload = parser.parseChunk();

          expect(payload.toString()).toMatchSnapshot();
          expect(payload.namespaces.reduce((result, item) => {
            let currentIdentifier = item;
            if (item.type === ASTType.MemberExpression) {
              currentIdentifier = item.identifier;
            }
            if (!result[currentIdentifier.kind]) result[currentIdentifier.kind] = 0;
            result[currentIdentifier.kind]++;
            return result;
          }, {})).toMatchSnapshot();
          expect(payload.literals.length).toMatchSnapshot();
          expect(payload.definitions.length).toMatchSnapshot();
        });
      });

    fs
      .readdirSync(testFolder)
      .forEach(file => {
        const filepath = path.resolve(testFolder, file);

        test(path.basename(filepath) + ' unsafe', () => {
          const content = fs.readFileSync(filepath, 'utf-8');
          const parser = new UnsafeParser(content, {
            tabWidth: 4
          });
          const payload = parser.parseChunk().toString();

          expect(payload).toMatchSnapshot();
        });
      });

    test('invalid code', () => {
      const content = `
				print(" ad"

				print())

				print("was")

				wad;  aw dwad wa

				not @a;not -@b
				not +@v

				not not not not not not not not @a

				if not @a then x

				function () .
				end func

				print("wo")

				if (true) then;
					print("true")
				else;
					print((false));
				end if;

				if (false) print("false")
			`;
      const lexer = new UnsafeLexer(content);
      const parser = new UnsafeParser(content, {
        lexer
      });

      parser.parseChunk();

      expect(describeErrors(lexer.errors)).toMatchSnapshot();
      expect(describeErrors(parser.errors)).toMatchSnapshot();
    });

    test('open block', () => {
      const content = `
        myComputer = get_shell("root", "test").host_computer

        rootPath = "/root"
        rootFolder = myComputer.File(rootPath)

        folderCount = 0

        while true
          folderName = "testf" + folderCount
          preExisting = myComputer.File(rootFolder.path + "/" + folderName)
          if (preExisting) then preExisting.delete
          result = myComputer.create_folder(rootFolder.path, folderName)
          if result isa string then
            print "Ended with because of " + result
            break
          end if
          print "Created folder " + folderName
          isFull = false
          for index in range(250)
            result = myComputer.touch(rootFolder.path + "/" + folderName, "ppp" + index)
            if result isa string then
              isFull = true
              print "Ended with because of " + result
              break
            end if
            print "Created file " + index + " for " + folderName
          end for
          if isFull then break
          folderCount = folderCount + 1
        end while

        queue = [myComputer.File("/")]
        allFiles = []

        while queue.len
          item = queue.pull
          allFiles = allFiles + item.get_files
          queue = queue + item.get_folders
        end whil

        print allFiles.len
      `;
      const lexer = new UnsafeLexer(content, { tabWidth: 2 });
      const parser = new UnsafeParser(content, {
        lexer
      });

      parser.parseChunk();

      expect(describeErrors(lexer.errors)).toMatchSnapshot();
      expect(describeErrors(parser.errors)).toMatchSnapshot();
    });

    test('using repeat keyword', () => {
      const content = `
        repeat = function(foo)
          print(foo)
        end function
			`;
      const lexer = new UnsafeLexer(content, { tabWidth: 2 });
      const parser = new UnsafeParser(content, {
        lexer
      });

      parser.parseChunk();

      expect(describeErrors(lexer.errors)).toMatchSnapshot();
      expect(describeErrors(parser.errors)).toMatchSnapshot();
    });
  });

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

      // Both valid includes should be present
      expect(parser.state.includes.length).toBe(2);
      expect(parser.state.includes[0].path).toBe('valid.src');
      expect(parser.state.includes[1].path).toBe('also-valid.src');

      // The import should be present
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

      // truthy branch: always.src + debug.src + debug2.src
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

      // falsy branch: always.src + release.src + release2.src
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

      // Includes from the env block should not be lost
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
});