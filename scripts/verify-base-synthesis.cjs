const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(require.resolve('playwright', {
  paths: [path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')],
}));

async function main() {
  console.log('Starting Vite server for synthesis test...');
  const vite = spawn('npx', ['vite', '--port', '5174', '--strictPort'], {
    shell: true,
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  vite.stdout.on('data', (d) => console.log('[vite]', d.toString().trim()));
  vite.stderr.on('data', (d) => console.error('[vite:err]', d.toString().trim()));

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
    page.on('console', (msg) => console.log('[page:console]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[page:error]', err));

    console.log('Navigating to http://localhost:5174/ ...');
    await page.goto('http://localhost:5174/', { waitUntil: 'networkidle' });

    // Wait for canvas
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1200);

    // Click '踏入归字营' to go to Base
    console.log('Clicking to enter Base...');
    await page.mouse.click(512, 450); // Menu start button
    await page.waitForTimeout(1000);

    // 1. Capture Base scene Mi-grid workshop
    const baseCraftPath = path.resolve(__dirname, '..', '.scratch', 'synthesis', 'base-migrid-workshop.png');
    await page.screenshot({ path: baseCraftPath });
    console.log('✓ Mi-grid workshop screenshot saved to:', baseCraftPath);

    // Click cell 1 (center top) and cell 4 (center) on Mi-grid to place strokes
    // Mi-grid startX=48, startY=224, cellSize=96
    // Cell 1: x = 48 + 96 + 48 = 192, y = 224 + 48 = 272
    // Cell 4: x = 192, y = 224 + 96 + 48 = 368
    console.log('Placing strokes on Mi-Grid...');
    await page.mouse.click(192, 272); // place '一' in cell 1
    await page.waitForTimeout(300);

    // Select '丨' from inventory bar (index 1 in inventory: x = 120 + 95 = 215, y = 80 + 24 = 104)
    await page.mouse.click(215, 104);
    await page.waitForTimeout(300);

    // Place '丨' in cell 4
    await page.mouse.click(192, 368);
    await page.waitForTimeout(500);

    // Screenshot with strokes placed
    const placedPath = path.resolve(__dirname, '..', '.scratch', 'synthesis', 'base-strokes-placed.png');
    await page.screenshot({ path: placedPath });
    console.log('✓ Strokes placed screenshot saved to:', placedPath);

    // 2. Switch to Forge tab: x = 680, y = 34
    console.log('Switching to Weapon Forge tab...');
    await page.mouse.click(680, 34);
    await page.waitForTimeout(600);

    const forgePath = path.resolve(__dirname, '..', '.scratch', 'synthesis', 'base-weapon-forge.png');
    await page.screenshot({ path: forgePath });
    console.log('✓ Weapon Forge screenshot saved to:', forgePath);

    // 3. Click '出征' button at gate: x = 897, y = 570
    console.log('Clicking expedition button...');
    await page.mouse.click(897, 570);
    await page.waitForTimeout(800);

    // Select first route: x = 200, y = 380
    await page.mouse.click(200, 380);
    await page.waitForTimeout(1000);

    // Capture Game combat scene with compound weapon equipped & circle character!
    const combatPath = path.resolve(__dirname, '..', '.scratch', 'synthesis', 'combat-circle-character.png');
    await page.screenshot({ path: combatPath });
    console.log('✓ Combat screenshot saved to:', combatPath);

  } finally {
    await browser.close();
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', vite.pid.toString(), '/f', '/t']);
      } else {
        vite.kill();
      }
    } catch (e) {}
    process.exit(0);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
