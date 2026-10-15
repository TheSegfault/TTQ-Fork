import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const helpers = await readFile(new URL("../src/41-ui-helpers.js", import.meta.url), "utf8");
const match = helpers.match(/function ttqIsSoloT1Unit\(troops\) \{[\s\S]*?\n\}/);
const queue = await readFile(new URL("../src/10-task-queue.js", import.meta.url), "utf8");
const guardMatch = queue.match(/function ttqBlockSoloT1Attack\(aTask\) \{[\s\S]*?\n\}/);

assert.ok(match, "ttqIsSoloT1Unit must be present in the shared helpers");
assert.ok(guardMatch, "ttqBlockSoloT1Attack must be present in the task queue");

const context = {};
context.logs = [];
context.history = [];
context._log = (...args) => context.logs.push(args);
context.printMsg = (...args) => context.logs.push(args);
context.addToHistory = (...args) => context.history.push(args);
context.getTaskDetails = () => "task details";
context.ttqBusyTask = 99;
vm.runInNewContext(`${match[0]}\n${guardMatch[0]}\nthis.isSoloT1 = ttqIsSoloT1Unit; this.blockSoloT1 = ttqBlockSoloT1Attack;`, context);

test("recognises exactly one tier-1 unit with no escort", () => {
  assert.equal(context.isSoloT1([4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), true);
});

test("allows a tier-1 unit when another unit escorts it", () => {
  assert.equal(context.isSoloT1([4, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]), false);
  assert.equal(context.isSoloT1([4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]), false);
});

test("allows non-solo tier-1 quantities and non-tier-1 waves", () => {
	assert.equal(context.isSoloT1([4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]), false);
	assert.equal(context.isSoloT1([4, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]), false);
});

test("cancels a queued solo tier-1 attack before it can send", () => {
	const task = ["2", "0", "123", "4_1_0_0_0_0_0_0_0_0_0_0"];
	assert.equal(context.blockSoloT1(task), true);
	assert.equal(context.ttqBusyTask, 0);
	assert.equal(context.history.length, 1);
	assert.match(context.history[0][2], /Tier-1 unit alone/);
});
