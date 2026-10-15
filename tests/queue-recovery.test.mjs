import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const queue = await readFile(new URL("../src/10-task-queue.js", import.meta.url), "utf8");
const match = queue.match(/function ttqCenterTaskList\(\) \{[\s\S]*?\n\}/);

assert.ok(match, "ttqCenterTaskList must be present in the task queue");

test("centers the task queue in the current viewport and persists its position", () => {
  const queuePanel = {
    offsetWidth: 760,
    offsetHeight: 500,
    style: {},
    classList: { contains: () => false }
  };
  const saved = [];
  const context = {
    $id: (id) => id === "ttq_tasklist" ? queuePanel : null,
    setOption: (...args) => saved.push(args),
    window: { scrollX: 100, scrollY: 200, innerWidth: 1200, innerHeight: 800 }
  };

  vm.runInNewContext(`${match[0]}\nthis.centerTaskList = ttqCenterTaskList;`, context);
  assert.equal(context.centerTaskList(), true);
  assert.equal(queuePanel.style.left, "320px");
  assert.equal(queuePanel.style.top, "350px");
  assert.deepEqual(saved, [["LIST_POSITION", "350px_320px"]]);
});
