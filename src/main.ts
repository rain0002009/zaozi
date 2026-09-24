import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { BaseScene } from './scenes/BaseScene';
import { RouteScene } from './scenes/RouteScene';
import { GameScene } from './scenes/GameScene';
import { SecretRiddleScene } from './scenes/SecretRiddleScene';

// Ensure all Phaser Text objects use modern Chinese typography and high-DPI resolution
const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
const textDPR = Math.max(Math.ceil(dpr), 2);
const defaultFont = '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif';
const defaultSerifFont = '"LXGW WenKai", "霞鹜文楷", "STKaiti", "KaiTi", "楷体", serif';

const originalSetStyle = (Phaser.GameObjects.TextStyle.prototype as any).setStyle;
(Phaser.GameObjects.TextStyle.prototype as any).setStyle = function (style: any, updateText?: boolean, setDefaults?: boolean) {
  if (!style) {
    style = {};
  }
  if (!style.fontFamily) {
    style.fontFamily = defaultFont;
  } else if (style.fontFamily === 'serif' || style.fontFamily === 'calligraphy') {
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
  scene: [BootScene, MenuScene, BaseScene, RouteScene, GameScene, SecretRiddleScene]
};

import { mountWeaponEditor } from './editor/WeaponEditor';

const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
const isEditorView = urlParams && (
  urlParams.get('view') === 'weapon-editor' ||
  urlParams.get('view') === 'editor' ||
  urlParams.has('admin')
);

if (isEditorView) {
  mountWeaponEditor(document.body);
} else {
  const game = new Phaser.Game(config);
  (window as any).game = game;

  // Developer hotkey: F2 to open backend editor in new tab
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        window.open(window.location.pathname + '?view=weapon-editor', '_blank');
      }
    });
  }
}
