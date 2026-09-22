import Phaser from 'phaser';
import { gameState, STROKES, Stroke } from '../state/GameState';
import {
  RiddleSession,
  createRiddleSession,
  unlockNextHint,
  abandonRiddle,
  verifyAndUnlockGate,
} from '../state/RiddleState';
import { handwritingService } from '../services/HandwritingService';

export class SecretRiddleScene extends Phaser.Scene {
  private session!: RiddleSession;
  private hint1Text!: Phaser.GameObjects.Text;
  private hint2Text!: Phaser.GameObjects.Text;
  private hintBtn!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private solveBtn!: Phaser.GameObjects.Text;
  private inventoryTexts: Record<Stroke, Phaser.GameObjects.Text> = {} as any;

  // Calligraphy Modal Overlay
  private modalContainer!: Phaser.GameObjects.Container;
  private isModalOpen = false;
  private drawnStrokes: number[][][] = [];
  private currentStroke: number[][] = [];
  private isDrawing = false;
  private inkGraphics!: Phaser.GameObjects.Graphics;
  private canvasX = 140;
  private canvasY = 190;
  private canvasWidth = 280;
  private canvasHeight = 280;
  private selectedWord?: string;
  private modalFeedbackText!: Phaser.GameObjects.Text;
  private selectedWordText!: Phaser.GameObjects.Text;
  private recipeReqText!: Phaser.GameObjects.Text;
  private candidateButtons: Phaser.GameObjects.Container[] = [];
  private candidates: string[] = [];

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
    this.createCalligraphyModal();
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
    const cx = 512;
    const cy = 370;

    const stele = this.add.graphics();
    stele.fillStyle(0x0e1310, 0.6).fillRect(cx - 250, cy - 210, 500, 420);
    stele.fillStyle(0x212a24, 0.98).fillRoundedRect(cx - 240, cy - 200, 480, 400, 16);
    stele.lineStyle(2, 0xd4af37, 0.8).strokeRoundedRect(cx - 240, cy - 200, 480, 400, 16);

    const seal = this.add.circle(cx, cy - 145, 32, 0xd4af37, 0.2);
    seal.setStrokeStyle(2, 0xd4af37, 0.9);
    this.add.text(cx, cy - 145, '碑', {
      fontFamily: 'serif',
      fontSize: '28px',
      color: '#f6ebd2',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 85, '【 古 碑 铭 文 】', {
      fontSize: '14px',
      color: '#c2aa6b',
    }).setOrigin(0.5);

    this.add.text(cx, cy - 42, `“ ${this.session.riddle.clue} ”`, {
      fontFamily: 'serif',
      fontSize: '26px',
      color: '#fdf6e2',
    }).setOrigin(0.5);

    this.hint1Text = this.add.text(
      cx - 200,
      cy + 15,
      '线索一（结构）：尚未揭示',
      { fontSize: '15px', color: '#8d9c8c' }
    );

    this.hint2Text = this.add.text(
      cx - 200,
      cy + 52,
      '线索二（字义）：尚未揭示',
      { fontSize: '15px', color: '#8d9c8c' }
    );

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

    this.solveBtn = this.add.text(410, cy, '✍️ 挥毫破谜 (提交字实体)', {
      fontFamily: 'serif',
      fontSize: '18px',
      color: '#18221a',
      backgroundColor: '#e5c872',
      padding: { x: 26, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.solveBtn.on('pointerdown', () => {
      if (this.session.isUnlocked) {
        this.statusText.setText('石门已开启，正在踏入秘境殿堂...');
        return;
      }
      this.openCalligraphyModal();
    });

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

  // --- Calligraphy Modal Overlay ---

  private createCalligraphyModal(): void {
    this.modalContainer = this.add.container(0, 0);
    this.modalContainer.setVisible(false);

    // Dim background layer
    const overlayBg = this.add.rectangle(0, 0, 1024, 768, 0x000000, 0.78)
      .setOrigin(0)
      .setInteractive();
    this.modalContainer.add(overlayBg);

    // Modal Card
    const cardBg = this.add.rectangle(512, 384, 880, 520, 0x1f2722, 0.98)
      .setStrokeStyle(2, 0xd4af37);
    this.modalContainer.add(cardBg);

    // Modal Title
    const title = this.add.text(512, 150, '【 古 碑 宣 纸 挥 毫 台 】', {
      fontFamily: 'serif',
      fontSize: '24px',
      color: '#f5e8cf',
    }).setOrigin(0.5);
    this.modalContainer.add(title);

    // 1. Rice Paper Canvas
    const paper = this.add.rectangle(this.canvasX, this.canvasY, this.canvasWidth, this.canvasHeight, 0xf6efdf, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, 0x6e573e);
    this.modalContainer.add(paper);

    // Mi-Grid Lines
    const mi = this.add.graphics();
    mi.lineStyle(1.5, 0xcc6655, 0.35);
    mi.lineBetween(this.canvasX, this.canvasY, this.canvasX + this.canvasWidth, this.canvasY + this.canvasHeight);
    mi.lineBetween(this.canvasX + this.canvasWidth, this.canvasY, this.canvasX, this.canvasY + this.canvasHeight);
    mi.lineBetween(this.canvasX + this.canvasWidth / 2, this.canvasY, this.canvasX + this.canvasWidth / 2, this.canvasY + this.canvasHeight);
    mi.lineBetween(this.canvasX, this.canvasY + this.canvasHeight / 2, this.canvasX + this.canvasWidth, this.canvasY + this.canvasHeight / 2);
    mi.strokeRect(this.canvasX + this.canvasWidth / 3, this.canvasY + this.canvasHeight / 3, this.canvasWidth / 3, this.canvasHeight / 3);
    this.modalContainer.add(mi);

    // Ink graphics
    this.inkGraphics = this.add.graphics();
    this.modalContainer.add(this.inkGraphics);

    // Interactive draw surface
    const drawZone = this.add.rectangle(this.canvasX, this.canvasY, this.canvasWidth, this.canvasHeight, 0x000000, 0)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    this.modalContainer.add(drawZone);

    drawZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.isModalOpen) return;
      this.isDrawing = true;
      const lx = pointer.x - this.canvasX;
      const ly = pointer.y - this.canvasY;
      this.currentStroke = [[lx, ly]];
      this.inkGraphics.fillStyle(0x1a1a1a, 0.95);
      this.inkGraphics.fillCircle(pointer.x, pointer.y, 3);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isModalOpen || !this.isDrawing) return;
      const lx = pointer.x - this.canvasX;
      const ly = pointer.y - this.canvasY;

      if (lx < -15 || lx > this.canvasWidth + 15 || ly < -15 || ly > this.canvasHeight + 15) {
        this.finishStroke();
        return;
      }

      const last = this.currentStroke[this.currentStroke.length - 1];
      const distSq = (lx - last[0]) ** 2 + (ly - last[1]) ** 2;
      if (distSq >= 9) {
        this.currentStroke.push([lx, ly]);
        this.inkGraphics.lineStyle(5.5, 0x1a1a1a, 0.95);
        this.inkGraphics.lineBetween(this.canvasX + last[0], this.canvasY + last[1], pointer.x, pointer.y);
      }
    });

    this.input.on('pointerup', () => {
      if (this.isModalOpen && this.isDrawing) {
        this.finishStroke();
      }
    });

    // Clear & Undo buttons
    const undoBtn = this.add.text(this.canvasX, this.canvasY + this.canvasHeight + 12, '↶ 撤销单笔', {
      fontSize: '13px',
      color: '#e2d7c5',
      backgroundColor: '#354338',
      padding: { x: 12, y: 6 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    undoBtn.on('pointerdown', () => this.undoStroke());
    this.modalContainer.add(undoBtn);

    const clearBtn = this.add.text(this.canvasX + 105, this.canvasY + this.canvasHeight + 12, '🗑 清空宣纸', {
      fontSize: '13px',
      color: '#e2d7c5',
      backgroundColor: '#4a3b2c',
      padding: { x: 12, y: 6 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => this.clearCanvas());
    this.modalContainer.add(clearBtn);

    // 2. Right Candidate & Submission Panel
    const px = 460;
    const py = 190;
    const pw = 420;
    const ph = 320;

    const panelBg = this.add.rectangle(px, py, pw, ph, 0x171f1a, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1.5, 0x3d4b3f);
    this.modalContainer.add(panelBg);

    this.modalContainer.add(this.add.text(px + 18, py + 14, '识别候选字（点击选中待提交）：', {
      fontSize: '14px',
      color: '#e0d4bb',
    }));

    // 4 Candidate Slots
    this.candidateButtons = [];
    for (let i = 0; i < 4; i++) {
      const bx = px + 18 + i * 95;
      const by = py + 46;

      const slot = this.add.container(bx, by);
      const bg = this.add.rectangle(0, 0, 85, 55, 0x222c25, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, 0x48584c)
        .setInteractive({ useHandCursor: true });

      const text = this.add.text(42, 27, '', {
        fontFamily: 'serif',
        fontSize: '28px',
        color: '#f5ead0',
      }).setOrigin(0.5);

      slot.add([bg, text]);
      this.modalContainer.add(slot);
      this.candidateButtons.push(slot);

      bg.on('pointerdown', () => {
        if (this.candidates[i]) {
          this.selectWord(this.candidates[i]);
        }
      });
    }

    // Selected Word display
    this.selectedWordText = this.add.text(px + 18, py + 120, '待提交汉字：尚未选择', {
      fontFamily: 'serif',
      fontSize: '20px',
      color: '#d4af37',
    });
    this.modalContainer.add(this.selectedWordText);

    this.recipeReqText = this.add.text(px + 18, py + 155, '', {
      fontSize: '13px',
      color: '#a0ad9f',
    });
    this.modalContainer.add(this.recipeReqText);

    // Modal feedback message
    this.modalFeedbackText = this.add.text(px + 18, py + 195, '', {
      fontSize: '14px',
      color: '#e07575',
    });
    this.modalContainer.add(this.modalFeedbackText);

    // Submit button
    const submitBtn = this.add.text(px + 18, py + 245, '🚪 提交验证开门', {
      fontFamily: 'serif',
      fontSize: '17px',
      color: '#1a221b',
      backgroundColor: '#d8b965',
      padding: { x: 20, y: 10 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    submitBtn.on('pointerdown', () => this.handleSubmitWord());
    this.modalContainer.add(submitBtn);

    // Close button
    const closeBtn = this.add.text(px + 220, py + 245, '✖ 收起画板', {
      fontSize: '15px',
      color: '#c2cdbf',
      backgroundColor: '#354338',
      padding: { x: 18, y: 10 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this.closeCalligraphyModal());
    this.modalContainer.add(closeBtn);
  }

  private openCalligraphyModal(): void {
    this.isModalOpen = true;
    this.modalContainer.setVisible(true);
    this.modalFeedbackText.setText('');
    this.clearCanvas();
  }

  private closeCalligraphyModal(): void {
    this.isModalOpen = false;
    this.modalContainer.setVisible(false);
  }

  private finishStroke(): void {
    this.isDrawing = false;
    if (this.currentStroke.length > 1) {
      this.drawnStrokes.push(this.currentStroke);
      this.triggerRecognition();
    }
    this.currentStroke = [];
  }

  private async triggerRecognition(): Promise<void> {
    if (this.drawnStrokes.length === 0) return;
    try {
      const results = await handwritingService.recognize(this.drawnStrokes);
      this.candidates = results.slice(0, 4).map((r) => r.character);
      this.updateCandidateSlots();
      if (this.candidates.length > 0 && !this.selectedWord) {
        this.selectWord(this.candidates[0]);
      }
    } catch {
      // Fallback
    }
  }

  private updateCandidateSlots(): void {
    for (let i = 0; i < 4; i++) {
      const slot = this.candidateButtons[i];
      const text = slot.getAt(1) as Phaser.GameObjects.Text;
      const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle;
      const char = this.candidates[i];
      if (char) {
        text.setText(char);
        bg.setStrokeStyle(1.5, char === this.selectedWord ? 0xd4af37 : 0x48584c);
      } else {
        text.setText('');
        bg.setStrokeStyle(1, 0x2e3b32);
      }
    }
  }

  private selectWord(char: string): void {
    this.selectedWord = char;
    this.selectedWordText.setText(`待提交汉字：「${char}」`);
    this.modalFeedbackText.setText('');

    // Format recipe requirement if it matches riddle or known
    const recipe = this.session.riddle.recipe;
    const reqStr = Object.entries(recipe)
      .map(([s, n]) => `${s}×${n}`)
      .join('，');
    this.recipeReqText.setText(`所需笔画配方：${reqStr}`);

    this.updateCandidateSlots();
  }

  private clearCanvas(): void {
    this.drawnStrokes = [];
    this.currentStroke = [];
    this.inkGraphics.clear();
    this.candidates = [];
    this.selectedWord = undefined;
    this.selectedWordText.setText('待提交汉字：尚未选择');
    this.recipeReqText.setText('');
    this.modalFeedbackText.setText('');
    this.updateCandidateSlots();
  }

  private undoStroke(): void {
    if (this.drawnStrokes.length === 0) return;
    this.drawnStrokes.pop();
    this.redrawStrokes();
    if (this.drawnStrokes.length > 0) {
      this.triggerRecognition();
    } else {
      this.clearCanvas();
    }
  }

  private redrawStrokes(): void {
    this.inkGraphics.clear();
    for (const stroke of this.drawnStrokes) {
      for (let i = 0; i < stroke.length; i++) {
        const pt = stroke[i];
        if (i === 0) {
          this.inkGraphics.fillStyle(0x1a1a1a, 0.95);
          this.inkGraphics.fillCircle(this.canvasX + pt[0], this.canvasY + pt[1], 3);
        } else {
          const prev = stroke[i - 1];
          this.inkGraphics.lineStyle(5.5, 0x1a1a1a, 0.95);
          this.inkGraphics.lineBetween(
            this.canvasX + prev[0],
            this.canvasY + prev[1],
            this.canvasX + pt[0],
            this.canvasY + pt[1]
          );
        }
      }
    }
  }

  private handleSubmitWord(): void {
    if (!this.selectedWord) {
      this.modalFeedbackText.setText('请先在画板书写并选择一个汉字');
      this.modalFeedbackText.setColor('#e07575');
      return;
    }

    const run = gameState.expedition;
    if (!run) return;

    const res = verifyAndUnlockGate(this.session, this.selectedWord, run.carried);

    if (!res.success) {
      this.modalFeedbackText.setText(res.reason || '验证未通过');
      this.modalFeedbackText.setColor('#e06d6d');
      return;
    }

    // Success! Gate opens
    this.modalFeedbackText.setText('✓ 碑纹共鸣！石门轰然开启！');
    this.modalFeedbackText.setColor('#8ce07f');
    this.refreshInventoryUI();

    this.statusText.setText('✓ 谜底已破！石门已开，通往秘境殿堂！');
    this.statusText.setColor('#9de291');

    this.solveBtn.setText('🚪 踏入秘境殿堂 (两阶段抉择)');
    this.solveBtn.setBackgroundColor('#85c477');

    this.time.delayedCall(1200, () => {
      this.closeCalligraphyModal();
    });
  }
}
