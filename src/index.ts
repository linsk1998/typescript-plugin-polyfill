import ts = require('typescript');


function isTypeGlobalType(type: ts.Type, typeName: string, program: ts.Program) {
	const symbol = type.getSymbol();
	if(!symbol) {
		return false;
	}
	if(symbol.getName() === typeName) {
		let declarations = symbol.getDeclarations();
		if(declarations == null) declarations = [];
		for(const declaration of declarations) {
			const sourceFile = declaration.getSourceFile();
			if(program.isSourceFileDefaultLibrary(sourceFile)) {
				return true;
			}
		}
	}

	if(symbol.flags & (ts.SymbolFlags.Class | ts.SymbolFlags.Interface)) {
		const checker = program.getTypeChecker();
		for(const baseType of checker.getBaseTypes(type as any)) {
			if(baseType.isUnion() || baseType.isIntersection()) {
				return baseType.types.some(type => isTypeGlobalType(type, typeName, program));
			}
			if(isTypeGlobalType(baseType, typeName, program)) {
				return true;
			}
		}
	}

	return false;
}
interface FlagsObject {
	flags: number;
}
function isFlagSet(obj: FlagsObject, flag: number) {
	return (obj.flags & flag) !== 0;
}

// 辅助函数：获取类型的基础类型名称
function getBaseTypeNames(program: ts.Program, type: ts.Type, typeNames: string[]): string[] {
	let r = new Set<string>();
	// 处理联合类型
	if(type.isUnion() || type.isIntersection()) {
		for(const subtype of type.types) {
			for(const typeName of getBaseTypeNames(program, subtype, typeNames)) {
				r.add(typeName);
			}
		}
		return Array.from(r);
	}
	if(type.flags === ts.TypeFlags.Any) {
		return typeNames;
	}
	for(let typeName of typeNames) {
		switch(typeName) {
			case 'String':
				if(isFlagSet(type, ts.TypeFlags.String | ts.TypeFlags.StringLiteral | ts.TypeFlags.StringLike)) {
					r.add(typeName);
				}
				break;
			case 'Number':
				if(isFlagSet(type, ts.TypeFlags.Number | ts.TypeFlags.NumberLiteral | ts.TypeFlags.NumberLike)) {
					r.add(typeName);
				}
				break;
			case 'Function':
				if(isFlagSet(type.getSymbol(), ts.SymbolFlags.Function | ts.SymbolFlags.Method)) {
					r.add(typeName);
				}
				break;
			default:
				if(isTypeGlobalType(type, typeName, program)) {
					r.add(typeName);
				}
		}
	}

	return Array.from(r);
}

interface PolyfillInjectorOptions {
	polluting?: Record<string, Record<string, string>>;
}

function transformerFactory(program: ts.Program, options: PolyfillInjectorOptions = {}): ts.TransformerFactory<ts.SourceFile> {
	const polluting = options.polluting || {};

	const typeChecker = program.getTypeChecker();

	return (context: ts.TransformationContext) => {
		return (sourceFile) => {
			// 收集所有import的依赖包
			const dependencies = new Set<string>();
			// 跟踪当前文件需要引入的polyfill
			const requiredPolyfills = new Set<string>();

			// 访问器：遍历AST并收集需要的polyfill
			const visitor: ts.Visitor = (node) => {
				if(ts.isImportDeclaration(node)) {
					const moduleSpecifier = node.moduleSpecifier;
					if(ts.isStringLiteral(moduleSpecifier)) {
						dependencies.add(moduleSpecifier.text);
					}
				} else if(ts.isPropertyAccessExpression(node)) {
					const methodName = node.name.text;
					const polyfillMap = polluting[methodName];
					if(polyfillMap) {
						let types = Object.keys(polyfillMap);
						types = getBaseTypeNames(program, typeChecker.getTypeAtLocation(node.expression), types);
						for(let typeName of types) {
							// 检查是否有对应的polyfill
							let packageName = polyfillMap[typeName];
							if(!requiredPolyfills.has(packageName) && !dependencies.has(packageName)) {
								requiredPolyfills.add(packageName);
							}
						}
					}
				} else if(ts.isVariableDeclaration(node)) {
					const { initializer, name } = node;
					if(ts.isObjectBindingPattern(name)) {
						for(const element of name.elements) {
							if(ts.isBindingElement(element)) {
								const { propertyName, name } = element;
								const methodName = propertyName ?
									(ts.isIdentifier(propertyName) ? propertyName.text : null) :
									(ts.isIdentifier(name) ? name.text : null);
								if(methodName) {
									const polyfillMap = polluting[methodName];
									if(polyfillMap) {
										let types = Object.keys(polyfillMap);
										types = getBaseTypeNames(program, typeChecker.getTypeAtLocation(initializer), types);
										for(let typeName of types) {
											// 检查是否有对应的polyfill
											let packageName = polyfillMap[typeName];
											if(!requiredPolyfills.has(packageName) && !dependencies.has(packageName)) {
												requiredPolyfills.add(packageName);
											}
										}
									}
								}
							}
						}
					}
				}
				// 继续遍历子节点
				return ts.visitEachChild(node, visitor, context);
			};

			// 先遍历整个文件，收集需要的polyfill
			ts.visitNode(sourceFile, visitor);

			// 如果没有需要引入的polyfill，直接返回原文件
			if(requiredPolyfills.size === 0) {
				return sourceFile;
			}

			// 创建polyfill导入声明
			const importStatements: ts.Statement[] = Array.from(requiredPolyfills).map(polyfill => {
				// ESM格式: import 'polyfill-module';
				return ts.factory.createImportDeclaration(
					undefined,
					undefined,
					ts.factory.createStringLiteral(polyfill),
					undefined
				);
			});

			// 创建新的源文件，将polyfill导入添加到顶部
			return ts.factory.updateSourceFile(
				sourceFile,
				[...importStatements, ...sourceFile.statements]
			);
		};
	};
}

transformerFactory.default = transformerFactory;
export = transformerFactory;
