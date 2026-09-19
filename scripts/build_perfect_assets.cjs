const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'E:/workspace/zaozi/art/characters/ren/source';
const REF_DIR = 'E:/workspace/zaozi/art/characters/ren/reference';

async function main() {
  const scale = 146.0 / 512.0;
  const w = 256, h = 256;

  // 1. Prepare raw transparent canvases from turnaround
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

  const copyPixelAt = (src, dst, srcIdx, dstIdx) => {
    dst[dstIdx] = src[srcIdx];
    dst[dstIdx + 1] = src[srcIdx + 1];
    dst[dstIdx + 2] = src[srcIdx + 2];
    dst[dstIdx + 3] = src[srcIdx + 3];
  };

  // ====================================================
  // 1. FRONT VIEW
  // ====================================================
  const fd = frontCanvas.data;
  const headFront = createBuf();
  const bodyFront = createBuf();
  const frontUpperArmFront = createBuf();
  const frontForearmFront = createBuf();
  const rearArmFront = createBuf();

  // (1.1) Head Front: Y <= 101, neck base to 103
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;
      if (y <= 101 || (y <= 103 && Math.abs(x - 128) <= 8)) {
        copyPixel(fd, headFront, idx);
      }
    }
  }

  // (1.2) Front Forearm & Hand (viewer right):
  for (let y = 140; y <= 165; y++) {
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
  for (let dy = -6; dy <= 6; dy++) {
    for (let dx = -6; dx <= 6; dx++) {
      if (dx * dx + dy * dy <= 36) {
        const x = 164 + dx;
        const y = 140 + dy;
        const idx = (y * w + x) * 4;
        if (fd[idx + 3] > 0) copyPixel(fd, frontForearmFront, idx);
      }
    }
  }

  // (1.3) Front Upper Arm & Sleeve (viewer right):
  for (let y = 104; y <= 147; y++) {
    const rightX = Math.round(132 + ((y - 102) / 60.0) * 18);
    for (let x = rightX - 2; x <= 176; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] === 0) continue;
      if (frontForearmFront[idx + 3] > 0 && y >= 146) continue;
      copyPixel(fd, frontUpperArmFront, idx);
    }
  }
  for (let dy = -12; dy <= 12; dy++) {
    for (let dx = -12; dx <= 12; dx++) {
      if (dx * dx + dy * dy <= 144) {
        const x = 148 + dx;
        const y = 112 + dy;
        if (x >= 0 && x < w && y >= 0 && y < h) {
          const idx = (y * w + x) * 4;
          if (fd[idx + 3] > 0) copyPixel(fd, frontUpperArmFront, idx);
        }
      }
    }
  }

  // (1.4) Front Body (Torso & Legs):
  for (let y = 101; y <= 162; y++) {
    const progress = (y - 102) / 60.0;
    const leftX = Math.round(124 - progress * 18);
    const rightX = Math.round(132 + progress * 18);
    for (let x = leftX; x <= rightX; x++) {
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] > 0) {
        copyPixel(fd, bodyFront, idx);
      }
    }
  }
  for (let y = 163; y <= 206; y++) {
    for (let x = 75; x <= 175; x++) {
      if (y <= 186 && x < 100) continue;
      const idx = (y * w + x) * 4;
      if (fd[idx + 3] > 0) {
        copyPixel(fd, bodyFront, idx);
      }
    }
  }

  // (1.5) Rear Arm Front: Mirror right arm across X=128
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = 128 + (128 - x);
      if (srcX >= 0 && srcX < w) {
        const srcIdx = (y * w + srcX) * 4;
        const dstIdx = (y * w + x) * 4;
        if (frontUpperArmFront[srcIdx + 3] > 0) {
          copyPixelAt(frontUpperArmFront, rearArmFront, srcIdx, dstIdx);
        } else if (frontForearmFront[srcIdx + 3] > 0) {
          copyPixelAt(frontForearmFront, rearArmFront, srcIdx, dstIdx);
        }
      }
    }
  }

  // ====================================================
  // 2. BACK VIEW
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

  // (2.2) Body Back: Robe and "人" spine/legs
  for (let y = 101; y <= 162; y++) {
    const progress = (y - 102) / 60.0;
    const leftX = Math.round(124 - progress * 18);
    const rightX = Math.round(132 + progress * 18);
    for (let x = leftX; x <= rightX; x++) {
      const idx = (y * w + x) * 4;
      if (bd[idx + 3] > 0) {
        copyPixel(bd, bodyBack, idx);
      }
    }
  }
  for (let y = 163; y <= 206; y++) {
    for (let x = 75; x <= 175; x++) {
      if (y <= 186 && x > 154) continue;
      const idx = (y * w + x) * 4;
      if (bd[idx + 3] > 0) {
        copyPixel(bd, bodyBack, idx);
      }
    }
  }

  // (2.3) Arms Back:
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const srcX = 128 + (128 - x);
      if (srcX >= 0 && srcX < w) {
        const srcIdx = (y * w + srcX) * 4;
        const dstIdx = (y * w + x) * 4;
        if (frontUpperArmFront[srcIdx + 3] > 0) {
          copyPixelAt(frontUpperArmFront, frontUpperArmBack, srcIdx, dstIdx);
        }
        if (frontForearmFront[srcIdx + 3] > 0) {
          copyPixelAt(frontForearmFront, frontForearmBack, srcIdx, dstIdx);
        }
      }
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (frontUpperArmFront[idx + 3] > 0 || frontForearmFront[idx + 3] > 0) {
        copyPixel(frontUpperArmFront[idx + 3] > 0 ? frontUpperArmFront : frontForearmFront, rearArmBack, idx);
      }
    }
  }

  // ====================================================
  // 3. SIDE VIEW (Facing Right)
  // ====================================================
  const sd = sideCanvas.data;
  const headSide = createBuf();
  const bodySide = createBuf();
  const frontUpperArmSide = createBuf();
  const frontForearmSide = createBuf();
  const rearArmSide = createBuf();

  // (3.1) Head Side: Full round profile facing right, including back of head (minX=106)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] === 0) continue;
      if (y <= 101 || (y <= 103 && x >= 114 && x <= 138)) {
        copyPixel(sd, headSide, idx);
      }
    }
  }

  // (3.2) Side Body: Complete side torso from collar to hem (162), and legs down to 206
  // Keep all pixels from back curve (X >= 105) to front curve (X <= 144)
  for (let y = 101; y <= 162; y++) {
    for (let x = 105; x <= 144; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] > 0) {
        const r = sd[idx], g = sd[idx + 1], b = sd[idx + 2];
        const isSkin = (r > 200 && g > 185 && b > 165);
        if (!isSkin) {
          copyPixel(sd, bodySide, idx);
        } else {
          // Inpaint cloth tone under hand
          bodySide[idx] = 162;
          bodySide[idx + 1] = 172;
          bodySide[idx + 2] = 162;
          bodySide[idx + 3] = 255;
        }
      }
    }
  }
  // Legs down to 206
  for (let y = 163; y <= 206; y++) {
    for (let x = 105; x <= 135; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] > 0) {
        copyPixel(sd, bodySide, idx);
      }
    }
  }

  // (3.3) Side Front Upper Arm & Sleeve:
  // Shoulder at (137, 111), elbow cuff at (138, 140)
  for (let y = 104; y <= 144; y++) {
    for (let x = 126; x <= 148; x++) {
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
  // Forearm emerges from (138, 140) down to hand grip at (140, 154)
  for (let y = 142; y <= 162; y++) {
    for (let x = 126; x <= 146; x++) {
      const idx = (y * w + x) * 4;
      if (sd[idx + 3] === 0) continue;
      const r = sd[idx], g = sd[idx + 1], b = sd[idx + 2];
      const isSkin = (r > 200 && g > 185 && b > 165);
      if (isSkin || y >= 148) {
        copyPixel(sd, frontForearmSide, idx);
      }
    }
  }
  for (let dy = -5; dy <= 5; dy++) {
    for (let dx = -5; dx <= 5; dx++) {
      if (dx * dx + dy * dy <= 25) {
        const x = 138 + dx;
        const y = 140 + dy;
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
  // 4. WRITE ALL 15 SOURCE FILES (256x256 RGBA)
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

  // ====================================================
  // 5. ASSEMBLED PREVIEWS & ANCHOR GUIDE
  // ====================================================
  const frontAssembled = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: `${SOURCE_DIR}/ren_rear_arm_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_body_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_head_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_upper_arm_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_forearm_front.png`, left: 0, top: 0 },
  ]).png().toBuffer();
  await sharp(frontAssembled).toFile(`${REF_DIR}/ren_front_assembled.png`);

  const backAssembled = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: `${SOURCE_DIR}/ren_front_upper_arm_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_forearm_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_body_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_head_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_rear_arm_back.png`, left: 0, top: 0 },
  ]).png().toBuffer();
  await sharp(backAssembled).toFile(`${REF_DIR}/ren_back_assembled.png`);

  const sideAssembled = await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: `${SOURCE_DIR}/ren_rear_arm_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_body_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_head_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_upper_arm_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_forearm_side.png`, left: 0, top: 0 },
  ]).png().toBuffer();
  await sharp(sideAssembled).toFile(`${REF_DIR}/ren_side_assembled.png`);

  // Generate ren_anchor_guide.png
  const guideW = 860, guideH = 410;
  const colX = [30, 310, 590];
  const topY = 70;

  const views = [
    {
      name: '正面 (Front)',
      offsetX: colX[0],
      anchors: [
        { label: '根锚点 (128,164)', x: 128, y: 164, color: '#e53935' },
        { label: '头部中心 (128,78)', x: 128, y: 78, color: '#1e88e5' },
        { label: '后肩 (108,112)', x: 108, y: 112, color: '#43a047' },
        { label: '前肩 (148,112)', x: 148, y: 112, color: '#fb8c00' },
        { label: '前肘 (164,137)', x: 164, y: 137, color: '#8e24aa' },
        { label: '握点 (172,153)', x: 172, y: 153, color: '#d81b60' },
      ]
    },
    {
      name: '背面 (Back)',
      offsetX: colX[1],
      anchors: [
        { label: '根锚点 (128,164)', x: 128, y: 164, color: '#e53935' },
        { label: '头部中心 (128,78)', x: 128, y: 78, color: '#1e88e5' },
        { label: '后肩 (148,112)', x: 148, y: 112, color: '#43a047' },
        { label: '前肩 (108,112)', x: 108, y: 112, color: '#fb8c00' },
        { label: '前肘 (92,137)', x: 92, y: 137, color: '#8e24aa' },
        { label: '握点 (84,153)', x: 84, y: 153, color: '#d81b60' },
      ]
    },
    {
      name: '右侧 (Side)',
      offsetX: colX[2],
      anchors: [
        { label: '根锚点 (128,164)', x: 128, y: 164, color: '#e53935' },
        { label: '头部中心 (128,78)', x: 128, y: 78, color: '#1e88e5' },
        { label: '后肩 (121,111)', x: 121, y: 111, color: '#43a047' },
        { label: '前肩 (137,111)', x: 137, y: 111, color: '#fb8c00' },
        { label: '前肘 (138,137)', x: 138, y: 137, color: '#8e24aa' },
        { label: '握点 (140,154)', x: 140, y: 154, color: '#d81b60' },
      ]
    }
  ];

  let svgElements = [];
  svgElements.push(`<rect width="${guideW}" height="${guideH}" fill="#f8f6f0" />`);
  svgElements.push(`<text x="${guideW/2}" y="36" font-family="sans-serif" font-size="20" font-weight="bold" fill="#2c3e50" text-anchor="middle">初始角色“人”关节与锚点接入规范图 (ren_anchor_guide)</text>`);

  views.forEach((v) => {
    svgElements.push(`<text x="${v.offsetX + 128}" y="${topY - 14}" font-family="sans-serif" font-size="15" font-weight="bold" fill="#333" text-anchor="middle">${v.name}</text>`);
    svgElements.push(`<rect x="${v.offsetX}" y="${topY}" width="256" height="256" fill="#ffffff" stroke="#d5d5d5" stroke-dasharray="4,4" />`);
    const baseY = topY + 206;
    svgElements.push(`<line x1="${v.offsetX}" y1="${baseY}" x2="${v.offsetX + 256}" y2="${baseY}" stroke="#0288d1" stroke-width="1.5" stroke-dasharray="4,2" />`);
    svgElements.push(`<text x="${v.offsetX + 6}" y="${baseY - 5}" font-family="sans-serif" font-size="10" font-weight="bold" fill="#0288d1">脚底基线 y=206</text>`);

    // Center vertical guide
    svgElements.push(`<line x1="${v.offsetX + 128}" y1="${topY}" x2="${v.offsetX + 128}" y2="${topY + 256}" stroke="#eeeeee" stroke-width="1" />`);

    v.anchors.forEach(a => {
      const ax = v.offsetX + a.x;
      const ay = topY + a.y;
      svgElements.push(`<line x1="${ax - 6}" y1="${ay}" x2="${ax + 6}" y2="${ay}" stroke="${a.color}" stroke-width="2" />`);
      svgElements.push(`<line x1="${ax}" y1="${ay - 6}" x2="${ax}" y2="${ay + 6}" stroke="${a.color}" stroke-width="2" />`);
      svgElements.push(`<circle cx="${ax}" cy="${ay}" r="3.5" fill="none" stroke="${a.color}" stroke-width="2" />`);
    });
  });

  // Legend
  const legendY = topY + 272;
  const legendItems = [
    { label: '根锚点 (128,164)', color: '#e53935' },
    { label: '头部中心 (128,78)', color: '#1e88e5' },
    { label: '后肩', color: '#43a047' },
    { label: '前肩', color: '#fb8c00' },
    { label: '前肘', color: '#8e24aa' },
    { label: '握点', color: '#d81b60' },
    { label: '脚底基线 y=206', color: '#0288d1' }
  ];
  legendItems.forEach((item, i) => {
    const lx = 42 + i * 114;
    svgElements.push(`<circle cx="${lx}" cy="${legendY + 14}" r="5" fill="${item.color}" />`);
    svgElements.push(`<text x="${lx + 10}" y="${legendY + 18}" font-family="sans-serif" font-size="11" font-weight="bold" fill="#444">${item.label}</text>`);
  });

  svgElements.push(`<text x="${guideW/2}" y="${guideH - 14}" font-family="sans-serif" font-size="12" fill="#555" text-anchor="middle">单刃短刀: 256×256透明画布，刀柄锚点位于 (38,128)，刀身长度 70px，与握点自然贴合连接</text>`);

  const svgBuffer = Buffer.from(`<svg width="${guideW}" height="${guideH}" xmlns="http://www.w3.org/2000/svg">${svgElements.join('\n')}</svg>`);

  await sharp(svgBuffer)
    .composite([
      { input: frontAssembled, left: colX[0], top: topY },
      { input: backAssembled, left: colX[1], top: topY },
      { input: sideAssembled, left: colX[2], top: topY },
    ])
    .png()
    .toFile(`${REF_DIR}/ren_anchor_guide.png`);

  console.log('Saved perfect ren_anchor_guide.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
