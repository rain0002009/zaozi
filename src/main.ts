import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { BaseScene } from './scenes/BaseScene';
import { RouteScene } from './scenes/RouteScene';
import { GameScene } from './scenes/GameScene';

// Ensure all Phaser Text objects use modern Chinese typography and high-DPI resolution
const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
const textDPR = Math.max(Math.ceil(dpr), 2);
const defaultFont = '"PingFang SC", "Microsoft YaHei", "Source Han Sans SC", "Noto Sans SC", sans-serif';
const defaultSerifFont = '"Source Han Serif SC", "Noto Serif SC", "Songti SC", "SimSun", serif';

const originalSetStyle = (Phaser.GameObjects.TextStyle.prototype as any).setStyle;
(Phaser.GameObjects.TextStyle.prototype as any).setStyle = function (style: any, updateText?: boolean, setDefaults?: boolean) {
  if (!style) {
    style = {};
  }
  if (!style.fontFamily) {
    style.fontFamily = defaultFont;
  } else if (style.fontFamily === 'serif') {
    style.fontFamily = defaultSerifFont;
  }
  if (style.resolution === undefined || style.resolution < textDPR) {
    style.resolution = textDPR;
  }
  return originalSetStyle.call(this, style, updateText, setDefaults);
};

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1024,
  height: 768,
  roundPixels: true,
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    antialiasGL: true,
    roundPixels: true,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false }
  },
  scene: [BootScene, MenuScene, BaseScene, RouteScene, GameScene]
};

const game = new Phaser.Game(config);
(window as any).game = game;
