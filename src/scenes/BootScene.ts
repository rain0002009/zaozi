import Phaser from 'phaser';
import { handwritingService } from '../services/HandwritingService';
import { strokeService } from '../services/StrokeService';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.cameras.main.setBackgroundColor('#0f0f23');
    this.add.text(512, 384, '加载中...', {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5);
  }

  create(): void {
    // Start handwriting service and stroke service initialization in background
    handwritingService.init();
    strokeService.init();
    this.scene.start('Menu');
  }
}
