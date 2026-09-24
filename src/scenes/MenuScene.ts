import Phaser from 'phaser';
import { InkTextureGenerator } from '../visuals/InkTextures';
import { InkVFX } from '../visuals/InkAtmosphere';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#171c18');
    const ink = this.add.graphics();
    ink.fillStyle(0xd8d1bd, 1).fillRect(0, 0, 1024, 768);
    ink.fillStyle(0x27312a, 0.82);
    ink.fillTriangle(0, 620, 260, 180, 530, 620);
    ink.fillStyle(0x4a554b, 0.55);
    ink.fillTriangle(310, 620, 620, 240, 870, 620);
    ink.fillStyle(0x202820, 0.9).fillRect(0, 620, 1024, 148);
    this.add.circle(826, 128, 52, 0xb34e3d, 0.86);
    this.add.text(826, 128, '造', { fontFamily: 'serif', fontSize: '40px', color: '#f2e7d3' }).setOrigin(0.5);

    this.add.text(512, 198, '汉 字 世 界', {
      fontSize: '68px', color: '#242b25', fontFamily: 'serif'
    }).setOrigin(0.5);

    this.add.text(512, 285, '异界侵墨 · 以字为兵', {
      fontSize: '22px', color: '#5b6057'
    }).setOrigin(0.5);

    InkTextureGenerator.generateAll(this);

    const startBtnContainer = this.add.container(512, 452);
    const startBtnImg = this.add.image(0, 0, 'tx_brush_btn_large_gold').setOrigin(0.5).setInteractive({ useHandCursor: true });
    const startBtnText = this.add.text(0, 0, '进入归字营', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '22px',
      color: '#1a241b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    startBtnContainer.add([startBtnImg, startBtnText]);

    startBtnImg.on('pointerover', () => startBtnContainer.setScale(1.05));
    startBtnImg.on('pointerout', () => startBtnContainer.setScale(1.0));
    startBtnImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 10 });
      this.scene.start('Base');
    });

    this.add.text(512, 674, 'WASD 移动 · 左键连击 · Q / 右键施放 · 空格闪避', {
      fontSize: '15px', color: '#b9c1b8'
    }).setOrigin(0.5);
  }
}
