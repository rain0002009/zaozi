import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create(): void {
    this.cameras.main.setBackgroundColor('#0f0f23');

    this.add.text(512, 200, '汉字世界', {
      fontSize: '64px', color: '#e6e6e6', fontFamily: 'serif'
    }).setOrigin(0.5);

    this.add.text(512, 280, '异世界入侵', {
      fontSize: '24px', color: '#aaaaaa'
    }).setOrigin(0.5);

    const startBtn = this.add.text(512, 450, '[ 开始游戏 ]', {
      fontSize: '32px', color: '#4fc3f7', fontFamily: 'monospace'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#81d4fa'));
    startBtn.on('pointerout', () => startBtn.setColor('#4fc3f7'));
    startBtn.on('pointerdown', () => this.scene.start('Game'));

    this.add.text(512, 600, 'WASD移动 | 鼠标左键攻击 | 空格翻滚', {
      fontSize: '16px', color: '#666666'
    }).setOrigin(0.5);
  }
}
