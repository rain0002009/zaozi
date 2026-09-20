const assert = require('node:assert/strict');
const path = require('node:path');
const sharp = require('sharp');
const { chromium } = require(require.resolve('playwright', {
  paths: [path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules')],
}));

const GAME_URL = process.env.GAME_URL ?? 'http://127.0.0.1:5175/';

async function worldPoint(page, x, y) {
  const box = await page.locator('canvas').boundingBox();
  assert.ok(box, 'game canvas must be visible');
  return {
    x: box.x + x * box.width / 1024,
    y: box.y + y * box.height / 768,
  };
}

async function movePointer(page, x, y) {
  const point = await worldPoint(page, x, y);
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(50);
}

async function captureBodyPose(page, outputPath) {
  const player = await page.evaluate(() => {
    const scene = window.__characterTestGame.scene.getScene('Game');
    scene.paused = true;
    scene.character.rig.knife.setVisible(false);
    scene.children.getByName('knife-trail')?.setVisible(false);
    return { x: scene.player.x, y: scene.player.y };
  });
  const box = await page.locator('canvas').boundingBox();
  assert.ok(box, 'game canvas must be visible for body-pose capture');
  const logicalCrop = { x: player.x - 82, y: player.y - 116, width: 164, height: 164 };
  await page.screenshot({
    path: outputPath,
    clip: {
      x: box.x + logicalCrop.x * box.width / 1024,
      y: box.y + logicalCrop.y * box.height / 768,
      width: logicalCrop.width * box.width / 1024,
      height: logicalCrop.height * box.height / 768,
    },
  });
  await page.evaluate(() => {
    const scene = window.__characterTestGame.scene.getScene('Game');
    scene.character.rig.knife.setVisible(true);
    scene.children.getByName('knife-trail')?.setVisible(true);
    scene.paused = false;
  });
}

async function makeBodyPoseSheet(panelPaths, outputPath) {
  const panelSize = 360;
  const header = 42;
  const panels = await Promise.all(panelPaths.map((panelPath) => (
    sharp(panelPath).resize(panelSize, panelSize, { fit: 'cover' }).png().toBuffer()
  )));
  const labels = Buffer.from(`
    <svg width="${panelSize * 3}" height="${header * 2 + panelSize * 2}">
      <style>.label { font: 700 22px sans-serif; fill: #e8e0cd; }</style>
      <text class="label" x="18" y="29">1 WINDUP</text>
      <text class="label" x="378" y="29">2 WINDUP</text>
      <text class="label" x="738" y="29">3 WINDUP</text>
      <text class="label" x="18" y="431">1 STRIKE</text>
      <text class="label" x="378" y="431">2 STRIKE</text>
      <text class="label" x="738" y="431">3 STRIKE</text>
    </svg>
  `);
  await sharp({
    create: {
      width: panelSize * 3,
      height: header * 2 + panelSize * 2,
      channels: 4,
      background: '#172019',
    },
  }).composite([
    { input: panels[0], left: 0, top: header },
    { input: panels[1], left: panelSize, top: header },
    { input: panels[2], left: panelSize * 2, top: header },
    { input: panels[3], left: 0, top: panelSize + header * 2 },
    { input: panels[4], left: panelSize, top: panelSize + header * 2 },
    { input: panels[5], left: panelSize * 2, top: panelSize + header * 2 },
    { input: labels, left: 0, top: 0 },
  ]).png().toFile(outputPath);
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(() => {
      localStorage.setItem('zaozi-save-v1', JSON.stringify({
        inventory: { '一': 0, '丨': 0, '丿': 0, '㇏': 0, '丶': 0, '㇇': 0 },
        unlockedWords: ['刀', '火'],
        equippedWords: ['刀', '火'],
        victories: 0,
      }));
    });
    page.on('pageerror', (error) => console.error('page error:', error.message));
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
    });

    const player = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      return { x: scene.player.x, y: scene.player.y };
    });

    const sideRig = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return {
        layers: character.visual.list.length,
        textures: Object.fromEntries(Object.entries(character.rig).map(([name, sprite]) => [name, sprite.texture.key])),
      };
    });
    assert.equal(sideRig.layers, 9, 'the side-facing character should use all nine articulated layers');
    assert.deepEqual(sideRig.textures, {
      rearLeg: 'ren_rear_leg_side',
      rearArm: 'ren_rear_arm_side',
      torso: 'ren_torso_side',
      head: 'ren_head_side',
      frontLeg: 'ren_front_leg_side',
      weaponUpperArm: 'ren_weapon_upper_arm_side',
      weaponForearm: 'ren_weapon_forearm_side',
      weaponHand: 'ren_weapon_hand_side',
      knife: 'ren_weapon_knife',
    }, 'the runtime rig should use the approved side-facing source parts');

    console.log('PASS the player uses the nine-layer side-facing rig');

    await movePointer(page, player.x + 100, player.y);
    const right = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { facing: character.facing, scaleX: character.visual.scaleX };
    });
    assert.equal(right.facing, 'right', 'pointer right of the character should select the right attack side');
    assert.ok(right.scaleX > 0, 'right attack side should use the source orientation');

    await movePointer(page, player.x - 100, player.y);
    const left = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { facing: character.facing, scaleX: character.visual.scaleX };
    });
    assert.equal(left.facing, 'left', 'pointer left of the character should select the left attack side');
    assert.ok(left.scaleX < 0, 'left attack side should mirror the character');

    await movePointer(page, player.x + 10, player.y);
    assert.equal(await page.evaluate(() => window.__characterTestGame.scene.getScene('Game').character.facing), 'left',
      'the 20px center dead zone should preserve the current attack side');

    await page.keyboard.down('d');
    await page.waitForTimeout(120);
    await page.keyboard.up('d');
    assert.equal(await page.evaluate(() => window.__characterTestGame.scene.getScene('Game').character.facing), 'left',
      'movement should not control the attack side');

    console.log('PASS pointer selects a stable attack side independently from movement');

    await page.keyboard.down('Space');
    await page.waitForTimeout(30);
    await page.keyboard.up('Space');
    await page.waitForTimeout(30);
    const leftDodge = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { action: character.action, facing: character.facing, scaleX: character.visual.scaleX };
    });
    assert.equal(leftDodge.action, 'dodge', 'space should enter the existing dodge state');
    assert.equal(leftDodge.facing, 'left', 'dodge should preserve the selected attack side');
    assert.ok(leftDodge.scaleX < 0, 'a left-facing dodge should preserve the mirrored side silhouette');
    await page.waitForTimeout(260);

    console.log('PASS dodge preserves the selected side silhouette');

    const attackSetup = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.player.setPosition(512, 555);
      scene.encounterCleared = false;
      scene.attackCooldown = 0;
      scene.spawnEnemy('chaser', '右', 602, 555);
      scene.spawnEnemy('chaser', '右上', 576, 491);
      scene.spawnEnemy('chaser', '上', 512, 465);
      scene.spawnEnemy('chaser', '左', 422, 555);
      scene.enemies.forEach((enemy) => {
        enemy.speed = 0;
        enemy.attackCooldown = 99999;
      });
      return { x: scene.player.x, y: scene.player.y };
    });
    const attackPoint = await worldPoint(page, attackSetup.x + 100, attackSetup.y - 300);
    await page.mouse.click(attackPoint.x, attackPoint.y);
    await page.waitForTimeout(30);
    await movePointer(page, attackSetup.x - 100, attackSetup.y);
    assert.equal(await page.evaluate(() => window.__characterTestGame.scene.getScene('Game').character.facing), 'right',
      'moving the pointer across the character must not mirror an attack in progress');
    await movePointer(page, attackSetup.x + 100, attackSetup.y);
    await page.waitForTimeout(60);
    const hitPoints = await page.evaluate(() => Object.fromEntries(
      window.__characterTestGame.scene.getScene('Game').enemies.map((enemy) => [enemy.name, enemy.hp]),
    ));
    assert.equal(hitPoints['右'], 3, 'right-side enemy should be hit when the pointer is anywhere on the right');
    assert.equal(hitPoints['右上'], 3, 'upper-right enemy should remain inside the 120 degree attack side');
    assert.equal(hitPoints['上'], 4, 'enemy directly above should remain in the melee blind zone');
    assert.equal(hitPoints['左'], 4, 'enemy on the opposite attack side should not be hit');

    console.log('PASS melee hits the selected attack side and preserves vertical blind zones');

    const followUpPoint = await worldPoint(page, attackSetup.x + 100, attackSetup.y);
    await page.mouse.click(followUpPoint.x, followUpPoint.y);
    await page.waitForTimeout(110);
    const combo = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { step: character.comboStep, action: character.action };
    });
    assert.deepEqual(combo, { step: 2, action: 'attack' },
      'a click in the input window should buffer and start the second knife attack');

    console.log('PASS a late first-attack input continues into the second combo step');

    await movePointer(page, attackSetup.x - 100, attackSetup.y);
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.comboStep === 2 && character.actionElapsed >= 140 && character.actionElapsed < 200;
    });
    const reversePoint = await worldPoint(page, attackSetup.x - 100, attackSetup.y);
    await page.mouse.click(reversePoint.x, reversePoint.y);
    await page.waitForTimeout(100);
    const reversedCombo = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { step: character.comboStep, facing: character.facing, action: character.action };
    });
    assert.deepEqual(reversedCombo, { step: 3, facing: 'left', action: 'attack' },
      'the next combo step should read the pointer side and may reverse direction');

    console.log('PASS each attack locks its side while the next combo step may reverse');

    await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      const target = scene.enemies.find((enemy) => enemy.name === '左');
      target.hp = target.maxHp;
      target.healthFill.scaleX = 1;
      target.body.setPosition(scene.player.x - 120, scene.player.y);
    });
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.comboStep === 3 && character.actionElapsed >= 205;
    });
    const finisherTarget = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      const target = scene.enemies.find((enemy) => enemy.name === '左');
      return { hp: target.hp, x: target.body.x, playerX: scene.player.x };
    });
    assert.equal(finisherTarget.hp, 2, 'the third knife attack should deal 2 damage');
    assert.ok(finisherTarget.x <= attackSetup.x - 147,
      'the third knife attack should apply stronger knockback than the standard 16px');
    assert.ok(finisherTarget.playerX <= attackSetup.x - 17,
      'the third knife attack should step toward its locked attack side');

    console.log('PASS the third knife attack has finisher range, damage, and knockback');

    await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character?.action === 'idle');
    const poseSetup = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.enemies.forEach((enemy) => enemy.body.destroy());
      scene.enemies.length = 0;
      scene.encounterCleared = false;
      scene.player.setPosition(512, 555);
      return { x: scene.player.x, y: scene.player.y };
    });
    const posePoint = await worldPoint(page, poseSetup.x + 120, poseSetup.y);
    const bladeAtHit = async (step) => {
      await page.waitForFunction((expectedStep) => {
        const character = window.__characterTestGame.scene.getScene('Game').character;
        return character.comboStep === expectedStep && character.attackHitSent;
      }, step);
      return page.evaluate(() => window.__characterTestGame.scene.getScene('Game').character.rig.knife.rotation);
    };

    await page.mouse.click(posePoint.x, posePoint.y);
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.comboStep === 1 && character.actionElapsed >= 100;
    });
    const sampledTrail = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      const trail = scene.children.getByName('knife-trail');
      if (!trail || typeof scene.character.weaponTipWorld !== 'function') return { exists: false };
      const tip = scene.character.weaponTipWorld();
      const sampledTip = trail.getData('tip');
      const renderedTip = scene.character.rig.knife.getWorldTransformMatrix().transformPoint(40, 0);
      return {
        exists: true,
        points: trail.getData('pointCount'),
        tipDistance: Math.hypot(tip.x - sampledTip.x, tip.y - sampledTip.y),
        renderedTipDistance: Math.hypot(renderedTip.x - sampledTip.x, renderedTip.y - sampledTip.y),
      };
    });
    assert.equal(sampledTrail.exists, true, 'a knife trail should exist while the blade is moving');
    assert.ok(sampledTrail.points >= 2, 'the knife trail should contain multiple sampled blade positions');
    assert.ok(sampledTrail.tipDistance < 2, 'the visible trail endpoint should follow the actual knife tip');
    assert.ok(sampledTrail.renderedTipDistance < 2, 'the trail endpoint should match the rendered blade tip');

    console.log('PASS the ink trail samples the actual moving knife tip');

    const firstBlade = await bladeAtHit(1);
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game').character.canAttack);
    await page.mouse.click(posePoint.x, posePoint.y);
    const secondBlade = await bladeAtHit(2);
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game').character.canAttack);
    await page.mouse.click(posePoint.x, posePoint.y);
    const thirdBlade = await bladeAtHit(3);
    assert.ok(firstBlade > 0.35, 'the first knife attack should finish its downward cut');
    assert.ok(secondBlade < -0.35, 'the second knife attack should reverse into an upward cut');
    assert.ok(Math.abs(thirdBlade) < 0.35, 'the third knife attack should finish as a broad horizontal cut');

    console.log('PASS each knife combo step has a distinct visible blade trajectory');

    const bodyPosePanels = [];
    for (const side of ['right', 'left']) {
      await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
      await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character?.action === 'idle');
      const gripSetup = await page.evaluate(() => {
        const scene = window.__characterTestGame.scene.getScene('Game');
        scene.enemies.forEach((enemy) => enemy.body.destroy());
        scene.enemies.length = 0;
        scene.encounterCleared = false;
        scene.player.setPosition(512, 555);
        return { x: scene.player.x, y: scene.player.y };
      });
      const point = await worldPoint(page, gripSetup.x + (side === 'right' ? 120 : -120), gripSetup.y);
      const gripDistances = [];
      const armPoses = [];
      const jointTravel = [];
      for (let step = 1; step <= 3; step += 1) {
        await page.mouse.click(point.x, point.y);
        await page.waitForFunction((expectedStep) => {
          const character = window.__characterTestGame.scene.getScene('Game').character;
          return character.comboStep === expectedStep
            && character.actionElapsed >= character.attackSpec.activeAt * 0.48
            && character.actionElapsed < character.attackSpec.activeAt;
        }, step, { polling: 'raf' });
        const windup = await page.evaluate(() => {
          const rig = window.__characterTestGame.scene.getScene('Game').character.rig;
          const shoulder = rig.weaponUpperArm.getWorldTransformMatrix().transformPoint(0, 0);
          const elbow = rig.weaponForearm.getWorldTransformMatrix().transformPoint(0, 0);
          const wrist = rig.weaponHand.getWorldTransformMatrix().transformPoint(0, 0);
          return {
            upperArm: rig.weaponUpperArm.rotation,
            forearm: rig.weaponForearm.rotation,
            shoulder,
            elbow,
            wrist,
          };
        });
        if (side === 'right') {
          const windupPath = path.join(__dirname, `side-combat-body-windup-${step}.png`);
          bodyPosePanels[step - 1] = windupPath;
          await captureBodyPose(page, windupPath);
        }
        await page.waitForFunction((expectedStep) => {
          const character = window.__characterTestGame.scene.getScene('Game').character;
          return character.comboStep === expectedStep && character.attackHitSent;
        }, step);
        const pose = await page.evaluate(() => {
          const rig = window.__characterTestGame.scene.getScene('Game').character.rig;
          const handGrip = rig.weaponHand.getWorldTransformMatrix().transformPoint(0, 3);
          const knifeHandle = rig.knife.getWorldTransformMatrix().transformPoint(0, 0);
          return {
            gripDistance: Math.hypot(handGrip.x - knifeHandle.x, handGrip.y - knifeHandle.y),
            upperArm: rig.weaponUpperArm.rotation,
            forearm: rig.weaponForearm.rotation,
            shoulder: rig.weaponUpperArm.getWorldTransformMatrix().transformPoint(0, 0),
            elbow: rig.weaponForearm.getWorldTransformMatrix().transformPoint(0, 0),
            wrist: rig.weaponHand.getWorldTransformMatrix().transformPoint(0, 0),
          };
        });
        gripDistances.push(pose.gripDistance);
        armPoses.push([pose.upperArm, pose.forearm]);
        jointTravel.push({
          upperArm: Math.abs(pose.upperArm - windup.upperArm),
          forearm: Math.abs(pose.forearm - windup.forearm),
          shoulder: Math.hypot(pose.shoulder.x - windup.shoulder.x, pose.shoulder.y - windup.shoulder.y),
          elbow: Math.hypot(pose.elbow.x - windup.elbow.x, pose.elbow.y - windup.elbow.y),
          wrist: Math.hypot(pose.wrist.x - windup.wrist.x, pose.wrist.y - windup.wrist.y),
        });
        if (side === 'right') {
          const strikePath = path.join(__dirname, `side-combat-body-strike-${step}.png`);
          bodyPosePanels[step + 2] = strikePath;
          await captureBodyPose(page, strikePath);
        }
        await page.screenshot({ path: path.join(__dirname, `side-combat-${side}-step-${step}.png`) });
        if (step < 3) {
          await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game').character.canAttack);
        }
      }
      assert.ok(gripDistances.every((distance) => distance < 1),
        `${side}-facing knife handle should stay connected to the hand through all three attacks`);
      assert.ok(new Set(armPoses.map(([upper, forearm]) => `${upper.toFixed(2)}:${forearm.toFixed(2)}`)).size === 3,
        `${side}-facing shoulder and elbow should form a distinct pose for each attack`);
      assert.ok(jointTravel.every((travel) => travel.upperArm > 0.25 && travel.forearm > 0.45),
        `${side}-facing upper and lower arm must rotate visibly between windup and strike`);
      assert.ok(jointTravel.every((travel) => travel.shoulder > 4 && travel.elbow > 6 && travel.wrist > 9),
        `${side}-facing shoulder, elbow, and wrist must all travel visibly between windup and strike`);
    }

    await makeBodyPoseSheet(bodyPosePanels, path.join(__dirname, 'side-combat-body-poses.png'));

    console.log('PASS both facing directions use readable full-arm motion and keep the knife connected');

    await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character?.action === 'idle');
    await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.enemies.forEach((enemy) => enemy.body.destroy());
      scene.enemies.length = 0;
      scene.encounterCleared = true;
      scene.player.setPosition(512, 555);
    });
    await page.keyboard.down('d');
    await page.waitForFunction(() => {
      const rig = window.__characterTestGame.scene.getScene('Game').character.rig;
      return Math.abs(rig.rearLeg.rotation - rig.frontLeg.rotation) > 0.08;
    });
    await page.keyboard.up('d');

    console.log('PASS movement produces a readable alternating leg pose');

    await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.encounterCleared = false;
      scene.fireCooldown = 0;
    });
    const firePlayer = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      return { x: scene.player.x, y: scene.player.y };
    });
    const firePoint = await worldPoint(page, firePlayer.x, firePlayer.y - 140);
    await page.mouse.click(firePoint.x, firePoint.y, { button: 'right' });
    await page.waitForTimeout(40);
    const fireVelocity = await page.evaluate(() => {
      const projectiles = window.__characterTestGame.scene.getScene('Game').projectiles;
      const projectile = projectiles[projectiles.length - 1];
      return { x: projectile?.velocity.x, y: projectile?.velocity.y };
    });
    assert.ok(Math.abs(fireVelocity.x) < 8 && fireVelocity.y < -380,
      'the fire skill should retain full-direction aiming above the character');

    console.log('PASS ranged skills retain full-direction mouse aiming');

    await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.character.startAttack(0);
      scene.character.startHurt(0);
    });
    await page.waitForTimeout(80);
    const hurtState = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { action: character.action, comboStep: character.comboStep, layers: character.visual.list.length };
    });
    assert.deepEqual(hurtState, { action: 'hurt', comboStep: 0, layers: 9 },
      'taking damage should reset the combo while preserving the side-facing rig');
    await page.screenshot({ path: path.join(__dirname, 'side-combat-hurt.png') });
    await page.evaluate(() => window.__characterTestGame.scene.getScene('Game').character.startDeath());
    await page.waitForTimeout(280);
    const deathState = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { action: character.action, comboStep: character.comboStep, layers: character.visual.list.length };
    });
    assert.deepEqual(deathState, { action: 'dead', comboStep: 0, layers: 9 },
      'death should reset the combo while preserving the side-facing rig');
    await page.screenshot({ path: path.join(__dirname, 'side-combat-death.png') });

    console.log('PASS hurt and death reset the combo on the same side-facing rig');

    await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character?.action === 'idle');
    await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.enemies.forEach((enemy) => enemy.body.destroy());
      scene.enemies.length = 0;
      scene.encounterCleared = false;
      scene.player.setPosition(512, 555);
    });

    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game').character.canDodge);
    await page.keyboard.down('Space');
    await page.waitForTimeout(30);
    await page.keyboard.up('Space');
    await page.waitForTimeout(30);
    const cancelledCombo = await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { step: character.comboStep, action: character.action };
    });
    assert.deepEqual(cancelledCombo, { step: 0, action: 'dodge' },
      'dodging in the cancel window should stop and reset the combo');

    console.log('PASS dodge cancellation resets the weapon combo');

    await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character?.action === 'idle');
    const timeoutSetup = await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.enemies.forEach((enemy) => enemy.body.destroy());
      scene.enemies.length = 0;
      scene.encounterCleared = false;
      scene.player.setPosition(512, 555);
      return { x: scene.player.x, y: scene.player.y };
    });
    const timeoutPoint = await worldPoint(page, timeoutSetup.x + 120, timeoutSetup.y);
    await page.mouse.click(timeoutPoint.x, timeoutPoint.y);
    await page.waitForFunction(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return character.comboStep === 1 && character.action === 'idle';
    });
    await page.waitForTimeout(500);
    assert.deepEqual(await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { step: character.comboStep, action: character.action };
    }), { step: 1, action: 'idle' }, 'the combo must not advance without another click');
    await page.mouse.click(timeoutPoint.x, timeoutPoint.y);
    await page.waitForTimeout(30);
    assert.deepEqual(await page.evaluate(() => {
      const character = window.__characterTestGame.scene.getScene('Game').character;
      return { step: character.comboStep, action: character.action };
    }), { step: 1, action: 'attack' }, 'an expired combo should restart from the first attack');

    console.log('PASS an uncontinued or expired combo returns to the first attack');

    await page.evaluate(() => window.__characterTestGame.scene.start('Game'));
    await page.waitForFunction(() => window.__characterTestGame.scene.getScene('Game')?.character?.action === 'idle');
    await page.evaluate(() => {
      const scene = window.__characterTestGame.scene.getScene('Game');
      scene.enemies.forEach((enemy) => enemy.body.destroy());
      scene.enemies.length = 0;
      scene.encounterCleared = true;
      scene.player.setPosition(512, 430);
    });
    await movePointer(page, 640, 430);
    const desktopPath = path.join(__dirname, 'side-combat-desktop.png');
    await page.screenshot({ path: desktopPath });
    const desktopCanvasPath = path.join(__dirname, 'side-combat-desktop-canvas.png');
    await page.locator('canvas').screenshot({ path: desktopCanvasPath });
    const desktopStats = await sharp(desktopCanvasPath).stats();
    assert.ok(desktopStats.entropy > 2, 'the desktop game canvas should render nonblank scene pixels');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(200);
    const mobilePath = path.join(__dirname, 'side-combat-mobile.png');
    await page.screenshot({ path: mobilePath });
    const mobileCanvasPath = path.join(__dirname, 'side-combat-mobile-canvas.png');
    await page.locator('canvas').screenshot({ path: mobileCanvasPath });
    const mobileStats = await sharp(mobileCanvasPath).stats();
    assert.ok(mobileStats.entropy > 2, 'the narrow-screen game canvas should render nonblank scene pixels');

    console.log('PASS desktop and narrow-screen visual captures render nonblank game scenes');
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
