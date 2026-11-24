// news-image-20261123 v2: the entry is the committed entry.png beside this
// file. The program checks the image is a whole PNG inside the size caps
// and copies it to /output/entry.png. It never draws or downloads anything
// at grade time, so the judge sees exactly the bytes committed.
// (Node 22, standard library only.)
// The front page itself lives in entry.png; this file only checks it and copies it.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const BYTE_CAP = 1048576;
const SIDE_CAP = 1024;

function fail(message) {
  throw new Error(message);
}

const imagePath = new URL("./entry.png", import.meta.url);
if (!existsSync(imagePath)) fail("entry.png missing beside main.ts");
const image = readFileSync(imagePath);
if (image.length > BYTE_CAP) {
  fail(`entry.png is ${image.length} bytes, over the 1 MiB cap`);
}
if (!image.subarray(0, 8).equals(Buffer.from(PNG_MAGIC))) {
  fail("entry.png is not a PNG");
}
const width = image.readUInt32BE(16);
const height = image.readUInt32BE(20);
if (width > SIDE_CAP || height > SIDE_CAP) {
  fail(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
}
// A whole PNG ends with the IEND chunk: a zero length, the letters IEND,
// then its CRC. A truncated file fails here instead of reaching the judge.
const lastChunk = image.subarray(image.length - 12);
if (lastChunk.readUInt32BE(0) !== 0 || lastChunk.subarray(4, 8).toString("ascii") !== "IEND") {
  fail("entry.png is truncated: no IEND chunk at the end");
}

// Never remove the output directory itself: on the grader it is a mount
// point and removing it fails. Empty its contents only.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
mkdirSync(outputDir, { recursive: true });
for (const name of readdirSync(outputDir)) {
  rmSync(join(outputDir, name), { recursive: true, force: true });
}

const destination = join(outputDir, "entry.png");
copyFileSync(imagePath, destination);
// A partial copy would fail the byte comparison below before the judge ever sees it.
const copied = readFileSync(destination);
if (!copied.equals(image)) fail("entry.png did not copy byte for byte");
console.log(`wrote entry.png (${width}x${height}, ${image.length} bytes)`);
