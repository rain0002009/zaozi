import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload(): void {
    this.cameras.main.setBackgroundColor('#0f0f23');
    this.add.text(512, 384, '加载中...', {
      fontSize: '24px', color: '#ffffff'
    }).setOrigin(0.5);
    const parts = [
      'rear_leg_side', 'rear_arm_side', 'torso_side', 'head_side', 'front_leg_side',
      'weapon_upper_arm_side', 'weapon_forearm_side', 'weapon_hand_side',
      'weapon_knife',
    ];
    parts.forEach((part) => this.load.image(`ren_${part}`, `/assets/characters/ren/source/ren_${part}.png`));
  }

  create(): void {
    this.scene.start('Menu');
  }
}
