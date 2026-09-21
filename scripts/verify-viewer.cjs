const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(require.resolve('playwright', {
  paths: [path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')],
}));

async function main() {
  console.log('Starting Vite server for viewer test...');
  const vite = spawn('npx', ['vite', '--port', '5174', '--strictPort'], {
    shell: true,
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  vite.stdout.on('data', (d) => console.log('[vite]', d.toString().trim()));
  vite.stderr.on('data', (d) => console.error('[vite:err]', d.toString().trim()));

  // Wait 3 seconds for server to be ready
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('console', (msg) => console.log('[page:console]', msg.type(), msg.text()));
    page.on('pageerror', (err) => console.error('[page:error]', err));

    console.log('Navigating to http://localhost:5174/viewer.html...');
    await page.goto('http://localhost:5174/viewer.html', { waitUntil: 'networkidle' });

    // Wait for Phaser canvas to be ready
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1000);

    // 1. Idle state screenshot
    const idlePath = path.resolve(__dirname, '..', '.scratch', 'character-art', 'brotato-idle.png');
    await page.screenshot({ path: idlePath, fullPage: true });
    console.log('✓ Brotato Idle screenshot saved to:', idlePath);

    // 2. Waddle Walk screenshot
    await page.click('#btn-act-walk');
    await page.waitForTimeout(650);
    const walkPath = path.resolve(__dirname, '..', '.scratch', 'character-art', 'brotato-walk.png');
    await page.screenshot({ path: walkPath, fullPage: true });
    console.log('✓ Brotato Walk screenshot saved to:', walkPath);

    // 3. Attack Thrust
    await page.click('#btn-act-atk1');
    await page.waitForTimeout(100);
    const atk1Path = path.resolve(__dirname, '..', '.scratch', 'character-art', 'brotato-atk1.png');
    await page.screenshot({ path: atk1Path, fullPage: true });
    console.log('✓ Brotato Attack 1 screenshot saved to:', atk1Path);

    // 4. Zoom to 4x closeup
    await page.click('#btn-zoom-4');
    await page.click('#btn-act-walk');
    await page.waitForTimeout(500);
    const closeupPath = path.resolve(__dirname, '..', '.scratch', 'character-art', 'brotato-closeup.png');
    await page.screenshot({ path: closeupPath, fullPage: true });
    console.log('✓ Brotato Closeup screenshot saved to:', closeupPath);
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
