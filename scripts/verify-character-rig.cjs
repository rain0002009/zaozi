const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(require.resolve('playwright', {
  paths: [path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')],
}));

const GAME_URL = process.env.GAME_URL ?? 'http://127.0.0.1:5173/';

function assertPlantedSupport(gaitSamples, label) {
  let supportRun = [];
  const supportRuns = [];
  for (const sample of gaitSamples) {
    if (supportRun.length && supportRun[0].supportFoot !== sample.supportFoot) {
      if (supportRun.length > 1) supportRuns.push(supportRun);
      supportRun = [];
    }
    supportRun.push(sample);
  }
  if (supportRun.length > 1) supportRuns.push(supportRun);
  assert.ok(supportRuns.length > 0, `${label} should capture a support interval`);
  supportRuns.forEach((run) => {
    const foot = run[0].supportFoot;
    const origin = run[0].soles[foot];
    const drift = Math.max(...run.map((sample) => Math.hypot(
      sample.soles[foot].x - origin.x,
      sample.soles[foot].y - origin.y,
    )));
    assert.ok(drift <= 1.5, `${label} ${foot} support sole drift should stay below 1.5 pixels; got ${drift}`);
  });
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
    await page.addInitScript(() => {
      localStorage.setItem('zaozi-save-v1', JSON.stringify({
        inventory: { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 },
        unlockedWords: ['刀'],
        equippedWords: ['刀'],
        victories: 0,
      }));
    });
    await page.route('**/src/main.ts*', async (route) => {
      const response = await route.fetch();
      const original = await response.text();
      const body = original.replace('new Phaser.Game(config);', 'window.__characterTestGame = new Phaser.Game(config);');
      assert.notEqual(body, original, 'game hook was not installed');
      await route.fulfill({ response, body });
    });
    await page.goto(GAME_URL);
    await page.waitForFunction(() => window.__characterTestGame?.scene?.getScene('Menu')?.sys?.isActive());
    await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character);
    await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.enemies.forEach((enemy) => enemy.body.destroy());
      scene.enemies.length = 0;
      scene.encounterCleared = true;
      scene.player.setPosition(512, 430);
    });

    const result = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.rigSnapshot();
    });

    assert.equal(result.parts.length, 14, 'the runtime character should render all fourteen rig parts');
    assert.deepEqual(result.parts.map((part) => part.name), [
      'rearThigh', 'rearShin', 'rearFoot', 'rearArm', 'torso', 'head',
      'frontThigh', 'frontShin', 'frontFoot', 'garmentHem',
      'weaponUpperArm', 'weaponForearm', 'knife', 'weaponHand',
    ]);
    Object.entries(result.connectionErrors).forEach(([name, error]) => {
      assert.ok(error < 1, `${name} connection error should be below one logical pixel; got ${error}`);
    });
    const canvas = await page.locator('canvas').boundingBox();
    assert.ok(canvas, 'the game canvas should be visible');
    const screenPoint = (x, y) => ({
      x: canvas.x + x * canvas.width / 1024,
      y: canvas.y + y * canvas.height / 768,
    });
    await page.locator('canvas').screenshot({ path: path.join(__dirname, '..', '.scratch', 'character-art', 'rig-neutral.png') });
    await page.screenshot({
      path: path.join(__dirname, '..', '.scratch', 'character-art', 'rig-neutral-close.png'),
      clip: {
        x: canvas.x + 430 * canvas.width / 1024,
        y: canvas.y + 345 * canvas.height / 768,
        width: 164 * canvas.width / 1024,
        height: 164 * canvas.height / 768,
      },
    });
    await page.keyboard.down('d');
    const gaitSamples = [];
    for (let frame = 0; frame < 16; frame += 1) {
      await page.waitForTimeout(24);
      gaitSamples.push(await page.evaluate(() => (
        window.__characterTestGame.scene.getScene('Game').character.rigSnapshot().gait
      )));
    }
    assert.ok(gaitSamples.every(Boolean), 'the public rig snapshot should expose gait state');
    assertPlantedSupport(gaitSamples, 'right-facing gait');
    await page.screenshot({
      path: path.join(__dirname, '..', '.scratch', 'character-art', 'gait-forward.png'),
      clip: {
        x: canvas.x + 430 * canvas.width / 1024,
        y: canvas.y + 345 * canvas.height / 768,
        width: 250 * canvas.width / 1024,
        height: 164 * canvas.height / 768,
      },
    });
    const movingJoints = await page.evaluate(() => (
      window.__characterTestGame.scene.getScene('Game').character.rigSnapshot().connectionErrors
    ));
    await page.keyboard.up('d');
    await page.waitForTimeout(140);
    Object.entries(movingJoints).forEach(([name, error]) => {
      assert.ok(error < 1, `${name} must remain connected while moving; got ${error}`);
    });
    const leftFacingPlayer = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      return { x: scene.player.x, y: scene.player.y };
    });
    const leftFacingPoint = screenPoint(leftFacingPlayer.x - 100, leftFacingPlayer.y);
    await page.mouse.move(leftFacingPoint.x, leftFacingPoint.y);
    await page.waitForTimeout(60);
    await page.keyboard.down('a');
    const leftFacingGaitSamples = [];
    for (let frame = 0; frame < 16; frame += 1) {
      await page.waitForTimeout(24);
      leftFacingGaitSamples.push(await page.evaluate(() => (
        window.__characterTestGame.scene.getScene('Game').character.rigSnapshot().gait
      )));
    }
    await page.keyboard.up('a');
    assertPlantedSupport(leftFacingGaitSamples, 'left-facing gait');
    await page.evaluate(() => {
      window.__characterTestGame.scene.getScene('Game').player.x = 952;
    });
    const blockedPhase = await page.evaluate(() => (
      window.__characterTestGame.scene.getScene('Game').character.rigSnapshot().gait.phase
    ));
    await page.keyboard.down('d');
    await page.waitForTimeout(140);
    await page.keyboard.up('d');
    const phaseAtBoundary = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      const phase = scene.character.rigSnapshot().gait.phase;
      scene.player.x = 512;
      return phase;
    });
    assert.ok(
      Math.abs(phaseAtBoundary - blockedPhase) < 0.000001,
      'gait phase must not advance when the arena boundary blocks movement',
    );
    const player = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      return { x: scene.player.x, y: scene.player.y };
    });
    const left = screenPoint(player.x - 100, player.y);
    await page.mouse.move(left.x, left.y);
    await page.waitForTimeout(60);
    assert.deepEqual(await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { facing: character.facing, mirrored: character.visual.scaleX < 0 };
    }), { facing: 'left', mirrored: true });
    const right = screenPoint(player.x + 100, player.y);
    await page.mouse.move(right.x, right.y);
    await page.waitForTimeout(60);
    await page.evaluate(() => {
      window.__characterTestGame.scene.getScene('Game').encounterCleared = false;
    });
    await page.mouse.click(right.x, right.y);
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.action === 'attack' && character.actionElapsed >= 100;
    });
    const attackGripError = await page.evaluate(() => (
      window.__characterTestGame.scene.getScene('Game').character.rigSnapshot().connectionErrors.knifeGrip
    ));
    assert.ok(attackGripError < 1, `the knife must remain connected during attack; got ${attackGripError}`);
    console.log('PASS the real battle scene renders the connected rig with planted distance-driven gait');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
