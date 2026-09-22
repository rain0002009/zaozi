const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require(require.resolve('playwright', {
  paths: [path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')],
}));

async function main() {
  console.log('[diagnose-text-blur] Starting Vite server...');
  const port = '5175';
  const vite = spawn('npx', ['vite', '--port', port, '--strictPort'], {
    shell: true,
    cwd: path.resolve(__dirname, '..'),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  vite.stdout.on('data', (d) => console.log('[vite]', d.toString().trim()));
  vite.stderr.on('data', (d) => console.error('[vite:err]', d.toString().trim()));

  // Wait for Vite server to be ready
  const http = require('node:http');
  const waitForServer = async () => {
    for (let i = 0; i < 30; i++) {
      try {
        await new Promise((resolve, reject) => {
          const req = http.get(`http://localhost:${port}/`, (res) => {
            if (res.statusCode === 200) resolve(true);
            else reject(new Error('Status ' + res.statusCode));
          });
          req.on('error', reject);
          req.setTimeout(500, () => {
            req.destroy();
            reject(new Error('Timeout'));
          });
        });
        console.log('[diagnose-text-blur] Vite server is ready.');
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 400));
      }
    }
    throw new Error('Vite server failed to start in time');
  };

  await waitForServer();

  // Launch browser with deviceScaleFactor = 2 (representing modern high-DPI / Windows scaled display)
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2,
    });

    console.log(`[diagnose-text-blur] Navigating to http://localhost:${port}/ ...`);
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForTimeout(1500);

    const diagnostics = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return { error: 'No canvas found' };

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const game = (window).game;
      const config = game?.config || {};

      // Check text sharpness indicators
      const backingWidth = canvas.width;
      const backingHeight = canvas.height;
      const displayWidth = rect.width;
      const displayHeight = rect.height;

      // Physical pixels that the screen actually uses
      const expectedPhysicalWidth = Math.round(displayWidth * dpr);
      const expectedPhysicalHeight = Math.round(displayHeight * dpr);

      // Backing store ratio
      const backingRatioX = backingWidth / displayWidth;
      const backingRatioY = backingHeight / displayHeight;

      // Check Phaser text objects if any exist in current scene
      const currentScene = game?.scene?.getScenes(true)?.[0];
      let sampleTextInfo = null;
      let allTextsValid = true;
      if (currentScene && currentScene.children?.list) {
        const textObjects = currentScene.children.list.filter((c) => c.type === 'Text');
        if (textObjects.length > 0) {
          const sample = textObjects[0];
          sampleTextInfo = {
            count: textObjects.length,
            sampleText: sample.text,
            resolution: sample.style?.resolution,
            fontFamily: sample.style?.fontFamily,
          };
          for (const t of textObjects) {
            if (!t.style?.resolution || t.style.resolution < dpr) {
              allTextsValid = false;
            }
            if (t.style?.fontFamily === 'Courier' || !t.style?.fontFamily) {
              allTextsValid = false;
            }
          }
        }
      }

      return {
        dpr,
        displayWidth,
        displayHeight,
        renderRoundPixels: config.render?.roundPixels ?? config.roundPixels,
        renderAntialias: config.render?.antialias,
        sampleTextInfo,
        allTextsValid,
      };
    });

    console.log('[diagnose-text-blur] Diagnostics Result:', JSON.stringify(diagnostics, null, 2));

    // Assertions for text sharpness
    const errors = [];

    if (!diagnostics.sampleTextInfo) {
      errors.push('FAIL: No Text objects found in the active scene to evaluate.');
    } else {
      if (!diagnostics.sampleTextInfo.resolution || diagnostics.sampleTextInfo.resolution < diagnostics.dpr) {
        errors.push(
          `FAIL: Text resolution (${diagnostics.sampleTextInfo.resolution}) is lower than devicePixelRatio (${diagnostics.dpr}), causing blurry text rasterization.`
        );
      }
      if (diagnostics.sampleTextInfo.fontFamily === 'Courier' || !diagnostics.sampleTextInfo.fontFamily) {
        errors.push(
          `FAIL: Text fontFamily falls back to default 'Courier', which causes ugly, jagged Chinese font fallback.`
        );
      }
      if (!diagnostics.allTextsValid) {
        errors.push('FAIL: Not all Text objects in scene have high-DPI resolution and proper font family.');
      }
    }

    if (!diagnostics.renderRoundPixels) {
      errors.push(
        `FAIL: Phaser roundPixels is not enabled (renderRoundPixels=${diagnostics.renderRoundPixels}), causing subpixel anti-aliasing blur on text.`
      );
    }

    if (errors.length > 0) {
      console.error('\n❌ TEXT BLUR DIAGNOSIS FAILED:');
      errors.forEach((e) => console.error(' - ' + e));
      process.exitCode = 1;
    } else {
      console.log('\n✅ TEXT SHARPNESS PASS: All Text objects rasterize at high-DPI resolution with modern Chinese typography and roundPixels enabled.');
    }
  } finally {
    await browser.close();
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', vite.pid.toString(), '/f', '/t']);
      } else {
        vite.kill();
      }
    } catch (e) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
