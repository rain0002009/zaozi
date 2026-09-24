import Phaser from 'phaser';
import { gameState, WordId, STROKES } from '../state/GameState';
import { handwritingService } from '../services/HandwritingService';

export type CalligraphyWorkshopCallbacks = {
  onSynthesized: (wordId: WordId) => void;
  showNotice: (msg: string) => void;
  getCurrentTab: () => 'craft' | 'forge';
};

export class CalligraphyWorkshop {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callbacks: CalligraphyWorkshopCallbacks;

  // Drawing state
  private drawnStrokes: number[][][] = [];
  private currentStroke: number[][] = [];
  private isDrawing = false;
  private inkGraphics!: Phaser.GameObjects.Graphics;
  private canvasWidth = 288;
  private canvasHeight = 288;
  private canvasX = 48;
  private canvasY = 224;

  // Recognition state
  private candidates: Array<{ character: string; score: number; isKnown: boolean; wordId?: WordId }> = [];
  private selectedCandidate?: { character: string; score: number; isKnown: boolean; wordId?: WordId };
  private candidateButtons: Phaser.GameObjects.Container[] = [];
  private candidateStatusText!: Phaser.GameObjects.Text;
  private detailCharText!: Phaser.GameObjects.Text;
  private detailTypeText!: Phaser.GameObjects.Text;
  private detailSummaryText!: Phaser.GameObjects.Text;
  private detailRecipeText!: Phaser.GameObjects.Text;
  private detailStatusText!: Phaser.GameObjects.Text;
  private synthesizeButton!: Phaser.GameObjects.Text;
  private recipeBookContainer!: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    callbacks: CalligraphyWorkshopCallbacks
  ) {
    this.scene = scene;
    this.container = container;
    this.callbacks = callbacks;
    this.create();
  }

  private create(): void {
    const parent = this.container;

    // Workshop Title & Subtitle
    parent.add(this.scene.add.text(48, 160, '毛笔宣纸造字台', {
      fontFamily: 'serif', fontSize: '24px', color: '#ede3ce',
    }));
    parent.add(this.scene.add.text(48, 194, '在宣纸画板上运笔书写。以墨化符，比对仓中笔画即可【凝字成符】。', {
      fontSize: '13px', color: '#97a393',
    }));

    // 1. Rice Paper Canvas
    const boardBg = this.scene.add.rectangle(this.canvasX, this.canvasY, this.canvasWidth, this.canvasHeight, 0xf6efdf, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2.5, 0x6e573e);
    parent.add(boardBg);

    // Draw Mi-Grid red dashed guidelines
    const miLines = this.scene.add.graphics();
    miLines.lineStyle(1.5, 0xcc6655, 0.35);
    miLines.lineBetween(this.canvasX, this.canvasY, this.canvasX + this.canvasWidth, this.canvasY + this.canvasHeight);
    miLines.lineBetween(this.canvasX + this.canvasWidth, this.canvasY, this.canvasX, this.canvasY + this.canvasHeight);
    miLines.lineBetween(this.canvasX + this.canvasWidth / 2, this.canvasY, this.canvasX + this.canvasWidth / 2, this.canvasY + this.canvasHeight);
    miLines.lineBetween(this.canvasX, this.canvasY + this.canvasHeight / 2, this.canvasX + this.canvasWidth, this.canvasY + this.canvasHeight / 2);
    miLines.strokeRect(this.canvasX + this.canvasWidth / 3, this.canvasY + this.canvasHeight / 3, this.canvasWidth / 3, this.canvasHeight / 3);
    parent.add(miLines);

    // Graphics for user ink strokes
    this.inkGraphics = this.scene.add.graphics();
    parent.add(this.inkGraphics);

    // Interactive drawing surface
    const drawZone = this.scene.add.rectangle(this.canvasX, this.canvasY, this.canvasWidth, this.canvasHeight, 0x000000, 0)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    parent.add(drawZone);

    drawZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.callbacks.getCurrentTab() !== 'craft') return;
      this.isDrawing = true;
      const lx = pointer.x - this.canvasX;
      const ly = pointer.y - this.canvasY;
      this.currentStroke = [[lx, ly]];
      this.redrawHandwriting();
    });

    drawZone.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDrawing) return;
      const lx = pointer.x - this.canvasX;
      const ly = pointer.y - this.canvasY;
      this.currentStroke.push([lx, ly]);
      this.redrawHandwriting();
    });

    const finishStroke = () => {
      if (!this.isDrawing) return;
      this.isDrawing = false;
      if (this.currentStroke.length > 1) {
        this.drawnStrokes.push(this.currentStroke);
        this.currentStroke = [];
        this.redrawHandwriting();
        this.recognizeHandwriting();
      }
    };

    drawZone.on('pointerup', finishStroke);
    drawZone.on('pointerout', finishStroke);

    // Control buttons under canvas
    const btnY = this.canvasY + this.canvasHeight + 16;
    const clearBtn = this.scene.add.text(this.canvasX, btnY, '清空笔画', {
      fontSize: '13px', color: '#f87171', backgroundColor: '#2f2222', padding: { x: 14, y: 7 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => this.clearHandwriting());
    parent.add(clearBtn);

    const undoBtn = this.scene.add.text(this.canvasX + 90, btnY, '撤销末笔', {
      fontSize: '13px', color: '#c4d0be', backgroundColor: '#263328', padding: { x: 14, y: 7 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    undoBtn.on('pointerdown', () => this.undoLastStroke());
    parent.add(undoBtn);

    // Recognition Candidate & Character Detail Cards
    this.drawRecognitionPanel(parent);

    // Recipe book / Quick craft bar
    this.drawRecipeBook(parent, 48, btnY + 44);
  }

  private drawRecognitionPanel(parent: Phaser.GameObjects.Container): void {
    const startX = this.canvasX + this.canvasWidth + 28;
    const startY = this.canvasY;

    parent.add(this.scene.add.text(startX, startY, '识别候选字 (点击选定):', {
      fontSize: '13px', color: '#97a393',
    }));

    this.candidateStatusText = this.scene.add.text(startX + 160, startY, '', {
      fontSize: '12px', color: '#c59f49',
    });
    parent.add(this.candidateStatusText);

    // 6 Candidate Slots
    this.candidateButtons = [];
    for (let i = 0; i < 6; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx = startX + col * 74;
      const by = startY + 28 + row * 62;

      const slot = this.scene.add.container(bx, by);
      const bg = this.scene.add.rectangle(0, 0, 64, 52, 0x1d2720, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, 0x3d4b3f)
        .setInteractive({ useHandCursor: true });

      const charText = this.scene.add.text(32, 22, '', {
        fontFamily: 'serif', fontSize: '24px', color: '#f0e8d5',
      }).setOrigin(0.5);

      const starText = this.scene.add.text(54, 10, '', {
        fontSize: '10px', color: '#d0b466',
      }).setOrigin(0.5);

      slot.add([bg, charText, starText]);
      parent.add(slot);
      this.candidateButtons.push(slot);

      bg.on('pointerdown', () => {
        if (this.candidates[i]) {
          this.selectedCandidate = this.candidates[i];
          this.updateCandidateSelectionVisuals();
          this.updateDetailCard();
        }
      });
    }

    // Detail & Synthesis Card
    const cardY = startY + 168;
    const cardBg = this.scene.add.rectangle(startX, cardY, 230, 150, 0x222c24, 0.98)
      .setOrigin(0)
      .setStrokeStyle(1.5, 0x48584a);
    parent.add(cardBg);

    this.detailCharText = this.scene.add.text(startX + 14, cardY + 12, '【未落笔】', {
      fontFamily: 'serif', fontSize: '20px', color: '#f5edd8', fontStyle: 'bold',
    });
    this.detailTypeText = this.scene.add.text(startX + 95, cardY + 16, '', {
      fontSize: '11px', color: '#c59f49',
    });
    this.detailSummaryText = this.scene.add.text(startX + 14, cardY + 40, '在宣纸上运笔，系统将实时推演意蕴。', {
      fontSize: '11px', color: '#97a393', wordWrap: { width: 202 }, lineSpacing: 3,
    });
    this.detailRecipeText = this.scene.add.text(startX + 14, cardY + 76, '', {
      fontSize: '11px', color: '#d2b48c', wordWrap: { width: 202 },
    });
    this.detailStatusText = this.scene.add.text(startX + 14, cardY + 98, '', {
      fontSize: '11px', color: '#86efac', wordWrap: { width: 202 },
    });

    this.synthesizeButton = this.scene.add.text(startX + 115, cardY + 126, '凝字成符', {
      fontSize: '13px',
      color: '#1f190e',
      backgroundColor: '#c59f49',
      padding: { x: 18, y: 5 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.synthesizeButton.on('pointerdown', () => this.executeSynthesis());

    parent.add([
      this.detailCharText,
      this.detailTypeText,
      this.detailSummaryText,
      this.detailRecipeText,
      this.detailStatusText,
      this.synthesizeButton,
    ]);

    this.updateDetailCard();
  }

  private drawRecipeBook(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    parent.add(this.scene.add.text(x, y, '快捷凝字 (点击直接消耗笔画生成):', {
      fontSize: '13px', color: '#a0aca0',
    }));

    this.recipeBookContainer = this.scene.add.container(x, y + 24);
    parent.add(this.recipeBookContainer);
    this.refreshRecipeBook();
  }

  public refresh(): void {
    this.refreshRecipeBook();
    this.updateDetailCard();
  }

  public clearHandwriting(): void {
    this.drawnStrokes = [];
    this.currentStroke = [];
    this.isDrawing = false;
    this.redrawHandwriting();
    this.candidates = [];
    this.selectedCandidate = undefined;
    this.candidateStatusText.setText('');
    this.updateCandidateSelectionVisuals();
    this.updateDetailCard();
  }

  private undoLastStroke(): void {
    if (this.drawnStrokes.length === 0) return;
    this.drawnStrokes.pop();
    this.redrawHandwriting();
    if (this.drawnStrokes.length > 0) {
      this.recognizeHandwriting();
    } else {
      this.clearHandwriting();
    }
  }

  private redrawHandwriting(): void {
    this.inkGraphics.clear();
    this.inkGraphics.lineStyle(6, 0x1d1d1d, 0.95);

    const allStrokes = [...this.drawnStrokes];
    if (this.currentStroke.length > 0) {
      allStrokes.push(this.currentStroke);
    }

    allStrokes.forEach((stroke) => {
      if (stroke.length < 2) return;
      this.inkGraphics.beginPath();
      this.inkGraphics.moveTo(this.canvasX + stroke[0][0], this.canvasY + stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        this.inkGraphics.lineTo(this.canvasX + stroke[i][0], this.canvasY + stroke[i][1]);
      }
      this.inkGraphics.strokePath();
    });
  }

  private recognizeHandwriting(): void {
    this.candidateStatusText.setText('识字中...');
    const candidates = handwritingService.recognize(this.drawnStrokes, 6);

    this.candidates = candidates;
    this.candidateStatusText.setText(handwritingService.isReady() ? '' : '（字库离线中）');

    if (this.candidates.length > 0) {
      this.selectedCandidate = this.candidates[0];
    } else {
      this.selectedCandidate = undefined;
    }

    this.updateCandidateSelectionVisuals();
    this.updateDetailCard();
  }

  private updateCandidateSelectionVisuals(): void {
    for (let i = 0; i < 6; i++) {
      const slot = this.candidateButtons[i];
      const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle;
      const charText = slot.getAt(1) as Phaser.GameObjects.Text;
      const starText = slot.getAt(2) as Phaser.GameObjects.Text;

      const candidate = this.candidates[i];
      if (candidate) {
        charText.setText(candidate.character);
        starText.setText(candidate.isKnown ? '★' : '');
        const isSelected = this.selectedCandidate && this.selectedCandidate.character === candidate.character;
        if (isSelected) {
          bg.setStrokeStyle(2, 0xd0b466);
          bg.setFillStyle(0x2d3a30, 1);
        } else {
          bg.setStrokeStyle(1, 0x3d4b3f);
          bg.setFillStyle(0x1a231d, 0.95);
        }
      } else {
        charText.setText('');
        starText.setText('');
        bg.setStrokeStyle(1, 0x2e3930);
        bg.setFillStyle(0x161d18, 0.6);
      }
    }
  }

  private updateDetailCard(): void {
    if (!this.selectedCandidate) {
      this.detailCharText.setText('【未落笔】');
      this.detailTypeText.setText('');
      this.detailSummaryText.setText('在宣纸上运笔，系统将实时推演意蕴。');
      this.detailRecipeText.setText('');
      this.detailStatusText.setText('');
      this.setSynthesizeActive(false);
      return;
    }

    const candidate = this.selectedCandidate;
    const wordId = candidate.wordId || candidate.character;
    const def = gameState.getWordDefinition(wordId);
    const check = gameState.canSynthesizeCharacter(wordId);
    const isAlreadyUnlocked = gameState.meta.unlockedWords.includes(wordId);

    this.detailCharText.setText(`【${def.name}】`);
    this.detailTypeText.setText(`[${def.type}]`);
    this.detailSummaryText.setText(def.summary);

    const recipeStr = Object.entries(check.recipe)
      .map(([s, n]) => `${s}×${n}`)
      .join(' ');
    this.detailRecipeText.setText(`需消耗笔画：${recipeStr || '无'}`);

    if (check.canSynthesize) {
      this.detailStatusText.setText(
        isAlreadyUnlocked
          ? '✓ 仓中笔画充足（可凝字入库）'
          : '✨ 仓中笔画充足！可凝字入库'
      );
      this.detailStatusText.setColor('#86efac');
      this.setSynthesizeActive(true);
    } else {
      this.detailStatusText.setText(check.error || '仓中笔画不足');
      this.detailStatusText.setColor('#f87171');
      this.setSynthesizeActive(false);
    }
  }

  private setSynthesizeActive(active: boolean): void {
    if (active) {
      this.synthesizeButton.setBackgroundColor('#c59f49');
      this.synthesizeButton.setColor('#1f190e');
      this.synthesizeButton.input!.cursor = 'pointer';
    } else {
      this.synthesizeButton.setBackgroundColor('#38423a');
      this.synthesizeButton.setColor('#68756a');
      this.synthesizeButton.input!.cursor = 'pointer';
    }
  }

  private executeSynthesis(): void {
    if (!this.selectedCandidate) {
      this.callbacks.showNotice('请先在左侧宣纸画板书写汉字');
      return;
    }

    const candidate = this.selectedCandidate;
    const wordId = candidate.wordId || candidate.character;
    const check = gameState.canSynthesizeCharacter(wordId);
    if (!check.canSynthesize) {
      this.callbacks.showNotice(check.error || '仓中笔画不足，无法凝字成符');
      return;
    }

    const ok = gameState.synthesizeCharacter(wordId);
    if (ok) {
      this.callbacks.showNotice(`✨ 造字成功！汉字【${wordId}】存量 +1！可前往铸武台锻造武器。`);
      this.clearHandwriting();
      this.callbacks.onSynthesized(wordId);
    }
  }

  private refreshRecipeBook(): void {
    if (!this.recipeBookContainer) return;
    this.recipeBookContainer.removeAll(true);

    const recipeWords = gameState.meta.recipeBook;
    if (recipeWords.length === 0) {
      this.recipeBookContainer.add(this.scene.add.text(0, 4, '（暂无已凝结汉字，请先在上方挥毫造字）', {
        fontSize: '12px', color: '#687769', fontStyle: 'italic',
      }));
      return;
    }

    recipeWords.forEach((wordId, index) => {
      const wx = index * 56;
      const btn = this.scene.add.text(wx, 0, wordId, {
        fontFamily: 'serif',
        fontSize: '22px',
        color: '#f0e8d5',
        backgroundColor: '#2b362c',
        padding: { x: 12, y: 4 },
      }).setOrigin(0).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => {
        const check = gameState.canSynthesizeCharacter(wordId);
        if (check.canSynthesize) {
          gameState.synthesizeCharacter(wordId);
          this.callbacks.showNotice(`✨ 快捷凝字成功！【${wordId}】存量 +1`);
          this.callbacks.onSynthesized(wordId);
        } else {
          this.callbacks.showNotice(check.error || '仓中笔画不足');
        }
      });

      this.recipeBookContainer.add(btn);
    });
  }
}
