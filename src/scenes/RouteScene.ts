import Phaser from 'phaser';
import { gameState, ROUTES, RouteId, generateRouteOptions } from '../state/GameState';
import { InkTextureGenerator } from '../visuals/InkTextures';
import { InkVFX } from '../visuals/InkAtmosphere';
import { wrapChineseText } from '../visuals/textWrap';

export class RouteScene extends Phaser.Scene {
  constructor() { super('Route'); }

  create(): void {
    const run = gameState.expedition ?? gameState.startExpedition();
    this.cameras.main.setBackgroundColor('#161d19');
    InkTextureGenerator.generateAll(this);
    this.drawMap(run.area);
  }

  private drawMap(area: number): void {
    this.add.rectangle(0, 0, 1024, 768, 0x161d19).setOrigin(0);
    const ink = this.add.graphics();
    ink.lineStyle(3, 0x8a826a, 0.55);

    for (let i = 0; i < 16; i += 1) {
      ink.fillStyle(0xe1d5b6, Phaser.Math.FloatBetween(0.04, 0.12));
      ink.fillCircle(Phaser.Math.Between(20, 1004), Phaser.Math.Between(20, 748), Phaser.Math.Between(2, 8));
    }

    this.add.text(52, 40, '行 路 图', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '42px',
      color: '#e4ddc8',
      fontStyle: 'bold',
    });
    this.add.text(54, 94, `第 ${area} / 3 区域 · 选择下一条路`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '17px',
      color: '#9fac9e',
    });
    this.drawProgress(area);

    if (area >= 3) {
      ink.lineBetween(170, 396, 512, 375);
      ink.lineBetween(512, 375, 848, 396);
      this.drawRouteCard('boss', 512, 375, true);
      return;
    }

    const routes: RouteId[] = generateRouteOptions(area);
    const xs = routes.length === 3 ? [210, 512, 814] : [380, 644];

    xs.forEach((cx) => {
      ink.lineBetween(170, 396, cx, 375);
      ink.lineBetween(cx, 375, 848, 396);
    });

    routes.forEach((routeId, idx) => {
      this.drawRouteCard(routeId, xs[idx], 375, false);
    });
  }

  private drawProgress(area: number): void {
    const labels = ['荒域', '险域', '墨池'];
    labels.forEach((label, index) => {
      const x = 744 + index * 88;
      const active = index + 1 === area;
      const done = index + 1 < area;
      this.add.circle(x, 64, 16, done ? 0x78957b : active ? 0xd0ae68 : 0x3c4740).setStrokeStyle(1, 0x9ca797);
      this.add.text(x, 64, String(index + 1), {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '14px',
        color: active || done ? '#172019' : '#a6afa6',
      }).setOrigin(0.5);
      this.add.text(x, 92, label, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
        fontSize: '12px',
        color: active ? '#e3d4aa' : '#7f8a80',
      }).setOrigin(0.5);
    });
  }

  private drawRouteCard(routeId: RouteId, x: number, y: number, boss: boolean): void {
    const route = ROUTES[routeId];
    const width = boss ? 340 : 244;
    const height = 344;
    const card = this.add.rectangle(x, y, width, height, 0x1d2720, 0.98).setStrokeStyle(2, route.accent);

    const seal = this.add.circle(x, y - 106, 32, route.accent, 0.9);
    const character = boss
      ? '墨'
      : routeId === 'wilds'
      ? '荒'
      : routeId === 'ruins'
      ? '碑'
      : routeId === 'ember'
      ? '火'
      : routeId === 'rift'
      ? '鬼'
      : '谜';
    this.add.text(x, y - 106, character, {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '32px',
      color: '#f4ead7',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(x, y - 50, route.title, {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '24px',
      color: '#eee8d9',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(x, y - 20, `${route.subtitle} · ${route.danger}`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '13px',
      color: '#d3b77f',
    }).setOrigin(0.5);

    const maxChars = boss ? 15 : 13;
    const wrappedDesc = wrapChineseText(route.description, maxChars);
    this.add.text(x, y + 30, wrappedDesc, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '13px',
      color: '#b2c0b0',
      align: 'center',
      lineSpacing: 6,
    }).setOrigin(0.5);

    // Enter button as refined plaque button
    const enterContainer = this.add.container(x, y + 124);
    const btnKey = boss ? 'tx_brush_btn_gold' : 'tx_brush_btn_small_gold';
    const btnImg = this.add.image(0, 0, btnKey).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const enterText = boss ? '迎 战' : routeId === 'secret_riddle' ? '探 秘' : '踏 入';
    const enter = this.add.text(0, 0, enterText, {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: boss ? '16px' : '14px',
      color: '#1a241b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    enterContainer.add([btnImg, enter]);

    btnImg.on('pointerover', () => enterContainer.setScale(1.06));
    btnImg.on('pointerout', () => enterContainer.setScale(1.0));

    const selectRouteAction = (pointer?: Phaser.Input.Pointer) => {
      if (pointer) {
        InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 9 });
      }
      gameState.selectRoute(routeId);
      if (routeId === 'secret_riddle') {
        this.scene.start('SecretRiddle');
      } else {
        this.scene.start('Game');
      }
    };

    for (const target of [card, seal, btnImg]) {
      target.setInteractive({ useHandCursor: true });
      target.on('pointerdown', (pointer: Phaser.Input.Pointer) => selectRouteAction(pointer));
    }
  }
}
