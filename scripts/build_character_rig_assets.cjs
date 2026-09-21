const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'art', 'characters', 'ren', 'source');
const runtimeDir = path.join(projectRoot, 'public', 'assets', 'characters', 'ren', 'source');
const parts = [
  'ren_rear_thigh_side.png',
  'ren_rear_shin_side.png',
  'ren_rear_foot_side.png',
  'ren_rear_arm_side.png',
  'ren_torso_side.png',
  'ren_head_side.png',
  'ren_front_thigh_side.png',
  'ren_front_shin_side.png',
  'ren_front_foot_side.png',
  'ren_garment_hem_side.png',
  'ren_weapon_upper_arm_side.png',
  'ren_weapon_forearm_side.png',
  'ren_weapon_hand_side.png',
  'ren_weapon_knife.png',
];

function bleedTransparentRgb(data, width, height, passes = 6) {
  let current = Buffer.from(data);
  let filled = Uint8Array.from({ length: width * height }, (_, index) => current[index * 4 + 3] > 0 ? 1 : 0);
  for (let pass = 0; pass < passes; pass += 1) {
    const next = Buffer.from(current);
    const nextFilled = Uint8Array.from(filled);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const index = (y * width + x) * 4;
        if (filled[y * width + x]) continue;
        const neighbours = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]];
        const source = neighbours.find(([nx, ny]) => {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
          return filled[ny * width + nx] === 1;
        });
        if (!source) continue;
        const sourceIndex = (source[1] * width + source[0]) * 4;
        next[index] = current[sourceIndex];
        next[index + 1] = current[sourceIndex + 1];
        next[index + 2] = current[sourceIndex + 2];
        nextFilled[y * width + x] = 1;
      }
    }
    current = next;
    filled = nextFilled;
  }
  return current;
}

async function readRaw(file, directory, size) {
  return sharp(path.join(directory, file))
    .resize(size, size, { fit: 'fill', kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

async function publishRuntimeAssets() {
  await fs.mkdir(runtimeDir, { recursive: true });
  await Promise.all(parts.map(async (file) => {
    const source = await readRaw(file, sourceDir, 256);
    const pixels = bleedTransparentRgb(source.data, source.info.width, source.info.height);
    await sharp(pixels, { raw: { width: 256, height: 256, channels: 4 } })
      .png()
      .toFile(path.join(runtimeDir, file));
  }));
}

async function main() {
  await publishRuntimeAssets();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
