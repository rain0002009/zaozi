const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'E:/workspace/zaozi/art/characters/ren/source';
const REF_DIR = 'E:/workspace/zaozi/art/characters/ren/reference';

async function main() {
  // 1. Assembled Front View
  const frontAssembled = await sharp({
    create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: `${SOURCE_DIR}/ren_rear_arm_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_body_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_head_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_upper_arm_front.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_forearm_front.png`, left: 0, top: 0 },
  ]).png().toBuffer();
  await sharp(frontAssembled).toFile(`${REF_DIR}/ren_front_assembled.png`);
  console.log('Saved ren_front_assembled.png');

  // 2. Assembled Back View
  const backAssembled = await sharp({
    create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: `${SOURCE_DIR}/ren_front_upper_arm_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_forearm_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_body_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_head_back.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_rear_arm_back.png`, left: 0, top: 0 },
  ]).png().toBuffer();
  await sharp(backAssembled).toFile(`${REF_DIR}/ren_back_assembled.png`);
  console.log('Saved ren_back_assembled.png');

  // 3. Assembled Side View
  const sideAssembled = await sharp({
    create: { width: 256, height: 256, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([
    { input: `${SOURCE_DIR}/ren_rear_arm_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_body_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_head_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_upper_arm_side.png`, left: 0, top: 0 },
    { input: `${SOURCE_DIR}/ren_front_forearm_side.png`, left: 0, top: 0 },
  ]).png().toBuffer();
  await sharp(sideAssembled).toFile(`${REF_DIR}/ren_side_assembled.png`);
  console.log('Saved ren_side_assembled.png');

  // 4. Generate ren_anchor_guide.png
  // SVG overlay on top of 3 views (width: 256*3 + margins = 860, height: 380)
  const guideW = 860;
  const guideH = 380;
  const colX = [30, 310, 590]; // Left positions for Front, Back, Side (each 256x256 at top: 60)
  const topY = 60;

  // Anchors data from doc:
  // Front: root(128,164), head(128,78), rearShoulder(108,112), frontShoulder(148,112), frontElbow(164,137), grip(177,153)
  // Back:  root(128,164), head(128,78), rearShoulder(148,112), frontShoulder(108,112), frontElbow(92,137), grip(79,153)
  // Side:  root(128,164), head(128,78), rearShoulder(121,111), frontShoulder(137,111), frontElbow(156,135), grip(170,148)

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
        { label: '握点 (177,153)', x: 177, y: 153, color: '#d81b60' },
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
        { label: '握点 (79,153)', x: 79, y: 153, color: '#d81b60' },
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
        { label: '前肘 (156,135)', x: 156, y: 135, color: '#8e24aa' },
        { label: '握点 (170,148)', x: 170, y: 148, color: '#d81b60' },
      ]
    }
  ];

  let svgElements = [];
  // Background
  svgElements.push(`<rect width="${guideW}" height="${guideH}" fill="#f7f5f0" />`);
  // Title
  svgElements.push(`<text x="${guideW/2}" y="32" font-family="sans-serif" font-size="18" font-weight="bold" fill="#2c3e50" text-anchor="middle">初始角色“人”关节与锚点规范图 (ren_anchor_guide)</text>`);

  views.forEach((v) => {
    // Column header
    svgElements.push(`<text x="${v.offsetX + 128}" y="${topY - 12}" font-family="sans-serif" font-size="14" font-weight="bold" fill="#333" text-anchor="middle">${v.name}</text>`);
    // Canvas frame
    svgElements.push(`<rect x="${v.offsetX}" y="${topY}" width="256" height="256" fill="#ffffff" stroke="#ccc" stroke-dasharray="3,3" />`);
    // Baseline y=206
    const baseY = topY + 206;
    svgElements.push(`<line x1="${v.offsetX}" y1="${baseY}" x2="${v.offsetX + 256}" y2="${baseY}" stroke="#29b6f6" stroke-width="1.5" stroke-dasharray="4,2" />`);
    svgElements.push(`<text x="${v.offsetX + 4}" y="${baseY - 4}" font-family="sans-serif" font-size="9" fill="#0288d1">脚底 y=206</text>`);

    // Center vertical guideline
    svgElements.push(`<line x1="${v.offsetX + 128}" y1="${topY}" x2="${v.offsetX + 128}" y2="${topY + 256}" stroke="#e0e0e0" stroke-width="1" />`);

    // Draw anchors
    v.anchors.forEach(a => {
      const ax = v.offsetX + a.x;
      const ay = topY + a.y;
      // Crosshair
      svgElements.push(`<line x1="${ax - 5}" y1="${ay}" x2="${ax + 5}" y2="${ay}" stroke="${a.color}" stroke-width="1.5" />`);
      svgElements.push(`<line x1="${ax}" y1="${ay - 5}" x2="${ax}" y2="${ay + 5}" stroke="${a.color}" stroke-width="1.5" />`);
      svgElements.push(`<circle cx="${ax}" cy="${ay}" r="3" fill="none" stroke="${a.color}" stroke-width="1.5" />`);
    });
  });

  // Legend at bottom
  const legendY = topY + 266;
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
    const lx = 40 + i * 115;
    svgElements.push(`<circle cx="${lx}" cy="${legendY + 16}" r="5" fill="${item.color}" />`);
    svgElements.push(`<text x="${lx + 10}" y="${legendY + 20}" font-family="sans-serif" font-size="11" fill="#444">${item.label}</text>`);
  });

  // Knife info at bottom
  svgElements.push(`<text x="${guideW/2}" y="${guideH - 12}" font-family="sans-serif" font-size="11" fill="#666" text-anchor="middle">单刃短刀: 256×256画布，刀柄锚点位于 (38,128)，刀身长度 70px，与握点贴合连接</text>`);

  const svgBuffer = Buffer.from(`<svg width="${guideW}" height="${guideH}" xmlns="http://www.w3.org/2000/svg">${svgElements.join('\n')}</svg>`);

  // Composite the 3 views onto the guide image
  await sharp(svgBuffer)
    .composite([
      { input: frontAssembled, left: colX[0], top: topY },
      { input: backAssembled, left: colX[1], top: topY },
      { input: sideAssembled, left: colX[2], top: topY },
    ])
    .png()
    .toFile(`${REF_DIR}/ren_anchor_guide.png`);

  console.log('Saved ren_anchor_guide.png');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
