import Phaser from 'phaser';
import { gameState, STROKES, Stroke } from '../state/GameState';
import {
  RiddleSession,
  createRiddleSession,
  unlockNextHint,
  abandonRiddle,
} from '../state/RiddleState';

export class SecretRiddleScene extends Phaser.Scene {
  private session!: RiddleSession;
  private hint1Text!: Phaser.GameObjects.Text;
  private hint2Text!: Phaser.GameObjects.Text;
  private hintBtn!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private inventoryTexts: Record<Stroke, Phaser.GameObjects.Text> = {} as any;

  constructor() {
    super('SecretRiddle');
  }

  create(): void {
    const run = gameState.expedition ?? gameState.startExpedition();
    this.session = createRiddleSession();

    this.cameras.main.setBackgroundColor('#141a16');
    this.drawBackground();
    this.drawHeader(run.area);
    this.drawInventoryBar();
    this.drawStele();
    this.drawActionButtons();
  }

  private drawBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x131915, 1).fillRect(0, 0, 1024, 768);

    // Ancient mountain silhouettes & mist
    bg.fillStyle(0x1c2620, 0.7);
    bg.fillTriangle(0, 520, 260, 200, 520, 520);
    bg.fillTriangle(480, 520, 760, 220, 1024, 520);

    // Stone ground
    bg.fillStyle(0x0f1411, 0.95).fillRect(0, 680, 1024, 88);
  }

  private drawHeader(area: number): void {
    this.add.text(52, 28, '字 谜 秘 境', {
      fontFamily: 'serif',
      fontSize: '38px',
      color: '#e4c975',
    });
    this.add.text(268, 38, `第 ${area} 区域 · 古碑横亘，破译谜底方可入内`, {
      fontSize: '15px',
      color: '#a3b0a2',
    });
  }

  private drawInventoryBar(): void {
    const run = gameState.expedition;
    const bar = this.add.graphics();
    bar.fillStyle(0x1c241f, 0.9).fillRoundedRect(52, 82, 920, 48, 8);
    bar.lineStyle(1, 0x48584c, 0.7).strokeRoundedRect(52, 82, 920, 48, 8);

    this.add.text(70, 96, '携带笔画：', { fontSize: '15px', color: '#c2cdbf' });

    STROKES.forEach((stroke, i) => {
      const x = 160 + i * 125;
      this.add.text(x, 96, `${stroke} :`, {
        fontFamily: 'serif',
        fontSize: '17px',
        color: '#e5d7ba',
      });
      const count = run?.carried[stroke] ?? 0;
      const text = this.add.text(x + 32, 96, String(count), {
        fontSize: '16px',
        color: count > 0 ? '#b8e0a8' : '#738072',
      });
      this.inventoryTexts[stroke] = text;
    });
  }

  private refreshInventoryUI(): void {
    const run = gameState.expedition;
    if (!run) return;
    STROKES.forEach((stroke) => {
      const count = run.carried[stroke] ?? 0;
      if (this.inventoryTexts[stroke]) {
        this.inventoryTexts[stroke].setText(String(count));
        this.inventoryTexts[stroke].setColor(count > 0 ? '#b8e0a8' : '#738072');
      }
    });
  }

  private drawStele(): void {
    // Stele base & tablet
    const cx = 512;
    const cy = 370;

    const stele = this.add.graphics();
    // Stele shadow & body
    stele.fillStyle(0x0e1310, 0.6).fillRect(cx - 250, cy - 210, 500, 420);
    stele.fillStyle(0x212a24, 0.98).fillRoundedRect(cx - 240, cy - 200, 480, 400, 16);
    stele.lineStyle(2, 0xd4af37, 0.8).strokeRoundedRect(cx - 240, cy - 200, 480, 400, 16);

    // Ancient seal at top of stele
    const seal = this.add.circle(cx, cy - 145, 32, 0xd4af37, 0.2);
    seal.setStrokeStyle(2, 0xd4af37, 0.9);
    this.add.text(cx, cy - 145, '碑', {
      fontFamily: 'serif',
      fontSize: '28px',
      color: '#f6ebd2',
    }).setOrigin(0.5);

    // Riddle clue inscription
    this.add.text(cx, cy - 85, '【 古 碑 铭 文 】', {
      fontSize: '14px',
      color: '#c2aa6b',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 42, `“ ${this.session.riddle.clue} ”`, {
      fontFamily: 'serif',
      fontSize: '26px',
      color: '#fdf6e2',
    }).setOrigin(0.5);

    // Hint 1 row
    this.hint1Text = this.add.text(
      cx - 200,
      cy + 15,
      '线索一（结构）：尚未揭示',
      { fontSize: '15px', color: '#8d9c8c' }
    );

    // Hint 2 row
    this.hint2Text = this.add.text(
      cx - 200,
      cy + 52,
      '线索二（字义）：尚未揭示',
      { fontSize: '15px', color: '#8d9c8c' }
    );

    // Hint purchase button
    this.hintBtn = this.add.text(
      cx,
      cy + 105,
      '💡 消耗 1 携带笔画揭示线索',
      {
        fontSize: '14px',
        color: '#1a221b',
        backgroundColor: '#d8b965',
        padding: { x: 18, y: 7 },
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.hintBtn.on('pointerdown', () => this.handleUnlockHint());

    // Status / feedback line
    this.statusText = this.add.text(cx, cy + 152, '', {
      fontSize: '14px',
      color: '#e0a96d',
    }).setOrigin(0.5);

    this.updateHintsDisplay();
  }

  private handleUnlockHint(): void {
    const run = gameState.expedition;
    if (!run) return;

    const res = unlockNextHint(this.session, run.carried);
    if (!res.success) {
      this.statusText.setText(res.reason || '无法解锁');
      this.statusText.setColor('#e06d6d');
      return;
    }

    this.statusText.setText(`扣除 1 根「${res.consumedStroke}」笔画，线索已现！`);
    this.statusText.setColor('#9de291');
    this.refreshInventoryUI();
    this.updateHintsDisplay();
  }

  private updateHintsDisplay(): void {
    if (this.session.unlockedHints >= 1) {
      this.hint1Text.setText(`线索一（结构）：${this.session.riddle.hint1}`);
      this.hint1Text.setColor('#e2d3af');
    }
    if (this.session.unlockedHints >= 2) {
      this.hint2Text.setText(`线索二（字义）：${this.session.riddle.hint2}`);
      this.hint2Text.setColor('#e2d3af');
      this.hintBtn.setText('✓ 所有线索已揭示');
      this.hintBtn.setBackgroundColor('#475649');
      this.hintBtn.setColor('#94a495');
      this.hintBtn.disableInteractive();
    }
  }

  private drawActionButtons(): void {
    const cy = 620;

    // Craft / solve button (Ticket 03 will open the handwriting canvas)
    const solveBtn = this.add.text(410, cy, '✍️ 挥毫破谜 (提交字实体)', {
      fontFamily: 'serif',
      fontSize: '18px',
      color: '#18221a',
      backgroundColor: '#e5c872',
      padding: { x: 26, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    solveBtn.on('pointerdown', () => {
      this.statusText.setText('请在古碑前凝神构字... (工单 03 将开启挥毫画板)');
      this.statusText.setColor('#eed180');
    });

    // Retreat / abandon button
    const retreatBtn = this.add.text(640, cy, '🚪 转身离去 (返回选路)', {
      fontFamily: 'serif',
      fontSize: '17px',
      color: '#c2cdbf',
      backgroundColor: '#2e3b32',
      padding: { x: 22, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retreatBtn.on('pointerdown', () => {
      abandonRiddle(gameState.expedition);
      this.scene.start('Route');
    });
  }
}
