var arr: string[];
console.log(arr.at(-1));

interface String<T> {
	at(index: number): T | undefined;
}
var str: String<any>;
console.log(str.at(-1));
