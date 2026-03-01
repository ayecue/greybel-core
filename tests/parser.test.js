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
  });
});