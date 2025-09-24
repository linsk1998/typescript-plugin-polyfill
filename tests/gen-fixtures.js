const fs = require('fs');
const path = require('path');
const rollup = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const { rimrafSync } = require('rimraf');
const polyfillPlugin = require('../dist/index.js').default;

try {
	rimrafSync('tests/fixtures');
	let files = fs.readdirSync('tests/cases');
	rollup.rollup({
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
	}).then(bundle => {
		fs.mkdirSync('tests/fixtures');
		for(let module of bundle.cache.modules) {
			let basename = path.basename(module.id, '.ts');
			fs.writeFileSync(`tests/fixtures/${basename}.js`, module.code);
		}
	});
} catch(e) {
	console.error(e);
	process.exit(1);
}
