const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

async function main() {
  const root = path.join('art', 'characters', 'ren');
  const original = path.join(root, 'reference', 'ren_front_forearm_front_original.png');
  const forearm = path.join(root, 'source', 'ren_front_forearm_front.png');
  try {
    await fs.access(original);
  } catch {
    await fs.copyFile(forearm, original);
  }

  const { data, info } = await sharp(original).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sleeve = Buffer.from(data);
  const hand = Buffer.from(data);
  for (let y = 0; y < info.height; y += 1) {
    const start = y * info.width * 4;
    const end = start + info.width * 4;
    if (y >= 148) sleeve.fill(0, start, end);
    else hand.fill(0, start, end);
  }

  const encode = (pixels) => sharp(pixels, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const [sleevePng, handPng] = await Promise.all([encode(sleeve), encode(hand)]);
  for (const directory of [path.join(root, 'source'), path.join('public', 'assets', 'characters', 'ren', 'source')]) {
    await fs.writeFile(path.join(directory, 'ren_front_forearm_front.png'), sleevePng);
    await fs.writeFile(path.join(directory, 'ren_hand_front.png'), handPng);
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
