import { watch } from "node:fs";
import { build } from "./build.mjs";

let rebuilding = false;
let queued = false;

async function rebuild() {
  if (rebuilding) {
    queued = true;
    return;
  }

  rebuilding = true;
  try {
    await build();
    console.log("Rebuilt dist/ttq.user.js");
  } catch (error) {
    console.error(error);
  } finally {
    rebuilding = false;
    if (queued) {
      queued = false;
      rebuild();
    }
  }
}

await rebuild();
watch(new URL("../src", import.meta.url), { recursive: true }, rebuild);
console.log("Watching src/ for changes. Press Ctrl+C to stop.");
