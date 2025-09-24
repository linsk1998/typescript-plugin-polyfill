interface Array<T> {
	includes(item: T): boolean;
}

var str: string | Array<string>;
console.log(str.includes("1"));

interface String {
	at(n: number): string | undefined;
}

var arr: string[] | String;
console.log(arr.at(1));
