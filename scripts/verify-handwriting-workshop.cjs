const path = require('node:path');
const fs = require('node:fs');

let playwright;
try {
  playwright = require('playwright');
} catch {
  playwright = require(require.resolve('playwright', {
    paths: [path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')],
  }));
}
const { chromium } = playwright;

async function run() {
  const outDir = path.join(__dirname, '../.scratch/handwriting');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });

  page.on('console', (msg) => {
    console.log('[BROWSER]', msg.type(), msg.text());
  });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Wait for menu or base scene
  await page.waitForTimeout(1000);

  // If on Menu scene, click "进 入 归 字 营" or "出征" to go to Base
  // Check if we have button "进 入 归 字 营"
  // Let's click at canvas center or find text
  // The MenuScene has "出征" button and "归字营" button.
  // In MenuScene: "【 归 字 营 】" button is around (512, 450) or similar.
  // Let's inspect active scene in Phaser:
  const sceneName = await page.evaluate(() => {
    const game = window.game || window.Phaser?.GAMES?.[0];
    if (!game) return 'no-game';
    const active = game.scene.getScenes(true).map(s => s.scene.key);
    return active.join(',');
  });
  console.log('Active scenes:', sceneName);

  if (sceneName.includes('Menu')) {
    // Click "归字营" button in MenuScene
    console.log('Clicking 归字营 in Menu...');
    await page.evaluate(() => {
      const game = window.game || window.Phaser?.GAMES?.[0];
      const menu = game.scene.getScene('Menu');
      if (menu) {
        menu.scene.start('Base', {});
      }
    });
    await page.waitForTimeout(1000);
  }

  // Verify we are now on Base scene
  const baseSceneActive = await page.evaluate(() => {
    const game = window.game || window.Phaser?.GAMES?.[0];
    return game?.scene?.isActive('Base');
  });
  console.log('Base scene active:', baseSceneActive);

  // Wait for handwriting service to be ready
  await page.evaluate(async () => {
    let count = 0;
    while (!window.HanziLookup?.data?.mmah && count < 30) {
      await new Promise(r => setTimeout(r, 100));
      count++;
    }
  });

  const isReady = await page.evaluate(() => {
    return !!window.HanziLookup?.data?.mmah;
  });
  console.log('HanziLookup MMAH data ready:', isReady);

  // Screenshot 1: Empty Handwriting Workshop
  await page.screenshot({ path: path.join(outDir, '01-handwriting-empty.png') });
  console.log('Saved 01-handwriting-empty.png');

  // Helper to draw a stroke
  async function drawStroke(points) {
    if (points.length === 0) return;
    await page.mouse.move(points[0][0], points[0][1]);
    await page.mouse.down();
    for (let i = 1; i < points.length; i++) {
      await page.mouse.move(points[i][0], points[i][1], { steps: 5 });
      await page.waitForTimeout(15);
    }
    await page.mouse.up();
    await page.waitForTimeout(100);
  }

  // Draw character "十" on canvas (canvas is at X: 48, Y: 224, size: 288x288, center is (192, 368))
  console.log('Drawing "十"...');
  // Horizontal stroke
  await drawStroke([
    [100, 368],
    [192, 368],
    [284, 368],
  ]);
  // Vertical stroke
  await drawStroke([
    [192, 276],
    [192, 368],
    [192, 460],
  ]);

  await page.waitForTimeout(500);

  // Get recognition results
  const candidatesTen = await page.evaluate(() => {
    const game = window.game || window.Phaser?.GAMES?.[0];
    const base = game.scene.getScene('Base');
    return {
      candidates: base.candidates.map(c => c.character),
      selected: base.selectedCandidate?.character,
      drawnStrokesCount: base.drawnStrokes.length
    };
  });
  console.log('Recognition result for 十:', candidatesTen);

  await page.screenshot({ path: path.join(outDir, '02-handwriting-drawn-ten.png') });
  console.log('Saved 02-handwriting-drawn-ten.png');

  // Click "凝 字 成 符"
  console.log('Clicking 凝字成符 button...');
  await page.evaluate(() => {
    const game = window.game || window.Phaser?.GAMES?.[0];
    const base = game.scene.getScene('Base');
    base.executeSynthesis();
  });

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '03-handwriting-synthesized.png') });
  console.log('Saved 03-handwriting-synthesized.png');

  // Now draw character "木"
  console.log('Drawing "木"...');
  // Stroke 1: 横
  await drawStroke([
    [110, 320],
    [192, 320],
    [274, 320],
  ]);
  // Stroke 2: 竖
  await drawStroke([
    [192, 260],
    [192, 360],
    [192, 460],
  ]);
  // Stroke 3: 撇
  await drawStroke([
    [192, 320],
    [150, 390],
    [110, 450],
  ]);
  // Stroke 4: 捺
  await drawStroke([
    [192, 320],
    [234, 390],
    [274, 450],
  ]);

  await page.waitForTimeout(500);

  const candidatesMu = await page.evaluate(() => {
    const game = window.game || window.Phaser?.GAMES?.[0];
    const base = game.scene.getScene('Base');
    return {
      candidates: base.candidates.map(c => c.character),
      selected: base.selectedCandidate?.character,
      drawnStrokesCount: base.drawnStrokes.length
    };
  });
  console.log('Recognition result for 木:', candidatesMu);

  await page.screenshot({ path: path.join(outDir, '04-handwriting-drawn-mu.png') });
  console.log('Saved 04-handwriting-drawn-mu.png');

  await browser.close();
  console.log('Verification finished successfully!');
}

run().catch(err => {
  console.error('Verification error:', err);
  process.exit(1);
});
