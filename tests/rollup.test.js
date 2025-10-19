const fs = require('fs');
const path = require('path');
const assert = require('assert');
const rollup = require('rollup');
const typescript = require('@rollup/plugin-typescript');
const polyfillPlugin = require('../dist/index.js').default;

it("rollup", async function() {
	// 定义 TypeScript 配置文件路径
	const tsConfigPath = path.resolve(__dirname, "tsconfig.json");
	// 获取 TypeScript 配置JSON
	const tsConfig = require(tsConfigPath);

	let files = fs.readdirSync('tests/cases');
	let bundle = await rollup.rollup({
		input: files.map(file => `tests/cases/${file}`),
		external: (id) => id.startsWith('sky-core'),
		plugins: [
			typescript({
				tsconfig: tsConfigPath,
				transformers: (program) => ({
					before: [
						polyfillPlugin(program, {
							polluting: tsConfig.compilerOptions.plugins[0].polluting
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
});
