const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const source = path.join('art', 'characters', 'ren', 'source', 'ren_body_front.png');
  const runtime = path.join('public', 'assets', 'characters', 'ren', 'source', 'ren_body_front.png');
  const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // A remnant of the original hand sits outside the body and moves as a stray speck.
  for (let y = 163; y <= 169; y += 1) {
    for (let x = 156; x <= 171; x += 1) {
      data.fill(0, (y * info.width + x) * 4, (y * info.width + x + 1) * 4);
    }
  }

  const png = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  await Promise.all([fs.writeFile(source, png), fs.writeFile(runtime, png)]);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
