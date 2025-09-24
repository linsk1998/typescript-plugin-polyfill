var str: string;
console.log(str.at(-1));

interface Array<T> {
	at(index: number): T | undefined;
}
var arr: Array<any>;
console.log(arr.at(-1));
