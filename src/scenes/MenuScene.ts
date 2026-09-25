import Phaser from 'phaser';
import { InkTextureGenerator } from '../visuals/InkTextures';
import { InkAtmosphereManager, InkVFX } from '../visuals/InkAtmosphere';

export class MenuScene extends Phaser.Scene {
  private atmosphere?: InkAtmosphereManager;

  constructor() { super('Menu'); }

  preload(): void {
    if (!this.textures.exists('bg_opening_scroll')) {
      this.load.image('bg_opening_scroll', '/assets/backgrounds/bg_opening_scroll.jpg');
    }
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#0b100c');

    // 1. Procedural textures generator
    InkTextureGenerator.generateAll(this);

    // 2. Opening scroll background art
    if (this.textures.exists('bg_opening_scroll')) {
      this.add.image(512, 384, 'bg_opening_scroll')
        .setDisplaySize(1024, 768)
        .setOrigin(0.5);
    } else {
      // Fallback parchment
      const ink = this.add.graphics();
      ink.fillStyle(0xd8d1bd, 1).fillRect(0, 0, 1024, 768);
    }

    // 3. Central typography backdrop: soft dark ink vignette for pristine legibility
    const titleBackdrop = this.add.graphics();
    titleBackdrop.fillStyle(0x0e1410, 0.42);
    titleBackdrop.fillRoundedRect(180, 140, 664, 185, 24);
    titleBackdrop.fillStyle(0x0b100c, 0.28);
    titleBackdrop.fillRoundedRect(160, 126, 704, 213, 32);

    // 4. Main Title
    this.add.text(512, 204, '汉 字 世 界', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, "Noto Serif SC", serif',
      fontSize: '70px',
      color: '#f5edd8',
      fontStyle: 'bold',
      shadow: {
        offsetX: 2,
        offsetY: 3,
        color: '#080d09',
        blur: 12,
        stroke: true,
        fill: true,
      },
    }).setOrigin(0.5);

    // Vermilion Seal Stamp beside title (朱砂古印)
    const sealBg = this.add.graphics();
    sealBg.fillStyle(0x9e2d24, 0.92);
    sealBg.fillRoundedRect(728, 168, 48, 48, 6);
    sealBg.lineStyle(2, 0xd4776e, 0.85);
    sealBg.strokeRoundedRect(728, 168, 48, 48, 6);
    this.add.text(752, 192, '造\n字', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '16px',
      color: '#fbeee6',
      lineSpacing: -4,
      fontStyle: 'bold',
      align: 'center',
    }).setOrigin(0.5);

    // Subtitle
    this.add.text(512, 280, '异 界 侵 墨  ·  以 字 为 兵', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, "Noto Serif SC", serif',
      fontSize: '22px',
      color: '#d6c8ad',
      fontStyle: 'bold',
      shadow: {
        offsetX: 1,
        offsetY: 2,
        color: '#080d09',
        blur: 6,
        fill: true,
      },
    }).setOrigin(0.5);

    // 5. Floating Ink Atmosphere Particles
    this.atmosphere = new InkAtmosphereManager(this, 30, 8);
    this.events.once('shutdown', () => {
      if (this.atmosphere) this.atmosphere.destroy();
    });

    // 6. Enter Camp Button ("进入归字营" 印令按键)
    const startBtnContainer = this.add.container(512, 490);
    const startBtnImg = this.add.image(0, 0, 'tx_brush_btn_large_gold')
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const startBtnText = this.add.text(0, 0, '进入归字营', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '24px',
      color: '#1a241b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    startBtnContainer.add([startBtnImg, startBtnText]);

    startBtnImg.on('pointerover', () => startBtnContainer.setScale(1.05));
    startBtnImg.on('pointerout', () => startBtnContainer.setScale(1.0));
    startBtnImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 12 });
      this.scene.start('Base');
    });

    // 7. Operational controls prompt with dark pill backdrop
    const controlsBackdrop = this.add.graphics();
    controlsBackdrop.fillStyle(0x0b100c, 0.72);
    controlsBackdrop.fillRoundedRect(232, 696, 560, 36, 18);
    controlsBackdrop.lineStyle(1, 0x485848, 0.45);
    controlsBackdrop.strokeRoundedRect(232, 696, 560, 36, 18);

    this.add.text(512, 714, 'WASD 移动 · 左键连击 · Q / 右键施放 · 空格闪避', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '15px',
      color: '#b2c0b2',
    }).setOrigin(0.5);
  }
}
