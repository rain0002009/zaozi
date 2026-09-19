const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'E:/workspace/zaozi/art/characters/ren/source';
const REF_DIR = 'E:/workspace/zaozi/art/characters/ren/reference';

async function buildProductionAssets() {
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

  // Helpers
  const createBuf = () => new Uint8Array(w * h * 4);
  const copyPixel = (src, dst, idx) => {
    dst[idx] = src[idx];
    dst[idx + 1] = src[idx + 1];
    dst[idx + 2] = src[idx + 2];
    dst[idx + 3] = src[idx + 3];
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

  // (1.1) Head Front: Y <= 101, neck to 104
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;
      if (y <= 101 || (y <= 104 && Math.abs(x - 128) <= 8)) {
        copyPixel(fd, headFront, idx);
      }
    }
  }

  // (1.2) Front Arm: Front Upper Arm & Sleeve (viewer right)
  // Shoulder at (148, 112), Elbow cuff at (164, 137)
  // Sleeve covers X in [138, 175], Y in [104, 148]
  for (let y = 104; y <= 148; y++) {
    for (let x = 138; x <= 175; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;

      // Check if hand (rice paper tone)
      const r = fd[idx], g = fd[idx + 1], b = fd[idx + 2];
      const isSkin = (r > 200 && g > 185 && b > 165);

      if (!isSkin) {
        copyPixel(fd, frontUpperArmFront, idx);
      }
    }
  }

  // Ensure shoulder cap at (148, 112) is rounded so rotation at shoulder looks solid
  const shoulderRadius = 10;
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

  // (1.3) Front Forearm & Hand:
  // Forearm emerges from sleeve cuff around (164, 137), hand reaches grip (177, 153)
  for (let y = 136; y <= 165; y++) {
    for (let x = 154; x <= 182; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;

      const r = fd[idx], g = fd[idx + 1], b = fd[idx + 2];
      const isSkin = (r > 200 && g > 185 && b > 165);

      if (isSkin || y >= 144) {
        copyPixel(fd, frontForearmFront, idx);
      }
    }
  }

  // Add elbow joint overlap inside frontForearm so when rotated at (164, 137) it stays connected
  const elbowRadius = 6;
  for (let dy = -elbowRadius; dy <= elbowRadius; dy++) {
    for (let dx = -elbowRadius; dx <= elbowRadius; dx++) {
      if (dx * dx + dy * dy <= elbowRadius * elbowRadius) {
        const x = 164 + dx;
        const y = 137 + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const idx = (y * w + x) * 4;
          if (frontUpperArmFront[idx + 3] > 0 && frontForearmFront[idx + 3] === 0) {
            copyPixel(frontUpperArmFront, frontForearmFront, idx);
          }
        }
      }
    }
  }

  // (1.4) Front Body: Torso & Legs
  // Torso: Y in [102, 158], X in [112, 144]
  // Legs: Y in [145, 206], left leg X in [88, 128], right leg X in [128, 168]
  // Completely clean of arms, hands, and old knife
  for (let y = 102; y <= 206; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;

      // Exclude arm zones
      if (frontUpperArmFront[idx + 3] > 0 || frontForearmFront[idx + 3] > 0) continue;

      // Exclude left knife area (X < 105 when Y <= 186)
      if (y <= 186 && x < 106) continue;
      // Exclude left hand area (X < 112 when Y <= 158)
      if (y <= 158 && x < 112) continue;
      // Exclude right hand area (X >= 154 when Y <= 165)
      if (y <= 165 && x >= 154) continue;

      if (y <= 158) {
        // Torso
        if (x >= 110 && x <= 146) {
          copyPixel(fd, bodyFront, idx);
        }
      } else {
        // Legs
        copyPixel(fd, bodyFront, idx);
      }
    }
  }

  // Fill in smooth shoulder contours on the body torso so arm rotation doesn't reveal transparent void
  const bodyShoulderRadius = 7;
  for (let [sx, sy] of [[108, 112], [148, 112]]) {
    for (let dy = -bodyShoulderRadius; dy <= bodyShoulderRadius; dy++) {
      for (let dx = -bodyShoulderRadius; dx <= bodyShoulderRadius; dx++) {
        if (dx * dx + dy * dy <= bodyShoulderRadius * bodyShoulderRadius) {
          const x = sx + dx;
          const y = sy + dy;
          if (x >= 110 && x <= 146 && y >= 105 && y <= 135) {
            const idx = (y * w + x) * 4;
            if (bodyFront[idx + 3] === 0 && fd[idx + 3] > 0) {
              copyPixel(fd, bodyFront, idx);
            }
          }
        }
      }
    }
  }

  // (1.5) Rear Arm Front: Mirror clean front arm across X=128
  // Shoulder at (108, 112)
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

  // (2.1) Head Back: smooth rice paper circle, no eyes
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (bd[idx + 3] === 0) continue;
      if (y <= 101 || (y <= 104 && Math.abs(x - 128) <= 8)) {
        copyPixel(bd, headBack, idx);
      }
    }
  }

  // (2.2) Front Arm Back: from back view, the front arm holding knife is on viewer's left
  // Shoulder at (108, 112), elbow at (92, 137), grip at (79, 153)
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

  // (2.3) Rear Arm Back: viewer right, shoulder at (148, 112)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (frontUpperArmFront[idx + 3] > 0 || frontForearmFront[idx + 3] > 0) {
        copyPixel(frontUpperArmFront[idx + 3] > 0 ? frontUpperArmFront : frontForearmFront, rearArmBack, idx);
      }
    }
  }

  // (2.4) Back Body: Robe & "人" brush stroke down the back
  for (let y = 102; y <= 206; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (bd[idx + 3] === 0) continue;

      if (x < 110 && y <= 158) continue;
      if (x > 146 && y <= 158) continue;
      if (x > 145 && y <= 185) continue; // exclude old knife

      copyPixel(bd, bodyBack, idx);
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
      if (y <= 101 || (y <= 104 && Math.abs(x - 128) <= 8)) {
        copyPixel(sd, headSide, idx);
      }
    }
  }

  // (3.2) Side Body: Torso & legs down to Y=206
  // Clean of old knife on the left (X < 106)
  for (let y = 102; y <= 206; y++) {
    for (let x = 106; x <= 145; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] === 0) continue;
      copyPixel(sd, bodySide, idx);
    }
  }

  // (3.3) Side Front Upper Arm & Sleeve:
  // Shoulder at (137, 111), Elbow cuff at (156, 135)
  // Clean sleeve from side view
  for (let y = 104; y <= 142; y++) {
    for (let x = 126; x <= 165; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] === 0) continue;

      // Check if skin/hand
      const r = sd[idx], g = sd[idx + 1], b = sd[idx + 2];
      const isSkin = (r > 200 && g > 185 && b > 165);

      if (!isSkin) {
        copyPixel(sd, frontUpperArmSide, idx);
      }
    }
  }

  // Smooth shoulder cap at (137, 111)
  const sideShoulderRadius = 8;
  for (let dy = -sideShoulderRadius; dy <= sideShoulderRadius; dy++) {
    for (let dx = -sideShoulderRadius; dx <= sideShoulderRadius; dx++) {
      if (dx * dx + dy * dy <= sideShoulderRadius * sideShoulderRadius) {
        const x = 137 + dx;
        const y = 111 + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const idx = (y * w + x) * 4;
          if (frontUpperArmSide[idx + 3] === 0 && sd[idx + 3] > 0) {
            copyPixel(sd, frontUpperArmSide, idx);
          }
        }
      }
    }
  }

  // (3.4) Side Front Forearm & Hand:
  // Elbow at (156, 135), Grip at (170, 148)
  // Use clean hand/forearm facing forward (to the right)
  for (let y = 132; y <= 158; y++) {
    for (let x = 150; x <= 178; x++) {
      const idx = (y * w + x) * 4;
      // Copy hand from front forearm adapted to side grip position
      // In frontForearm, hand is at X: [160, 175], Y: [142, 160]
      const srcX = x;
      const srcY = y + 2;
      if (srcX >= 0 && srcX < w && srcY >= 0 && srcY < h) {
        const srcIdx = (srcY * w + srcX) * 4;
        if (frontForearmFront[srcIdx + 3] > 0) {
          copyPixel(frontForearmFront, frontForearmSide, idx);
        }
      }
    }
  }

  // (3.5) Side Rear Arm: shoulder at (121, 111)
  // Sits behind body (layer 2)
  for (let y = 106; y <= 140; y++) {
    for (let x = 112; x <= 126; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] > 0) {
        copyPixel(sd, rearArmSide, idx);
      }
    }
  }

  // ====================================================
  // 4. WRITE ALL 15 MODULAR CHARACTER ASSETS (256x256 RGBA)
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
    console.log(`Saved ${part.name}`);
  }

  console.log('Successfully created all 15 character component assets.');
}

buildProductionAssets().catch(err => {
  console.error(err);
  process.exit(1);
});
