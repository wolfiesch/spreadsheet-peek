import { readFile, writeFile } from "node:fs/promises";

const files = ["dist/server.js", "dist/viewer/index.html"];

for (const file of files) {
  const text = await readFile(file, "utf8");
  const cleaned = text.replace(/[ \t]+$/gm, "");
  if (cleaned !== text) {
    await writeFile(file, cleaned);
  }
}
