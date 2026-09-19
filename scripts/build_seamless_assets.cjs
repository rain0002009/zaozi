const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'E:/workspace/zaozi/art/characters/ren/source';
const REF_DIR = 'E:/workspace/zaozi/art/characters/ren/reference';

async function buildSeamlessAssets() {
  const scale = 146.0 / 512.0;
  const w = 256, h = 256;

  // Base canvases from turnaround
  const frontCrop = await sharp(`${REF_DIR}/ren_turnaround_transparent.png`)
    .extract({ left: 50, top: 100, width: 496, height: 550 })
    .resize(Math.round(496 * scale), Math.round(550 * scale))
    .toBuffer();
  const frontLeft = Math.round(128 - (298 - 50) * scale);
  const frontTop = Math.round(60 - (123 - 100) * scale);
  const frontCanvas = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: frontCrop, left: frontLeft, top: frontTop }]).raw().toBuffer({ resolveWithObject: true });

  const backCrop = await sharp(`${REF_DIR}/ren_turnaround_transparent.png`)
    .extract({ left: 540, top: 100, width: 440, height: 550 })
    .resize(Math.round(440 * scale), Math.round(550 * scale))
    .toBuffer();
  const backLeft = Math.round(128 - (715 - 540) * scale);
  const backTop = Math.round(60 - (123 - 100) * scale);
  const backCanvas = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: backCrop, left: backLeft, top: backTop }]).raw().toBuffer({ resolveWithObject: true });

  const sideCrop = await sharp(`${REF_DIR}/ren_turnaround_transparent.png`)
    .extract({ left: 1030, top: 100, width: 270, height: 550 })
    .flop()
    .resize(Math.round(270 * scale), Math.round(550 * scale))
    .toBuffer();
  const sideLeft = Math.round(128 - 185 * scale);
  const sideTop = Math.round(60 - 23 * scale);
  const sideCanvas = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{ input: sideCrop, left: sideLeft, top: sideTop }]).raw().toBuffer({ resolveWithObject: true });

  const createBuf = () => new Uint8Array(w * h * 4);
  const copyPixel = (src, dst, idx) => {
    dst[idx] = src[idx];
    dst[idx + 1] = src[idx + 1];
    dst[idx + 2] = src[idx + 2];
    dst[idx + 3] = src[idx + 3];
  };

  const setPixelColor = (dst, idx, r, g, b, a) => {
    dst[idx] = r;
    dst[idx + 1] = g;
    dst[idx + 2] = b;
    dst[idx + 3] = a;
  };

  // ====================================================
  // 1. FRONT VIEW ASSETS
  // ====================================================
  const fd = frontCanvas.data;
  const headFront = createBuf();
  const bodyFront = createBuf();
  const frontUpperArmFront = createBuf();
  const frontForearmFront = createBuf();
  const rearArmFront = createBuf();

  // (1.1) Head Front: Y <= 101, neck to 103
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;
      if (y <= 101 || (y <= 103 && Math.abs(x - 128) <= 8)) {
        copyPixel(fd, headFront, idx);
      }
    }
  }

  // (1.2) Front Forearm & Hand:
  // Clean hand at (166, 153), cuff at (164, 137)
  for (let y = 142; y <= 165; y++) {
    for (let x = 154; x <= 180; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;
      const r = fd[idx], g = fd[idx + 1], b = fd[idx + 2];
      const isSkin = (r > 200 && g > 185 && b > 165);
      if (isSkin || y >= 148) {
        copyPixel(fd, frontForearmFront, idx);
      }
    }
  }
  // Add elbow joint cap at (164, 137)
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      if (dx * dx + dy * dy <= 36) {
        const x = 164 + dx;
        const y = 137 + dy;
        const idx = (y * w + x) * 4;
        if (fd[idx + 3] > 0) copyPixel(fd, frontForearmFront, idx);
      }
    }
  }

  // (1.3) Front Upper Arm & Sleeve:
  // Sleeve covers from shoulder (148, 112) down to cuff around Y=146.
  for (let y = 104; y <= 147; y++) {
    for (let x = 136; x <= 176; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;
      if (frontForearmFront[idx + 3] > 0 && y >= 146) continue;

      let innerX = 138;
      if (y >= 120) innerX = 140;
      if (y >= 130) innerX = 142;
      if (y >= 140) innerX = 144;

      if (x >= innerX) {
        copyPixel(fd, frontUpperArmFront, idx);
      }
    }
  }
  // Rounded shoulder cap around (148, 112) with full robe color
  const shoulderRadius = 12;
  for (let dy = -shoulderRadius; dy <= shoulderRadius; dy++) {
    for (let dx = -shoulderRadius; dx <= shoulderRadius; dx++) {
      if (dx * dx + dy * dy <= shoulderRadius * shoulderRadius) {
        const x = 148 + dx;
        const y = 112 + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const idx = (y * w + x) * 4;
          if (frontUpperArmFront[idx + 3] === 0 && fd[idx + 3] > 0) {
            copyPixel(fd, frontUpperArmFront, idx);
          }
        }
      }
    }
  }

  // (1.4) Front Body (Torso & Legs):
  // Completely solid from collar (101) to hem (162), and legs down to (206)
  // Robe left contour ~ 106, right contour ~ 150.
  for (let y = 101; y <= 206; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;

      if (y <= 162) {
        // Torso: include all pixels between left contour and right contour
        if (x >= 106 && x <= 150) {
          copyPixel(fd, bodyFront, idx);
        }
      } else {
        // Legs below hem: left leg down to 96, right leg down to 160
        // Exclude any stray pixels outside leg sweeps
        if (x >= 80 && x <= 175) {
          copyPixel(fd, bodyFront, idx);
        }
      }
    }
  }

  // (1.5) Rear Arm Front: Clean mirror of front upper arm & forearm
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = 128 + (128 - x);
      if (srcX >= 0 && srcX < w) {
        const srcIdx = (y * w + srcX) * 4;
        const dstIdx = (y * w + x) * 4;
        if (frontUpperArmFront[srcIdx + 3] > 0) {
          copyPixel(frontUpperArmFront, rearArmFront, dstIdx);
        } else if (frontForearmFront[srcIdx + 3] > 0) {
          copyPixel(frontForearmFront, rearArmFront, dstIdx);
        }
      }
    }
  }

  // ====================================================
  // 2. BACK VIEW ASSETS
  // ====================================================
  const bd = backCanvas.data;
  const headBack = createBuf();
  const bodyBack = createBuf();
  const frontUpperArmBack = createBuf();
  const frontForearmBack = createBuf();
  const rearArmBack = createBuf();

  // (2.1) Head Back
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (bd[idx + 3] === 0) continue;
      if (y <= 101 || (y <= 103 && Math.abs(x - 128) <= 8)) {
        copyPixel(bd, headBack, idx);
      }
    }
  }

  // (2.2) Body Back: Solid torso from collar to hem (162), and legs to 206
  for (let y = 101; y <= 206; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (bd[idx + 3] === 0) continue;

      if (y <= 162) {
        if (x >= 106 && x <= 150) {
          copyPixel(bd, bodyBack, idx);
        }
      } else {
        if (x >= 80 && x <= 175) {
          copyPixel(bd, bodyBack, idx);
        }
      }
    }
  }

  // (2.3) Arms Back:
  // Front arm holding weapon is on viewer's left (shoulder 108, 112)
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

  // Rear arm seen from behind is on viewer's right (shoulder 148, 112)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (frontUpperArmFront[idx + 3] > 0 || frontForearmFront[idx + 3] > 0) {
        copyPixel(frontUpperArmFront[idx + 3] > 0 ? frontUpperArmFront : frontForearmFront, rearArmBack, idx);
      }
    }
  }

  // ====================================================
  // 3. SIDE VIEW ASSETS (Facing Right)
  // ====================================================
  const sd = sideCanvas.data;
  const headSide = createBuf();
  const bodySide = createBuf();
  const frontUpperArmSide = createBuf();
  const frontForearmSide = createBuf();
  const rearArmSide = createBuf();

  // (3.1) Head Side: profile facing right, 1 eye dot
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] === 0) continue;
      if (y <= 101 || (y <= 103 && Math.abs(x - 128) <= 8)) {
        copyPixel(sd, headSide, idx);
      }
    }
  }

  // (3.2) Side Body: Complete side torso and legs down to Y=206
  // Clean of old backward knife at X < 105
  for (let y = 101; y <= 206; y++) {
    for (let x = 106; x <= 145; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] === 0) continue;
      copyPixel(sd, bodySide, idx);
    }
  }

  // Fill in complete side body under arm so rotating arm doesn't reveal transparent void
  for (let y = 108; y <= 150; y++) {
    for (let x = 110; x <= 140; x++) {
      const idx = (y * w + x) * 4;
      if (bodySide[idx + 3] === 0 && sd[idx + 3] > 0) {
        copyPixel(sd, bodySide, idx);
      }
    }
  }

  // (3.3) Side Front Upper Arm & Sleeve:
  // Shoulder at (137, 111), elbow at (156, 135)
  for (let y = 104; y <= 142; y++) {
    for (let x = 126; x <= 165; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] === 0) continue;
      const r = sd[idx], g = sd[idx + 1], b = sd[idx + 2];
      const isSkin = (r > 200 && g > 185 && b > 165);
      if (!isSkin) {
        copyPixel(sd, frontUpperArmSide, idx);
      }
    }
  }
  // Rounded shoulder cap at (137, 111)
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -10; dx <= 10; dx++) {
      if (dx * dx + dy * dy <= 100) {
        const x = 137 + dx;
        const y = 111 + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const idx = (y * w + x) * 4;
          if (sd[idx + 3] > 0) copyPixel(sd, frontUpperArmSide, idx);
        }
      }
    }
  }

  // (3.4) Side Front Forearm & Hand:
  // Elbow at (156, 135), Grip at (170, 148)
  for (let y = 134; y <= 160; y++) {
    for (let x = 152; x <= 178; x++) {
      const idx = (y * w + x) * 4;
      // Use clean hand from front view shifted to (170, 148)
      // Front hand grip is at (172, 153), side grip is at (170, 148) => dx = -2, dy = -5
      const srcX = x + 2;
      const srcY = y + 5;
      if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
        const srcIdx = (srcY * w + srcX) * 4;
        if (frontForearmFront[srcIdx + 3] > 0) {
          copyPixel(frontForearmFront, frontForearmSide, idx);
        }
      }
    }
  }
  // Add elbow cap at (156, 135)
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx + dy * dy <= 25) {
        const x = 156 + dx;
        const y = 135 + dy;
        const idx = (y * w + x) * 4;
        if (frontUpperArmSide[idx + 3] > 0) copyPixel(frontUpperArmSide, frontForearmSide, idx);
      }
    }
  }

  // (3.5) Side Rear Arm: shoulder at (121, 111)
  for (let y = 106; y <= 140; y++) {
    for (let x = 112; x <= 126; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] > 0) {
        copyPixel(sd, rearArmSide, idx);
      }
    }
  }

  // ====================================================
  // 4. WRITE ALL 15 SOURCE FILES (256x256 RGBA PNG)
  // ====================================================
  const allParts = [
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

  for (const part of allParts) {
    const filePath = path.join(SOURCE_DIR, part.name);
    await sharp(part.data, { raw: { width: w, height: h, channels: 4 } })
      .png()
      .toFile(filePath);
    console.log(`Saved seamless ${part.name}`);
  }

  console.log('All seamless modular source assets written successfully.');
}

buildSeamlessAssets().catch(err => {
  console.error(err);
  process.exit(1);
});
