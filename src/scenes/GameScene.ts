import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create(): void {
    this.add.text(20, 20, 'Phaser + TypeScript 已就绪', {
      color: '#ffffff',
      fontSize: '20px',
    });
  }
}
