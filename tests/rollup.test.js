const fs = require('fs');
const path = require('path');
const assert = require('assert');
const rollup = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const polyfillPlugin = require('../dist/index.js').default;

it("rollup", async function() {
	try {
		let files = fs.readdirSync('tests/cases');
		let bundle = await rollup.rollup({
			input: files.map(file => `tests/cases/${file}`),
			external: (id) => id.startsWith('sky-core'),
			plugins: [
				typescript({
					tsconfig: 'tests/tsconfig.json',
					transformers: (program) => ({
						before: [
							polyfillPlugin(program, {
								polluting: {
									at: {
										Array: 'sky-core/polyfill/Array/prototype/at',
										String: 'sky-core/polyfill/String/prototype/at'
									},
									includes: {
										Array: 'sky-core/polyfill/Array/prototype/includes',
										String: 'sky-core/polyfill/String/prototype/includes'
									},
									name: {
										Function: 'sky-core/polyfill/Function/prototype/name'
									},
									finally: {
										Promise: 'sky-core/polyfill/Promise/prototype/finally'
									},
									toJSON: {
										Date: 'sky-core/polyfill/Date/prototype/toJSON'
									}
								}
							})
						]
					})
				}),
			],
		});
		for(let module of bundle.cache.modules) {
			let basename = path.basename(module.id, '.ts');
			let code = fs.readFileSync(path.resolve(__dirname, './fixtures/' + basename + '.js'), 'utf8');
			assert.strictEqual(module.code, code, basename);
		}
	} catch(e) {
		console.error(e);
	}
});
