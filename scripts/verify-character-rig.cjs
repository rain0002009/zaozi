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
    assert.ok(
      drift <= 1.5,
      `${label} ${foot} support sole drift should stay below 1.5 pixels; got ${drift}; samples ${JSON.stringify(run)}`,
    );
  });
}

function assertRigConnections(snapshot, label) {
  Object.entries(snapshot.connectionErrors).forEach(([name, error]) => {
    assert.ok(error < 1, `${label} ${name} connection error should be below one logical pixel; got ${error}`);
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
    assertRigConnections(result, 'neutral rig');
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
    const leftFacingPoint = screenPoint(leftFacingPlayer.x - 300, leftFacingPlayer.y);
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
      return character.action === 'attack' && character.comboStep === 1 && character.actionElapsed >= 69;
    });
    await page.keyboard.down('d');
    const movingAttackSamples = [];
    for (let frame = 0; frame < 4; frame += 1) {
      await page.waitForTimeout(16);
      movingAttackSamples.push(await page.evaluate(() => (
        window.__characterTestGame.scene.getScene('Game').character.rigSnapshot().gait
      )));
    }
    await page.keyboard.up('d');
    assert.ok(
      movingAttackSamples.every((sample) => sample.action === 'knife-downward-slash'),
      'limited movement must keep the first attack pose active',
    );
    assertPlantedSupport(movingAttackSamples, 'moving first attack');
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.action === 'attack' && character.comboStep === 1 && character.actionElapsed >= 143;
    });
    const firstStrike = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { facing: character.facing, mirrored: character.visual.scaleX < 0, rig: character.rigSnapshot() };
    });
    assert.equal(firstStrike.rig.gait.action, 'knife-downward-slash');
    assert.deepEqual(
      { facing: firstStrike.facing, mirrored: firstStrike.mirrored },
      { facing: 'right', mirrored: false },
    );
    assertRigConnections(firstStrike.rig, 'right-facing first strike');

    await page.mouse.move(left.x, left.y);
    await page.waitForFunction(() => (
      window.__characterTestGame.scene.getScene('Game').character.actionElapsed >= 156
    ));
    await page.mouse.click(left.x, left.y);
    assert.equal(
      await page.evaluate(() => window.__characterTestGame.scene.getScene('Game').character.facing),
      'right',
      'the attack side should remain locked until the current move ends',
    );
    await page.screenshot({
      path: path.join(__dirname, '..', '.scratch', 'character-art', 'attack-1-downward-strike.png'),
      clip: {
        x: canvas.x + 420 * canvas.width / 1024,
        y: canvas.y + 335 * canvas.height / 768,
        width: 220 * canvas.width / 1024,
        height: 190 * canvas.height / 768,
      },
    });
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.comboStep === 2 && character.actionElapsed >= 127;
    });
    const secondStrike = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { facing: character.facing, mirrored: character.visual.scaleX < 0, rig: character.rigSnapshot() };
    });
    assert.equal(secondStrike.rig.gait.action, 'knife-rising-cut');
    assert.deepEqual(
      { facing: secondStrike.facing, mirrored: secondStrike.mirrored },
      { facing: 'left', mirrored: true },
    );
    assertRigConnections(secondStrike.rig, 'left-facing second strike');
    await page.screenshot({
      path: path.join(__dirname, '..', '.scratch', 'character-art', 'attack-2-rising-strike.png'),
      clip: {
        x: canvas.x + 400 * canvas.width / 1024,
        y: canvas.y + 335 * canvas.height / 768,
        width: 220 * canvas.width / 1024,
        height: 190 * canvas.height / 768,
      },
    });

    await page.mouse.move(right.x, right.y);
    await page.waitForFunction(() => (
      window.__characterTestGame.scene.getScene('Game').character.actionElapsed >= 138
    ));
    await page.mouse.click(right.x, right.y);
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.comboStep === 3;
    });
    const finisherStartX = await page.evaluate(() => (
      window.__characterTestGame.scene.getScene('Game').player.x
    ));
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.comboStep === 3 && character.actionElapsed >= 198;
    });
    const finisher = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      return {
        facing: scene.character.facing,
        mirrored: scene.character.visual.scaleX < 0,
        playerX: scene.player.x,
        rig: scene.character.rigSnapshot(),
      };
    });
    assert.equal(finisher.rig.gait.action, 'knife-finisher-lunge');
    assert.deepEqual(
      { facing: finisher.facing, mirrored: finisher.mirrored },
      { facing: 'right', mirrored: false },
    );
    assert.ok(
      Math.abs((finisher.playerX - finisherStartX) - 18) <= 0.5,
      `the finisher should retain its 18 pixel lunge; got ${finisher.playerX - finisherStartX}`,
    );
    assertRigConnections(finisher.rig, 'right-facing finisher');
    await page.screenshot({
      path: path.join(__dirname, '..', '.scratch', 'character-art', 'attack-3-finisher-strike.png'),
      clip: {
        x: canvas.x + 420 * canvas.width / 1024,
        y: canvas.y + 335 * canvas.height / 768,
        width: 240 * canvas.width / 1024,
        height: 190 * canvas.height / 768,
      },
    });
    console.log('PASS the real battle scene renders connected gait and all three full-body knife attacks');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
