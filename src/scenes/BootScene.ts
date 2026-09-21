import Phaser from 'phaser';
import { RIG_TEXTURE_KEYS } from '../entities/CharacterRig';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.cameras.main.setBackgroundColor('#0f0f23');
    this.add.text(512, 384, '加载中...', {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5);
    RIG_TEXTURE_KEYS.forEach((key) => this.load.image(key, `/assets/characters/ren/source/${key}.png`));
  }

  create(): void {
    this.scene.start('Menu');
  }
}
