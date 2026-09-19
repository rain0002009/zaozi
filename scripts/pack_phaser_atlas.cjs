const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'E:/workspace/zaozi/art/characters/ren/source';
const OUT_DIR = 'E:/workspace/zaozi/public/assets/characters/ren';

async function packAtlas() {
  const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'));

  // 1. Read each image and calculate non-transparent bounding box
  const sprites = [];
  for (const f of files) {
    const filePath = path.join(SOURCE_DIR, f);
    const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
    const w = info.width, h = info.height;

    let minX = w, maxX = -1, minY = h, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const a = data[(y * w + x) * 4 + 3];
        if (a > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) {
      console.warn(`Warning: empty sprite ${f}`);
      minX = 0; maxX = 0; minY = 0; maxY = 0;
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    // Extract trimmed buffer
    const croppedBuffer = await sharp(filePath)
      .extract({ left: minX, top: minY, width: cropW, height: cropH })
      .toBuffer();

    // Determine pivot: weapon uses handle anchor (38, 128), character parts use root anchor (128, 164)
    const isWeapon = f.includes('weapon');
    const anchorX = isWeapon ? 38 : 128;
    const anchorY = isWeapon ? 128 : 164;

    sprites.push({
      name: f,
      minX,
      minY,
      width: cropW,
      height: cropH,
      sourceWidth: w,
      sourceHeight: h,
      anchorX,
      anchorY,
      buffer: croppedBuffer
    });
  }

  // Sort by height descending for efficient packing
  sprites.sort((a, b) => b.height - a.height);

  // 2. Simple Shelf Packing into 512x512
  const atlasSize = 512;
  const padding = 2;
  let currentX = padding;
  let currentY = padding;
  let rowHeight = 0;

  const compositeInputs = [];
  const framesJson = {};

  for (const s of sprites) {
    if (currentX + s.width + padding > atlasSize) {
      currentX = padding;
      currentY += rowHeight + padding;
      rowHeight = 0;
    }

    if (currentY + s.height + padding > atlasSize) {
      throw new Error(`Atlas size ${atlasSize} exceeded!`);
    }

    const frameX = currentX;
    const frameY = currentY;

    compositeInputs.push({
      input: s.buffer,
      left: frameX,
      top: frameY
    });

    framesJson[s.name] = {
      frame: { x: frameX, y: frameY, w: s.width, h: s.height },
      rotated: false,
      trimmed: true,
      spriteSourceSize: { x: s.minX, y: s.minY, w: s.width, h: s.height },
      sourceSize: { w: s.sourceWidth, h: s.sourceHeight },
      pivot: { x: Number((s.anchorX / s.sourceWidth).toFixed(6)), y: Number((s.anchorY / s.sourceHeight).toFixed(6)) },
      anchor: { x: s.anchorX, y: s.anchorY }
    };

    currentX += s.width + padding;
    if (s.height > rowHeight) {
      rowHeight = s.height;
    }
  }

  // 3. Render atlas PNG
  const atlasBuffer = await sharp({
    create: {
      width: atlasSize,
      height: atlasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
  .composite(compositeInputs)
  .png()
  .toBuffer();

  const atlasPngPath = path.join(OUT_DIR, 'ren.png');
  const atlasJsonPath = path.join(OUT_DIR, 'ren.json');

  await sharp(atlasBuffer).toFile(atlasPngPath);

  const atlasData = {
    frames: framesJson,
    meta: {
      app: 'Zaozi Character Atlas Packer',
      version: '1.0',
      image: 'ren.png',
      format: 'RGBA8888',
      size: { w: atlasSize, h: atlasSize },
      scale: '1'
    }
  };

  fs.writeFileSync(atlasJsonPath, JSON.stringify(atlasData, null, 2), 'utf-8');
  console.log(`Atlas successfully created:`);
  console.log(`- ${atlasPngPath}`);
  console.log(`- ${atlasJsonPath}`);
  console.log(`Packed ${sprites.length} sprites into ${atlasSize}x${atlasSize} texture.`);
}

packAtlas().catch(err => {
  console.error(err);
  process.exit(1);
});
