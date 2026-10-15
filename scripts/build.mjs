import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputFile = resolve(projectRoot, "dist/ttq.user.js");

export const sourceFiles = [
  "src/00-metadata.js",
  "src/01-bootstrap.js",
  "src/10-task-queue.js",
  "src/11-history.js",
  "src/20-build.js",
  "src/21-research.js",
  "src/22-party.js",
  "src/23-troops.js",
  "src/24-training.js",
  "src/25-demolish.js",
  "src/26-merchants.js",
  "src/30-timer-form.js",
  "src/31-drag-and-drop.js",
  "src/40-game-data.js",
  "src/41-ui-helpers.js",
  "src/42-menu.js",
  "src/99-runtime.js"
];

export async function build() {
  const sources = await Promise.all(
    sourceFiles.map(async (sourceFile) => {
      const contents = await readFile(resolve(projectRoot, sourceFile), "utf8");
      return contents;
    })
  );

  if (!sources[0].startsWith("// ==UserScript==")) {
    throw new Error("src/00-metadata.js must begin with the Tampermonkey metadata block.");
  }

  await mkdir(resolve(projectRoot, "dist"), { recursive: true });
  await writeFile(outputFile, sources.join(""), "utf8");
  return outputFile;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = await build();
  if (process.argv.includes("--check")) {
    await import("node:child_process").then(
      ({ execFileSync }) => execFileSync(process.execPath, ["--check", file], { stdio: "inherit" })
    );
  }
  console.log(`Built ${outputFile.replace(`${projectRoot}/`, "")}`);
}
