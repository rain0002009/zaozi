import Phaser from 'phaser';
import { gameState, STROKES, Settlement, WORDS, WordId } from '../state/GameState';

type BaseSceneData = { settlement?: Settlement };

export class BaseScene extends Phaser.Scene {
  constructor() { super('Base'); }

  create(data: BaseSceneData): void {
    this.cameras.main.setBackgroundColor('#d7d0bc');
    this.drawInkLandscape();

    this.add.text(54, 40, '归 字 营', {
      fontFamily: 'serif', fontSize: '46px', color: '#242821',
    });
    this.add.text(56, 98, '人族最后的造字之所', {
      fontSize: '16px', color: '#60655b',
    });

    this.drawInventory();
    this.drawWordWorkshop();
    this.drawExpeditionGate();
    if (data.settlement) this.drawSettlement(data.settlement);
  }

  private drawInkLandscape(): void {
    const ink = this.add.graphics();
    ink.fillStyle(0xebe6d8, 1).fillRect(0, 0, 1024, 768);
    ink.fillStyle(0xb6b9a6, 0.45);
    ink.fillTriangle(0, 310, 240, 98, 430, 310);
    ink.fillTriangle(215, 310, 480, 142, 690, 310);
    ink.fillStyle(0x737c70, 0.28);
    ink.fillTriangle(570, 300, 795, 104, 1024, 300);
    ink.fillStyle(0x313a31, 0.9).fillRect(0, 682, 1024, 86);
    for (let index = 0; index < 24; index += 1) {
      const x = 20 + index * 46;
      ink.lineStyle(2, 0x697064, 0.17).lineBetween(x, 0, x - 110, 682);
    }
    this.add.circle(868, 95, 44, 0xb84f3e, 0.82);
    this.add.text(868, 95, '造', { fontFamily: 'serif', fontSize: '34px', color: '#f0e9d8' }).setOrigin(0.5);
  }

  private drawInventory(): void {
    this.add.rectangle(50, 146, 924, 94, 0x202a24, 0.94).setOrigin(0).setStrokeStyle(1, 0x748070);
    this.add.text(72, 164, '仓中笔画', { fontSize: '17px', color: '#bec8b8' });
    STROKES.forEach((stroke, index) => {
      const x = 216 + index * 112;
      this.add.text(x, 166, stroke, { fontFamily: 'serif', fontSize: '25px', color: '#f0dfb3' }).setOrigin(0.5, 0);
      this.add.text(x, 205, String(gameState.meta.inventory[stroke]), { fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
    });
  }

  private drawWordWorkshop(): void {
    this.add.text(52, 274, '造字台', { fontFamily: 'serif', fontSize: '30px', color: '#283029' });
    this.add.text(52, 312, '笔画必须组成正确的字，能力才会在战场显现。', { fontSize: '15px', color: '#62675f' });

    const words: WordId[] = ['刀', '火', '盾'];
    words.forEach((word, index) => {
      const x = 52 + index * 244;
      const unlocked = gameState.meta.unlockedWords.includes(word);
      const canCraft = gameState.canCraft(word);
      const card = this.add.rectangle(x, 354, 220, 226, unlocked ? 0xe2e3d2 : 0xeee8d8, 0.98)
        .setOrigin(0).setStrokeStyle(2, unlocked ? 0x718873 : 0xa8a08d);
      this.add.text(x + 22, 374, word, {
        fontFamily: 'serif', fontSize: '52px', color: unlocked ? '#273c2c' : '#77756e',
      });
      this.add.text(x + 94, 382, WORDS[word].type, { fontSize: '14px', color: '#777166' });
      this.add.text(x + 22, 444, WORDS[word].summary, {
        fontSize: '14px', color: '#4b4c46', wordWrap: { width: 176 }, lineSpacing: 6,
      });
      const recipe = Object.entries(WORDS[word].recipe).map(([stroke, amount]) => `${stroke}×${amount}`).join('  ');
      this.add.text(x + 22, 510, recipe, { fontFamily: 'serif', fontSize: '16px', color: '#795e39' });

      const label = unlocked ? '已装备' : canCraft ? '合成' : '笔画不足';
      const button = this.add.text(x + 110, 552, label, {
        fontSize: '16px', color: unlocked ? '#667064' : canCraft ? '#f4ead2' : '#89867c',
        backgroundColor: canCraft && !unlocked ? '#754d38' : '#d3cdbc', padding: { x: 18, y: 8 },
      }).setOrigin(0.5);
      if (!unlocked && canCraft) {
        card.setInteractive({ useHandCursor: true });
        button.setInteractive({ useHandCursor: true });
        const craft = () => {
          if (gameState.craft(word)) this.scene.restart();
        };
        card.on('pointerdown', craft);
        button.on('pointerdown', craft);
      }
    });
  }

  private drawExpeditionGate(): void {
    this.add.rectangle(808, 354, 166, 226, 0x27322b, 0.98).setOrigin(0).setStrokeStyle(2, 0x9a8157);
    this.add.text(891, 378, '关', { fontFamily: 'serif', fontSize: '62px', color: '#e6d3a2' }).setOrigin(0.5, 0);
    this.add.text(891, 458, '三域试炼', { fontFamily: 'serif', fontSize: '21px', color: '#f1eee3' }).setOrigin(0.5);
    this.add.text(891, 491, `通关 ${gameState.meta.victories} 次`, { fontSize: '14px', color: '#aeb9ae' }).setOrigin(0.5);
    const start = this.add.text(891, 544, '出 征', {
      fontSize: '19px', color: '#2d271d', backgroundColor: '#d5ba78', padding: { x: 24, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    start.on('pointerover', () => start.setBackgroundColor('#ead394'));
    start.on('pointerout', () => start.setBackgroundColor('#d5ba78'));
    start.on('pointerdown', () => {
      gameState.startExpedition();
      this.scene.start('Route');
    });
  }

  private drawSettlement(settlement: Settlement): void {
    const title = settlement.outcome === 'victory' ? '凯旋归营' : settlement.outcome === 'retreat' ? '携墨归营' : '败退归营';
    const keptTotal = gameState.inventoryTotal(settlement.kept);
    const veil = this.add.rectangle(512, 384, 1024, 768, 0x111712, 0.66).setDepth(20);
    const panel = this.add.container(512, 384).setDepth(21);
    panel.add(this.add.rectangle(0, 0, 470, 260, 0xe8e1ce, 1).setStrokeStyle(3, 0x765b3f));
    panel.add(this.add.text(0, -88, title, { fontFamily: 'serif', fontSize: '36px', color: '#352d24' }).setOrigin(0.5));
    panel.add(this.add.text(0, -30, `抵达第 ${settlement.areaReached} 区域`, { fontSize: '16px', color: '#645b50' }).setOrigin(0.5));
    panel.add(this.add.text(0, 4, `带回笔画 ${keptTotal} 枚${settlement.lost ? ` · 遗失 ${settlement.lost} 枚` : ''}`, { fontSize: '18px', color: '#594329' }).setOrigin(0.5));
    const close = this.add.text(0, 74, '收 入 仓 中', { fontSize: '17px', color: '#f5ead1', backgroundColor: '#684d35', padding: { x: 22, y: 10 } }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => { panel.destroy(); veil.destroy(); });
    panel.add(close);
  }
}
