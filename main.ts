// news-image-20261123: the entry is the committed entry.png beside this file.
// The program validates it and copies it to /output/entry.png. It never
// renders or downloads anything at grade time: the judge sees exactly the
// bytes committed. (Node 22, standard library only.)
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { join } from 'node:path';

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const src = new URL('./entry.png', import.meta.url);
const MAX_BYTES = 1048576;
const MAX_SIDE = 1024;

if (!existsSync(src)) throw new Error('entry.png missing beside main.ts');
const buf = readFileSync(src);
if (buf.length > MAX_BYTES) {
  throw new Error(`entry.png is ${buf.length} bytes, over the 1 MiB cap`);
}
if (
  !buf
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
) {
  throw new Error('entry.png is not a PNG');
}
const width = buf.readUInt32BE(16);
const height = buf.readUInt32BE(20);
if (width > MAX_SIDE || height > MAX_SIDE) {
  throw new Error(`entry.png is ${width}x${height}, over the 1024x1024 cap`);
}
// A whole image ends with the IEND chunk: four zero length bytes, "IEND",
// then its CRC. A truncated file fails here instead of reaching the judge.
const tail = buf.subarray(buf.length - 12);
if (
  tail.readUInt32BE(0) !== 0 ||
  tail.subarray(4, 8).toString('ascii') !== 'IEND'
) {
  throw new Error('entry.png is truncated: no IEND chunk at the end');
}

// Never remove the output directory itself: on the grader it is a mount
// point and removing it fails. Empty its contents only.
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) {
  rmSync(join(outDir, f), { recursive: true, force: true });
}

const dest = join(outDir, 'entry.png');
copyFileSync(src, dest);
const back = readFileSync(dest);
if (!back.equals(buf)) throw new Error('entry.png did not copy byte for byte');
console.log(`wrote entry.png (${width}x${height}, ${buf.length} bytes)`);
