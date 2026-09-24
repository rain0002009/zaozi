import Phaser from 'phaser';
import { gameState, WordId, STROKES } from '../state/GameState';
import { handwritingService } from '../services/HandwritingService';
import { InkVFX } from '../visuals/InkAtmosphere';

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
  private canvasWidth = 296;
  private canvasHeight = 296;
  private canvasX = 48;
  private canvasY = 160;

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
  private synthesizeButtonContainer!: Phaser.GameObjects.Container;
  private synthesizeBtnBg!: Phaser.GameObjects.Image;
  private synthesizeBtnText!: Phaser.GameObjects.Text;
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

    // 1. 摊开的宣纸卷轴画板 (Scroll Board) - 彻底移除外部生硬黑色阴影矩形
    const boardBg = this.scene.add.image(this.canvasX, this.canvasY, 'tx_scroll_desk').setOrigin(0);
    parent.add(boardBg);

    // Graphics for user ink strokes
    this.inkGraphics = this.scene.add.graphics();
    parent.add(this.inkGraphics);

    // Interactive drawing surface - 位于画卷宣纸内芯区域 (左右装裱缩进 16px，上下缩进 8px)
    const drawZone = this.scene.add.rectangle(this.canvasX + 16, this.canvasY + 8, this.canvasWidth - 32, this.canvasHeight - 16, 0x000000, 0.001)
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

    // Control buttons under canvas (毛笔飞白按键，彻底根除黑框)
    const btnY = this.canvasY + this.canvasHeight + 14;

    // 清空笔画 (朱砂毛笔按键)
    const clearContainer = this.scene.add.container(this.canvasX + 54, btnY + 17);
    const clearImg = this.scene.add.image(0, 0, 'tx_brush_btn_red').setOrigin(0.5).setInteractive({ useHandCursor: true });
    const clearText = this.scene.add.text(0, 0, '清空笔画', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '12px',
      color: '#ffd0d0',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    clearContainer.add([clearImg, clearText]);
    parent.add(clearContainer);

    clearImg.on('pointerover', () => clearContainer.setScale(1.04));
    clearImg.on('pointerout', () => clearContainer.setScale(1.0));
    clearImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'ink', count: 7 });
      this.clearHandwriting();
    });

    // 撤销末笔 (墨色毛笔按键)
    const undoContainer = this.scene.add.container(this.canvasX + 154, btnY + 17);
    const undoImg = this.scene.add.image(0, 0, 'tx_brush_btn_small_dark').setOrigin(0.5).setInteractive({ useHandCursor: true });
    const undoText = this.scene.add.text(0, 0, '撤销末笔', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '12px',
      color: '#d4dfd2',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    undoContainer.add([undoImg, undoText]);
    parent.add(undoContainer);

    undoImg.on('pointerover', () => undoContainer.setScale(1.04));
    undoImg.on('pointerout', () => undoContainer.setScale(1.0));
    undoImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'ink', count: 6 });
      this.undoLastStroke();
    });

    // Recognition Candidate & Character Detail Cards
    this.drawRecognitionPanel(parent);

    // Recipe book / Quick craft bar
    this.drawRecipeBook(parent, 48, btnY + 44);
  }

  private drawRecognitionPanel(parent: Phaser.GameObjects.Container): void {
    const startX = this.canvasX + this.canvasWidth + 24;
    const startY = this.canvasY;

    // 极简游戏化标题：【 推演灵字 】
    parent.add(this.scene.add.text(startX, startY, '【 推演灵字 】', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '16px',
      color: '#dfc068',
      fontStyle: 'bold',
    }));

    this.candidateStatusText = this.scene.add.text(startX + 140, startY + 2, '', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '12px',
      color: '#c59f49',
    });
    parent.add(this.candidateStatusText);

    // 6 Candidate Slots - 玉石印台造型 (彻底去除黑框)
    this.candidateButtons = [];
    for (let i = 0; i < 6; i++) {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const bx = startX + col * 74;
      const by = startY + 30 + row * 60;

      const slot = this.scene.add.container(bx, by);
      const bg = this.scene.add.image(0, 0, 'tx_seal_slot')
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });

      const charText = this.scene.add.text(32, 26, '', {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '26px',
        color: '#fdf5e6',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      const starText = this.scene.add.text(54, 12, '', {
        fontSize: '10px',
        color: '#dfc068',
      }).setOrigin(0.5);

      slot.add([bg, charText, starText]);
      parent.add(slot);
      this.candidateButtons.push(slot);

      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (this.candidates[i]) {
          InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 6 });
          this.selectedCandidate = this.candidates[i];
          this.updateCandidateSelectionVisuals();
          this.updateDetailCard();
        }
      });
    }

    // Detail & Synthesis Card (兵刃玄案/神案底图，彻底根除外凸黑框)
    const cardY = startY + 160;
    const cardBg = this.scene.add.image(startX, cardY, 'tx_preview_altar').setOrigin(0);
    parent.add(cardBg);

    this.detailCharText = this.scene.add.text(startX + 14, cardY + 12, '【未落笔】', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '20px',
      color: '#fdf5e6',
      fontStyle: 'bold',
    });
    this.detailTypeText = this.scene.add.text(startX + 95, cardY + 16, '', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '11px',
      color: '#dfc068',
    });
    this.detailSummaryText = this.scene.add.text(startX + 14, cardY + 38, '在左侧画卷挥毫，推演天地灵字意蕴。', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '11px',
      color: '#9aa898',
      wordWrap: { width: 210 },
      lineSpacing: 3,
    });
    this.detailRecipeText = this.scene.add.text(startX + 14, cardY + 74, '', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '11px',
      color: '#d6b885',
      wordWrap: { width: 210 },
    });
    this.detailStatusText = this.scene.add.text(startX + 14, cardY + 94, '', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '11px',
      color: '#86efac',
      wordWrap: { width: 210 },
    });

    // Synthesize button as calligraphic brush button
    this.synthesizeButtonContainer = this.scene.add.container(startX + 120, cardY + 120);
    this.synthesizeBtnBg = this.scene.add.image(0, 0, 'tx_brush_btn_small_dark').setOrigin(0.5);
    this.synthesizeBtnText = this.scene.add.text(0, 0, '凝字成符', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '13px',
      color: '#687c6b',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.synthesizeButtonContainer.add([this.synthesizeBtnBg, this.synthesizeBtnText]);

    this.synthesizeBtnBg.on('pointerover', () => {
      this.synthesizeButtonContainer.setScale(1.05);
    });
    this.synthesizeBtnBg.on('pointerout', () => {
      this.synthesizeButtonContainer.setScale(1.0);
    });
    this.synthesizeBtnBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 12 });
      this.executeSynthesis();
    });

    parent.add([
      this.detailCharText,
      this.detailTypeText,
      this.detailSummaryText,
      this.detailRecipeText,
      this.detailStatusText,
      this.synthesizeButtonContainer,
    ]);

    this.updateDetailCard();
  }

  private drawRecipeBook(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    parent.add(this.scene.add.text(x, y, '【 熟识古字 】', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '14px',
      color: '#dfc068',
      fontStyle: 'bold',
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
      const bg = slot.getAt(0) as Phaser.GameObjects.Image;
      const charText = slot.getAt(1) as Phaser.GameObjects.Text;
      const starText = slot.getAt(2) as Phaser.GameObjects.Text;

      const candidate = this.candidates[i];
      if (candidate) {
        charText.setText(candidate.character);
        starText.setText(candidate.isKnown ? '★' : '');
        const isSelected = this.selectedCandidate && this.selectedCandidate.character === candidate.character;
        bg.setTexture(isSelected ? 'tx_seal_slot_active' : 'tx_seal_slot');
      } else {
        charText.setText('');
        starText.setText('');
        bg.setTexture('tx_seal_slot');
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
      this.synthesizeBtnBg.setTexture('tx_brush_btn_small_gold');
      this.synthesizeBtnText.setColor('#1a241b');
      this.synthesizeBtnBg.setInteractive({ useHandCursor: true });
    } else {
      this.synthesizeBtnBg.setTexture('tx_brush_btn_small_dark');
      this.synthesizeBtnText.setColor('#687c6b');
      this.synthesizeBtnBg.disableInteractive();
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
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '12px',
        color: '#687769',
        fontStyle: 'italic',
      }));
      return;
    }

    recipeWords.forEach((wordId, index) => {
      const wx = index * 60;
      const btnContainer = this.scene.add.container(wx, 0);

      // Inlaid word tile
      const bg = this.scene.add.image(0, 0, 'tx_word_token')
        .setOrigin(0)
        .setScale(52 / 78, 38 / 42)
        .setInteractive({ useHandCursor: true });

      const text = this.scene.add.text(26, 19, wordId, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '22px',
        color: '#fdf5e6',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      btnContainer.add([bg, text]);

      bg.on('pointerover', () => {
        btnContainer.setScale(1.06);
      });
      bg.on('pointerout', () => {
        btnContainer.setScale(1.0);
      });

      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 8 });
        const check = gameState.canSynthesizeCharacter(wordId);
        if (check.canSynthesize) {
          gameState.synthesizeCharacter(wordId);
          this.callbacks.showNotice(`✨ 快捷凝字成功！【${wordId}】存量 +1`);
          this.callbacks.onSynthesized(wordId);
        } else {
          this.callbacks.showNotice(check.error || '仓中笔画不足');
        }
      });

      this.recipeBookContainer.add(btnContainer);
    });
  }
}
