const fs = require("fs");
const path = require("path");
const assert = require('assert');
const webpack = require("webpack");
const polyfillPlugin = require('../dist/index.js').default;

it("webpack", function() {
	// 定义 TypeScript 配置文件路径
	const tsConfigPath = path.resolve(__dirname, "tsconfig.json");
	// 获取 TypeScript 配置JSON
	const tsConfig = require(tsConfigPath);

	let files = fs.readdirSync('tests/cases');
	// 创建一个 Webpack 编译实例
	const compiler = webpack({
		entry: files.map(file => path.resolve('tests/cases', file)),
		output: {
			path: path.resolve('tests/fixtures'),
			filename: "[name].js"
		},
		externals: ({ context, request }, callback) => {
			if(request.startsWith('sky-core')) {
				return callback(null, `root ${request}`);
			}
			callback();
		},
		module: {
			rules: [
				{
					test: /\.tsx?$/,
					loader: 'ts-loader',
					options: {
						configFile: tsConfigPath,
						getCustomTransformers: (program) => ({
							before: [
								polyfillPlugin(program, {
									polluting: tsConfig.compilerOptions.plugins[0].polluting
								})
							]
						})
					}
				}
			]
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js"]
		},
		mode: 'development',
		plugins: [
			{
				apply: (compiler) => {
					// 关键：在 Webpack 准备写入文件前拦截
					compiler.hooks.emit.tap('PreventOutputPlugin', (compilation) => {
						// 清空所有待输出的资源（阻止写入磁盘）
						compilation.assets = {};
					});

					// 你的现有插件（用于验证 ts-loader 结果）
					compiler.hooks.compilation.tap('TsLoaderVerifyPlugin', (compilation) => {
						compilation.hooks.afterOptimizeModules.tap('TsLoaderVerifyPlugin', (modules) => {
							modules.forEach((module) => {
								if(module.resource && module.resource.endsWith('.ts')) {
									const source = module._source;
									if(source) {
										let basename = path.basename(module.resource, '.ts');
										let code = fs.readFileSync(path.resolve(__dirname, './fixtures/' + basename + '.js'), 'utf8');
										assert.strictEqual(source.source(), code, basename);
									}
								}
							});
						});
					});
				}
			}
		]
	});
	return new Promise((resolve, reject) => {
		// 运行 Webpack 编译
		compiler.run((err, stats) => {
			if(err) {
				reject(err);
			} else {
				if(stats.compilation.errors.length > 0) {
					reject(new AggregateError(stats.compilation.errors, stats.toString()));
				} else {
					resolve(stats);
				}
			}
		});
	});
});
