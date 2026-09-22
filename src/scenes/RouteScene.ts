import Phaser from 'phaser';
import { gameState, ROUTES, RouteId, generateRouteOptions } from '../state/GameState';

export class RouteScene extends Phaser.Scene {
  constructor() { super('Route'); }

  create(): void {
    const run = gameState.expedition ?? gameState.startExpedition();
    this.cameras.main.setBackgroundColor('#161d19');
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

    this.add.text(52, 40, '行 路 图', { fontFamily: 'serif', fontSize: '42px', color: '#e4ddc8' });
    this.add.text(54, 94, `第 ${area} / 3 区域 · 选择下一条路`, { fontSize: '17px', color: '#9fac9e' });
    this.drawProgress(area);

    if (area >= 3) {
      ink.lineBetween(170, 386, 512, 368);
      ink.lineBetween(512, 368, 848, 386);
      this.drawRouteCard('boss', 512, 368, true);
      return;
    }

    const routes: RouteId[] = generateRouteOptions(area);
    const xs = routes.length === 3 ? [210, 512, 814] : [380, 644];

    xs.forEach((cx) => {
      ink.lineBetween(170, 386, cx, 358);
      ink.lineBetween(cx, 358, 848, 386);
    });

    routes.forEach((routeId, idx) => {
      this.drawRouteCard(routeId, xs[idx], 358, false);
    });
  }

  private drawProgress(area: number): void {
    const labels = ['荒域', '险域', '墨池'];
    labels.forEach((label, index) => {
      const x = 744 + index * 88;
      const active = index + 1 === area;
      const done = index + 1 < area;
      this.add.circle(x, 64, 16, done ? 0x78957b : active ? 0xd0ae68 : 0x3c4740).setStrokeStyle(1, 0x9ca797);
      this.add.text(x, 64, String(index + 1), { fontSize: '14px', color: active || done ? '#172019' : '#a6afa6' }).setOrigin(0.5);
      this.add.text(x, 92, label, { fontSize: '12px', color: active ? '#e3d4aa' : '#7f8a80' }).setOrigin(0.5);
    });
  }

  private drawRouteCard(routeId: RouteId, x: number, y: number, boss: boolean): void {
    const route = ROUTES[routeId];
    const width = boss ? 330 : 230;
    const card = this.add.rectangle(x, y, width, 300, 0x26312a, 0.98).setStrokeStyle(2, route.accent);
    const seal = this.add.circle(x, y - 92, 34, route.accent, 0.9);
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
    this.add.text(x, y - 92, character, { fontFamily: 'serif', fontSize: '35px', color: '#f4ead7' }).setOrigin(0.5);
    this.add.text(x, y - 32, route.title, { fontFamily: 'serif', fontSize: '26px', color: '#eee8d9' }).setOrigin(0.5);
    this.add.text(x, y + 4, `${route.subtitle} · ${route.danger}`, { fontSize: '14px', color: '#d3b77f' }).setOrigin(0.5);
    this.add.text(x, y + 52, route.description, { fontSize: '14px', color: '#aeb9ae', align: 'center', wordWrap: { width: width - 46 }, lineSpacing: 6 }).setOrigin(0.5);
    const enterText = boss ? '迎 战' : routeId === 'secret_riddle' ? '探 秘' : '踏 入';
    const enterBg = routeId === 'secret_riddle' ? '#e2c56a' : '#d7c796';
    const enter = this.add.text(x, y + 112, enterText, { fontSize: '17px', color: '#1e241f', backgroundColor: enterBg, padding: { x: 20, y: 9 } }).setOrigin(0.5);
    for (const target of [card, seal, enter]) {
      target.setInteractive({ useHandCursor: true });
      target.on('pointerdown', () => {
        gameState.selectRoute(routeId);
        if (routeId === 'secret_riddle') {
          this.scene.start('SecretRiddle');
        } else {
          this.scene.start('Game');
        }
      });
    }
  }
}
