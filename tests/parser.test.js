const { Parser } = require('../dist');
const fs = require('fs');
const path = require('path');
const testFolder = path.resolve(__dirname, 'scripts');
const util = require('util');

describe('parse', function() {
	describe('default scripts', function() {
		fs
			.readdirSync(testFolder)
			.forEach(file => {
				const filepath = path.resolve(testFolder, file);

				test(path.basename(filepath), () => {
					const content = fs.readFileSync(filepath, 'utf-8');
					const parser = new Parser(content);
					const payload = util.inspect(parser.parseChunk(), {
						depth: 4
					});

					expect(payload).toMatchSnapshot();
				});
			});

		test('invalid code', () => {
			const content = `
				print(" ad"

				print())

				print("was")

				function () .
				end func

				print("wo")
			`;
			const parser = new Parser(content, { unsafe: true });
			parser.parseChunk();

			expect(parser.errors).toMatchSnapshot();
		});
	});
});