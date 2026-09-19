const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'E:/workspace/zaozi/art/characters/ren/source';
const REF_DIR = 'E:/workspace/zaozi/art/characters/ren/reference';

async function main() {
  const scale = 146.0 / 512.0;

  // 1. Prepare base transparent 256x256 canvases for Front, Back, Side
  // Front
  const frontCrop = await sharp(`${REF_DIR}/ren_turnaround_transparent.png`)
    .extract({ left: 50, top: 100, width: 496, height: 550 })
    .resize(Math.round(496 * scale), Math.round(550 * scale))
    .toBuffer();
  const frontLeft = Math.round(128 - (298 - 50) * scale);
  const frontTop = Math.round(60 - (123 - 100) * scale);
  const frontCanvas = await sharp({
    create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: frontCrop, left: frontLeft, top: frontTop }]).raw().toBuffer({ resolveWithObject: true });

  // Back
  const backCrop = await sharp(`${REF_DIR}/ren_turnaround_transparent.png`)
    .extract({ left: 540, top: 100, width: 440, height: 550 })
    .resize(Math.round(440 * scale), Math.round(550 * scale))
    .toBuffer();
  const backLeft = Math.round(128 - (715 - 540) * scale);
  const backTop = Math.round(60 - (123 - 100) * scale);
  const backCanvas = await sharp({
    create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: backCrop, left: backLeft, top: backTop }]).raw().toBuffer({ resolveWithObject: true });

  // Side (flop to face right)
  const sideCrop = await sharp(`${REF_DIR}/ren_turnaround_transparent.png`)
    .extract({ left: 1030, top: 100, width: 270, height: 550 })
    .flop()
    .resize(Math.round(270 * scale), Math.round(550 * scale))
    .toBuffer();
  const sideLeft = Math.round(128 - 185 * scale);
  const sideTop = Math.round(60 - 23 * scale);
  const sideCanvas = await sharp({
    create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: sideCrop, left: sideLeft, top: sideTop }]).raw().toBuffer({ resolveWithObject: true });

  const w = 256, h = 256;

  // Helper to create empty 256x256 RGBA buffer
  const createBuf = () => new Uint8Array(w * h * 4);
  const copyPixel = (srcData, dstData, idx) => {
    dstData[idx] = srcData[idx];
    dstData[idx + 1] = srcData[idx + 1];
    dstData[idx + 2] = srcData[idx + 2];
    dstData[idx + 3] = srcData[idx + 3];
  };

  // ==========================================
  // 1. FRONT VIEW PARTS
  // ==========================================
  const frontData = frontCanvas.data;
  const headFront = createBuf();
  const bodyFront = createBuf();
  const frontUpperArmFront = createBuf();
  const frontForearmFront = createBuf();
  const rearArmFront = createBuf();

  // (A) Front Head: Y <= 102, neck base down to 104 in center
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = frontData[idx + 3];
      if (a === 0) continue;

      if (y <= 101) {
        copyPixel(frontData, headFront, idx);
      } else if (y <= 104 && Math.abs(x - 128) <= 8) {
        copyPixel(frontData, headFront, idx);
      }
    }
  }

  // (B) Front Arm (viewer right): upper arm & sleeve (X in [138, 175], Y in [104, 148])
  // Forearm & hand (X in [154, 175], Y in [138, 162])
  for (let y = 104; y < h; y++) {
    for (let x = 138; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = frontData[idx + 3];
      if (a === 0) continue;

      const r = frontData[idx], g = frontData[idx + 1], b = frontData[idx + 2];
      const isWarmHand = (r > 200 && g > 185 && b > 165);

      if (y >= 148 || (y >= 138 && x >= 156 && isWarmHand)) {
        // Hand & forearm
        copyPixel(frontData, frontForearmFront, idx);
      } else if (y <= 147) {
        // Upper arm & sleeve
        copyPixel(frontData, frontUpperArmFront, idx);
        // Include elbow joint overlap in both so rotation doesn't gap
        if (y >= 136 && x >= 156) {
          copyPixel(frontData, frontForearmFront, idx);
        }
      }
    }
  }

  // (C) Front Body: Torso & Legs
  for (let y = 102; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = frontData[idx + 3];
      if (a === 0) continue;

      // Exclude front arm
      if (frontUpperArmFront[idx + 3] > 0 || frontForearmFront[idx + 3] > 0) continue;

      // Exclude old knife on lower left
      if (y <= 186 && x < 106) continue;
      // Exclude old hand on left if any
      if (y <= 158 && x < 112) continue;

      // Exclude any hand on right
      if (y <= 165 && x >= 155) continue;

      // Only include body torso and legs
      if (y <= 158) {
        if (x >= 110 && x <= 146) {
          copyPixel(frontData, bodyFront, idx);
        }
      } else {
        // Legs below Y=158
        if (y <= 206) {
          copyPixel(frontData, bodyFront, idx);
        }
      }
    }
  }

  // (D) Rear Arm (viewer left): Mirror the clean front arm across X=128
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = 128 + (128 - x);
      if (srcX >= 0 && srcX < w) {
        const srcIdx = (y * w + srcX) * 4;
        const dstIdx = (y * w + x) * 4;
        const aUpper = frontUpperArmFront[srcIdx + 3];
        const aFore = frontForearmFront[srcIdx + 3];
        if (aUpper > 0) {
          copyPixel(frontUpperArmFront, rearArmFront, dstIdx);
        } else if (aFore > 0) {
          copyPixel(frontForearmFront, rearArmFront, dstIdx);
        }
      }
    }
  }

  // ==========================================
  // 2. BACK VIEW PARTS
  // ==========================================
  const backData = backCanvas.data;
  const headBack = createBuf();
  const bodyBack = createBuf();
  const frontUpperArmBack = createBuf();
  const frontForearmBack = createBuf();
  const rearArmBack = createBuf();

  // (A) Back Head
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = backData[idx + 3];
      if (a === 0) continue;
      if (y <= 101) {
        copyPixel(backData, headBack, idx);
      } else if (y <= 104 && Math.abs(x - 128) <= 8) {
        copyPixel(backData, headBack, idx);
      }
    }
  }

  // (B) Front Arm Back (viewer left, mirrored from front view clean arm)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = 128 + (128 - x);
      if (srcX >= 0 && srcX < w) {
        const srcIdx = (y * w + srcX) * 4;
        const dstIdx = (y * w + x) * 4;
        if (frontUpperArmFront[srcIdx + 3] > 0) {
          copyPixel(frontUpperArmFront, frontUpperArmBack, dstIdx);
        }
        if (frontForearmFront[srcIdx + 3] > 0) {
          copyPixel(frontForearmFront, frontForearmBack, dstIdx);
        }
      }
    }
  }

  // (C) Rear Arm Back (viewer right)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (frontUpperArmFront[idx + 3] > 0 || frontForearmFront[idx + 3] > 0) {
        copyPixel(frontUpperArmFront[idx + 3] > 0 ? frontUpperArmFront : frontForearmFront, rearArmBack, idx);
      }
    }
  }

  // (D) Back Body
  for (let y = 102; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = backData[idx + 3];
      if (a === 0) continue;

      if (x < 110 && y <= 158) continue;
      if (x > 146 && y <= 158) continue;
      if (x > 145 && y <= 185) continue;

      if (y <= 206) {
        copyPixel(backData, bodyBack, idx);
      }
    }
  }

  // ==========================================
  // 3. SIDE VIEW PARTS (facing right)
  // ==========================================
  const sideData = sideCanvas.data;
  const headSide = createBuf();
  const bodySide = createBuf();
  const frontUpperArmSide = createBuf();
  const frontForearmSide = createBuf();
  const rearArmSide = createBuf();

  // (A) Side Head
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = sideData[idx + 3];
      if (a === 0) continue;
      if (y <= 101) {
        copyPixel(sideData, headSide, idx);
      } else if (y <= 104 && Math.abs(x - 128) <= 8) {
        copyPixel(sideData, headSide, idx);
      }
    }
  }

  // (B) Side Front Arm
  for (let y = 104; y <= 160; y++) {
    for (let x = 125; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = sideData[idx + 3];
      if (a === 0) continue;

      if (y >= 140 && x >= 152) {
        copyPixel(sideData, frontForearmSide, idx);
      } else if (y <= 145 && x >= 130 && x <= 165) {
        copyPixel(sideData, frontUpperArmSide, idx);
        if (y >= 134 && x >= 148) {
          copyPixel(sideData, frontForearmSide, idx);
        }
      }
    }
  }

  // (C) Side Rear Arm
  for (let y = 106; y <= 142; y++) {
    for (let x = 112; x <= 126; x++) {
      const idx = (y * w + x) * 4;
      if (sideData[idx + 3] > 0) {
        copyPixel(sideData, rearArmSide, idx);
      }
    }
  }

  // (D) Side Body
  for (let y = 102; y <= 206; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const a = sideData[idx + 3];
      if (a === 0) continue;

      if (frontUpperArmSide[idx + 3] > 0 || frontForearmSide[idx + 3] > 0) continue;
      if (y >= 140 && y <= 160 && x > 152) continue;

      copyPixel(sideData, bodySide, idx);
    }
  }

  // ==========================================
  // 4. WRITE ALL SOURCE FILES (256x256 RGBA PNG)
  // ==========================================
  const filesToWrite = [
    { name: 'ren_head_front.png', data: headFront },
    { name: 'ren_body_front.png', data: bodyFront },
    { name: 'ren_rear_arm_front.png', data: rearArmFront },
    { name: 'ren_front_upper_arm_front.png', data: frontUpperArmFront },
    { name: 'ren_front_forearm_front.png', data: frontForearmFront },

    { name: 'ren_head_back.png', data: headBack },
    { name: 'ren_body_back.png', data: bodyBack },
    { name: 'ren_rear_arm_back.png', data: rearArmBack },
    { name: 'ren_front_upper_arm_back.png', data: frontUpperArmBack },
    { name: 'ren_front_forearm_back.png', data: frontForearmBack },

    { name: 'ren_head_side.png', data: headSide },
    { name: 'ren_body_side.png', data: bodySide },
    { name: 'ren_rear_arm_side.png', data: rearArmSide },
    { name: 'ren_front_upper_arm_side.png', data: frontUpperArmSide },
    { name: 'ren_front_forearm_side.png', data: frontForearmSide },
  ];

  for (const item of filesToWrite) {
    const filePath = path.join(SOURCE_DIR, item.name);
    await sharp(item.data, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toFile(filePath);
    console.log(`Saved ${item.name}`);
  }

  console.log('All character source PNGs generated successfully!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
