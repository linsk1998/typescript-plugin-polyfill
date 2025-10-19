# TypeScript Plugin Polyfill

[![npm version](https://img.shields.io/npm/v/typescript-plugin-polyfill.svg)](https://www.npmjs.com/package/typescript-plugin-polyfill)
[![Build Status](https://github.com/linsk1998/typescript-plugin-polyfill/workflows/CI/badge.svg)](https://github.com/linsk1998/typescript-plugin-polyfill/actions)
[![License](https://img.shields.io/npm/l/typescript-plugin-polyfill.svg)](https://github.com/linsk1998/typescript-plugin-polyfill/blob/main/LICENSE)

A TypeScript transformer plugin that intelligently injects polyfill imports based on actual type usage, avoiding redundant polyfill imports that increase bundle size.

## Problem Background

Traditional polyfill solutions have the following issues:
- Lack of type information leads to importing redundant polyfills
- For example, when using the `.at()` method, both Array and String `.at()` polyfills would be imported
- This increases the final bundle size unnecessarily

This plugin analyzes the actual usage in the code and accurately determines which polyfills are needed based on TypeScript's type system.

## Installation

```bash
npm install typescript-plugin-polyfill
```

## Usage

### As a TypeScript Transformer

```typescript
import polyfillPlugin from 'typescript-plugin-polyfill';

// Using programmatically with TypeScript API
const program = ts.createProgram(files, {
  // ...other options
});

const transformers: ts.CustomTransformers = {
	before: [
		polyfillPlugin(program, {
			polluting: {
				at: {
					Array: '@example/polyfills/array-at',
					String: '@example/polyfills/string-at'
				},
				includes: {
					Array: '@example/polyfills/array-includes',
					String: '@example/polyfills/string-includes'
				},
				name: {
					Function: '@example/polyfills/function-name'
				},
				finally: {
					Promise: '@example/polyfills/promise-finally'
				}
			}
		})
	]
};

program.emit(undefined, undefined, undefined, undefined, transformers);
```

### With Rollup

```javascript
// rollup.config.js
import typescript from '@rollup/plugin-typescript';
import polyfillPlugin from 'typescript-plugin-polyfill';

export default {
	// ...other options
	plugins: [
		typescript({
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
							}
						}
					})
				]
			})
		})
	]
};
```

### With Webpack

```javascript
// webpack.config.js
const polyfillPlugin = require('typescript-plugin-polyfill');

module.exports = {
	// ...other options
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				options: {
					getCustomTransformers: (program) => ({
						before: [
							polyfillPlugin(program, {
								polluting: {
									at: {
										Array: 'sky-core/polyfill/Array/prototype/at',
										String: 'sky-core/polyfill/String/prototype/at'
									}
								// ...more polyfill mappings
								}
							})
						]
					})
				}
			}
		]
	}
};
```

### With ts-patch/ttypescript

```json
{
	"compilerOptions": {
		"plugins": [
			{
				"transform": "typescript-plugin-polyfill",
				"polluting": {
					"at": {
						"Array": "sky-core/polyfill/Array/prototype/at",
						"String": "sky-core/polyfill/String/prototype/at"
					}
					// ...more polyfill mappings
				}
			}
		]
	}
}
```

## How It Works

1. Uses TypeScript's Transformer API to analyze source code at compile time
2. Leverages TypeScript's type system to determine the exact types of variables and expressions
3. Based on the type information, precisely identifies which polyfills are needed
4. Injects import statements for only the required polyfills during the transformation phase

## Features

- Precise Analysis: Only imports polyfills actually used in the code
- Type-Aware: Uses TypeScript's type system for improved accuracy
- Configurable: Customizable mapping of methods to polyfill packages
- Lightweight: Only adds necessary code imports

## License

MIT
