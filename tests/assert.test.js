const fs = require("fs");
const assert = require('assert');

describe("assert", function() {
	it("strictEqual", function() {
		// 验证输出
		assert.strictEqual("1", "1");
	});
});
