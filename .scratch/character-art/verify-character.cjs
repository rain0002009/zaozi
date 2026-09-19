const assert = require('node:assert/strict');
const path = require('node:path');
const sharp = require('sharp');
const { chromium } = require(require.resolve('playwright', {
  paths: [path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')],
}));

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.on('pageerror', (error) => console.error('page error:', error.message));
    page.on('console', (message) => { if (message.type() === 'error') console.error('console error:', message.text()); });
    page.on('requestfailed', (request) => console.error('request failed:', request.url(), request.failure()?.errorText));
    await page.route('**/src/main.ts*', async (route) => {
      const response = await route.fetch();
      const body = (await response.text()).replace('new Phaser.Game(config);', 'window.__characterTestGame = new Phaser.Game(config);');
      assert.notEqual(body, await response.text(), 'game hook was not installed');
      console.log('game hook installed');
      await route.fulfill({ response, body });
    });
    await page.goto('http://localhost:5173/');
    console.log('page state:', await page.evaluate(() => ({ title: document.title, game: !!window.__characterTestGame, scene: window.__characterTestGame?.scene?.scenes?.map((s) => [s.sys.settings.key, s.sys.settings.status]) })));
    await page.waitForFunction(() => window.__characterTestGame?.scene?.getScene('Menu')?.sys?.isActive(), null, { timeout: 8000 });
    await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character);
    const result = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.scene.pause();
      const character = scene.character;
      const movingUp = { x: 0, y: -1, lengthSq: () => 1 };
      character.update(16, movingUp, Math.PI / 2);
      const movementFacing = character.rig.body.texture.key;
      character.startAttack(0);
      const still = { x: 0, y: 0, lengthSq: () => 0 };
      const sample = () => {
        const forearm = character.rig.frontForearm;
        const grip = character.rig.hand;
        const weapon = character.rig.weapon;
        const hand = grip.getWorldTransformMatrix().transformPoint(162 - 161, 157 - 149);
        const handle = weapon.getWorldTransformMatrix().transformPoint(0, 0);
        return {
          gripDistance: Math.hypot(hand.x - handle.x, hand.y - handle.y),
          elbowDifference: forearm.rotation - character.rig.frontUpperArm.rotation,
          wristDifference: grip.rotation - forearm.rotation,
        };
      };
      const windupHit = character.update(50, still, 0);
      const windup = sample();
      const swingHit = character.update(70, still, Math.PI);
      const swing = sample();
      const duplicateHit = character.update(10, still, Math.PI);
      scene.hasAimPointer = true;
      scene.input.activePointer.worldX = 600;
      scene.input.activePointer.worldY = 555;
      scene.updatePlayer(16);
      scene.player.y = 455;
      scene.updatePlayer(16);
      return {
        movementFacing,
        windup,
        swing,
        windupHit,
        swingHit,
        duplicateHit,
        lockedBladeAngle: character.rig.weapon.rotation,
        movingPlayerAim: scene.aimAngle,
      };
    });
    console.log(result);
    const desktopPath = path.join(__dirname, 'character-desktop.png');
    await page.screenshot({ path: desktopPath });
    await sharp(desktopPath).extract({ left: 540, top: 430, width: 210, height: 210 })
      .resize(840, 840).toFile(path.join(__dirname, 'character-detail.png'));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(__dirname, 'character-mobile.png') });
    assert.equal(result.movementFacing, 'ren_body_front', 'walking up must not show the back');
    assert.ok(result.windup.gripDistance < 2 && result.swing.gripDistance < 2, 'knife handle must remain at the hand');
    assert.ok(Math.abs(result.swing.elbowDifference - result.windup.elbowDifference) > 0.05, 'elbow must articulate during the swing');
    assert.ok(Math.abs(result.swing.wristDifference - result.windup.wristDifference) > 0.05, 'wrist must articulate during the swing');
    assert.equal(result.windupHit, false);
    assert.equal(result.swingHit, true);
    assert.equal(result.duplicateHit, false);
    assert.ok(Math.abs(result.lockedBladeAngle) < 1.4, 'attack must not turn to a new cursor target mid-swing');
    assert.ok(result.movingPlayerAim > 0.5, 'stationary pointer must still update aim as the player moves');
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const [name, aim] of [['up', -Math.PI / 2], ['left', Math.PI], ['right', 0], ['down', Math.PI / 2]]) {
      const distance = await page.evaluate((angle) => {
        const scene = window.__characterTestGame.scene.getScene('Game');
        const character = scene.character;
        scene.player.setPosition(512, 455);
        character.action = 'idle';
        character.displayAimAngle = angle;
        character.startAttack(angle);
        character.update(120, { x: 0, y: 0, lengthSq: () => 0 }, angle);
        const hand = character.rig.hand.getWorldTransformMatrix().transformPoint(1, 8);
        const handle = character.rig.weapon.getWorldTransformMatrix().transformPoint(0, 0);
        return Math.hypot(hand.x - handle.x, hand.y - handle.y);
      }, aim);
      assert.ok(distance < 0.1, `${name} swing must keep the handle in hand`);
      const capture = path.join(__dirname, `character-${name}.png`);
      await page.screenshot({ path: capture });
      await sharp(capture).extract({ left: 540, top: 430, width: 210, height: 210 })
        .resize(840, 840).toFile(path.join(__dirname, `character-${name}-detail.png`));
    }
    const frames = [];
    for (const elapsed of [20, 60, 90, 120, 155, 220]) {
      await page.evaluate((time) => {
        const scene = window.__characterTestGame.scene.getScene('Game');
        const character = scene.character;
        character.action = 'idle';
        character.actionElapsed = 0;
        character.startAttack(0);
        character.update(time, { x: 0, y: 0, lengthSq: () => 0 }, 0);
      }, elapsed);
      const frame = await page.screenshot();
      frames.push({ input: await sharp(frame).extract({ left: 540, top: 430, width: 210, height: 210 }).toBuffer(),
        left: (frames.length % 3) * 210, top: Math.floor(frames.length / 3) * 210 });
    }
    await sharp({ create: { width: 630, height: 420, channels: 4, background: '#d7d0ba' } })
      .composite(frames).resize(1260, 840).png().toFile(path.join(__dirname, 'character-swing-sequence.png'));
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
