import Phaser from 'phaser';
import {
  gameState,
  STROKES,
  Stroke,
  Settlement,
  WORDS,
  WordId,
  COMPOUND_WEAPONS,
  CompoundWeaponId,
} from '../state/GameState';
import { handwritingService } from '../services/HandwritingService';

type BaseSceneData = { settlement?: Settlement };

export class BaseScene extends Phaser.Scene {
  // Navigation tabs
  private currentTab: 'craft' | 'forge' = 'craft';

  // Containers
  private gridContainer!: Phaser.GameObjects.Container;
  private forgeContainer!: Phaser.GameObjects.Container;
  private forgePreviewCard!: Phaser.GameObjects.Container;

  // Forge state
  private currentForgeWords: WordId[] = [];

  // Inventory UI
  private selectedStrokeForPlacement: Stroke = '一';
  private inventoryTexts: Record<Stroke, Phaser.GameObjects.Text> = {} as any;
  private strokeButtons: Record<Stroke, Phaser.GameObjects.Container> = {} as any;

  constructor() {
    super('Base');
  }

  create(data: BaseSceneData): void {
    this.cameras.main.setBackgroundColor('#171c18');
    this.drawInkBackground();

    // Top Header
    this.add.text(48, 28, '归 字 营', {
      fontFamily: 'serif',
      fontSize: '38px',
      color: '#f0e8d5',
    });
    this.add.text(188, 38, '人族最后的造字与铸武之所', {
      fontSize: '14px',
      color: '#8e968b',
    });

    // Top Tab Switcher
    this.drawTabSwitcher();

    // Inventory Bar (always visible at top)
    this.drawInventoryBar();

    // Container for Handwriting Calligraphy Board
    this.gridContainer = this.add.container(0, 0);
    this.drawHandwritingWorkshop();

    // Container for Weapon Forge
    this.forgeContainer = this.add.container(0, 0);
    this.drawWeaponForge();

    // Expedition Gate on the right
    this.drawExpeditionGate();

    // Switch to initial tab
    this.switchTab('craft');

    if (data.settlement) this.drawSettlement(data.settlement);
  }

  private drawInkBackground(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x19211c, 1).fillRect(0, 0, 1024, 768);

    // Mountain silhouettes
    bg.fillStyle(0x232d26, 0.6);
    bg.fillTriangle(0, 480, 220, 180, 440, 480);
    bg.fillTriangle(190, 480, 460, 220, 710, 480);
    bg.fillStyle(0x161e18, 0.85);
    bg.fillTriangle(480, 480, 750, 190, 1024, 480);

    // Ground ink bar
    bg.fillStyle(0x121714, 0.95).fillRect(0, 710, 1024, 58);
  }

  private drawTabSwitcher(): void {
    const tabs = [
      { id: 'craft' as const, label: '✍️ 毛笔宣纸造字台' },
      { id: 'forge' as const, label: '⚔️ 铸武台 (字词熔铸成武)' },
    ];

    tabs.forEach((tab, index) => {
      const x = 520 + index * 160;
      const btn = this.add.text(x, 34, tab.label, {
        fontSize: '14px',
        color: this.currentTab === tab.id ? '#f2e8d3' : '#889384',
        backgroundColor: this.currentTab === tab.id ? '#3c4c3e' : '#212a23',
        padding: { x: 12, y: 7 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.on('pointerdown', () => this.switchTab(tab.id));
      (this as any)[`tabBtn_${tab.id}`] = btn;
    });
  }

  private switchTab(tab: 'craft' | 'forge'): void {
    this.currentTab = tab;
    this.gridContainer.setVisible(tab === 'craft');
    this.forgeContainer.setVisible(tab === 'forge');

    const btnCraft = (this as any).tabBtn_craft as Phaser.GameObjects.Text | undefined;
    const btnForge = (this as any).tabBtn_forge as Phaser.GameObjects.Text | undefined;

    if (btnCraft) {
      btnCraft.setColor(tab === 'craft' ? '#f2e8d3' : '#889384');
      btnCraft.setBackgroundColor(tab === 'craft' ? '#3c4c3e' : '#212a23');
    }
    if (btnForge) {
      btnForge.setColor(tab === 'forge' ? '#f2e8d3' : '#889384');
      btnForge.setBackgroundColor(tab === 'forge' ? '#3c4c3e' : '#212a23');
    }
  }

  // --- 1. 仓中笔画栏 (Inventory Bar) ---

  private drawInventoryBar(): void {
    const bar = this.add.container(48, 80);

    // Background panel
    bar.add(this.add.rectangle(0, 0, 928, 64, 0x222c24, 0.95).setOrigin(0).setStrokeStyle(1, 0x48584a));
    bar.add(this.add.text(20, 22, '仓中笔画:', { fontSize: '14px', color: '#c4d0be', fontStyle: 'bold' }));

    STROKES.forEach((stroke, index) => {
      const x = 120 + index * 95;
      const slot = this.add.container(x, 8);

      const bg = this.add.rectangle(0, 0, 84, 48, 0x1a221c, 0.9)
        .setOrigin(0)
        .setStrokeStyle(1.5, stroke === this.selectedStrokeForPlacement ? 0xd0b466 : 0x3d4b3f);

      const strokeText = this.add.text(24, 8, stroke, {
        fontFamily: 'serif',
        fontSize: '26px',
        color: '#f0e3c5',
      });

      const countText = this.add.text(64, 24, `${gameState.meta.inventory[stroke]}`, {
        fontSize: '13px',
        color: '#ffffff',
      }).setOrigin(0.5);

      this.inventoryTexts[stroke] = countText;
      this.strokeButtons[stroke] = slot;

      slot.add([bg, strokeText, countText]);

      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', () => {
        this.selectedStrokeForPlacement = stroke;
        this.updateSelectedStrokeHighlight();
      });

      bar.add(slot);
    });
  }

  private updateSelectedStrokeHighlight(): void {
    STROKES.forEach((s) => {
      const slot = this.strokeButtons[s];
      if (slot) {
        const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle;
        if (bg) {
          bg.setStrokeStyle(1.5, s === this.selectedStrokeForPlacement ? 0xd0b466 : 0x3d4b3f);
        }
      }
    });
  }

  // --- 2. 毛笔宣纸造字台 (Handwriting Calligraphy Workshop) ---

  // Handwriting drawing state
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

  private drawHandwritingWorkshop(): void {
    const parent = this.gridContainer;

    // Workshop Title & Subtitle
    parent.add(this.add.text(48, 160, '毛笔宣纸造字台', {
      fontFamily: 'serif', fontSize: '24px', color: '#ede3ce',
    }));
    parent.add(this.add.text(48, 194, '在宣纸画板上运笔书写。以墨化符，比对仓中笔画即可【凝字成符】。', {
      fontSize: '13px', color: '#97a393',
    }));

    // 1. Rice Paper Canvas
    const boardBg = this.add.rectangle(this.canvasX, this.canvasY, this.canvasWidth, this.canvasHeight, 0xf6efdf, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2.5, 0x6e573e);
    parent.add(boardBg);

    // Draw Mi-Grid red dashed guidelines
    const miLines = this.add.graphics();
    miLines.lineStyle(1.5, 0xcc6655, 0.35);
    // Diagonals
    miLines.lineBetween(this.canvasX, this.canvasY, this.canvasX + this.canvasWidth, this.canvasY + this.canvasHeight);
    miLines.lineBetween(this.canvasX + this.canvasWidth, this.canvasY, this.canvasX, this.canvasY + this.canvasHeight);
    // Center cross
    miLines.lineBetween(this.canvasX + this.canvasWidth / 2, this.canvasY, this.canvasX + this.canvasWidth / 2, this.canvasY + this.canvasHeight);
    miLines.lineBetween(this.canvasX, this.canvasY + this.canvasHeight / 2, this.canvasX + this.canvasWidth, this.canvasY + this.canvasHeight / 2);
    // Inner box for Nine-Palace guide
    miLines.strokeRect(this.canvasX + this.canvasWidth / 3, this.canvasY + this.canvasHeight / 3, this.canvasWidth / 3, this.canvasHeight / 3);
    parent.add(miLines);

    // Graphics for user ink strokes
    this.inkGraphics = this.add.graphics();
    parent.add(this.inkGraphics);

    // Interactive drawing surface
    const drawZone = this.add.rectangle(this.canvasX, this.canvasY, this.canvasWidth, this.canvasHeight, 0x000000, 0)
      .setOrigin(0)
      .setInteractive({ useHandCursor: true });
    parent.add(drawZone);

    drawZone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.currentTab !== 'craft') return;
      this.isDrawing = true;
      const lx = pointer.x - this.canvasX;
      const ly = pointer.y - this.canvasY;
      this.currentStroke = [[lx, ly]];
      this.inkGraphics.fillStyle(0x1a1a1a, 0.95);
      this.inkGraphics.fillCircle(pointer.x, pointer.y, 3);
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.isDrawing) return;
      const lx = pointer.x - this.canvasX;
      const ly = pointer.y - this.canvasY;

      // Bound check
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
      if (this.isDrawing) {
        this.finishStroke();
      }
    });

    // Control buttons below canvas
    const undoBtn = this.add.text(this.canvasX, this.canvasY + this.canvasHeight + 10, '↶ 撤销一笔', {
      fontSize: '13px',
      color: '#e2d7c5',
      backgroundColor: '#354338',
      padding: { x: 12, y: 6 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    undoBtn.on('pointerdown', () => this.undoStroke());
    parent.add(undoBtn);

    const clearBtn = this.add.text(this.canvasX + 105, this.canvasY + this.canvasHeight + 10, '🗑 清空画板', {
      fontSize: '13px',
      color: '#e2d7c5',
      backgroundColor: '#4a3b2c',
      padding: { x: 12, y: 6 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => this.clearHandwriting());
    parent.add(clearBtn);

    // 2. Right Recognition & Detail Box
    const panelX = this.canvasX + this.canvasWidth + 20;
    const panelY = this.canvasY;
    const panelW = 425;
    const panelH = this.canvasHeight + 40;

    parent.add(this.add.rectangle(panelX, panelY, panelW, panelH, 0x222a23, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1.5, 0x48584a));

    parent.add(this.add.text(panelX + 16, panelY + 14, '【实时手写汉字识别】', {
      fontFamily: 'serif', fontSize: '18px', color: '#ebd8b2',
    }));

    this.candidateStatusText = this.add.text(panelX + 16, panelY + 42, '提笔挥毫，笔走龙蛇（墨韵感应字形）', {
      fontSize: '12px', color: '#97a393',
    });
    parent.add(this.candidateStatusText);

    // 6 Candidate buttons row
    this.candidateButtons = [];
    for (let i = 0; i < 6; i++) {
      const bx = panelX + 16 + i * 66;
      const by = panelY + 66;

      const slot = this.add.container(bx, by);
      const bg = this.add.rectangle(0, 0, 58, 48, 0x1a231d, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1, 0x3d4b3f)
        .setInteractive({ useHandCursor: true });

      const charText = this.add.text(29, 20, '', {
        fontFamily: 'serif', fontSize: '26px', color: '#f0e3c5',
      }).setOrigin(0.5);

      const starText = this.add.text(50, 6, '', {
        fontSize: '10px', color: '#fbbf24',
      }).setOrigin(0.5);

      slot.add([bg, charText, starText]);
      parent.add(slot);
      this.candidateButtons.push(slot);

      bg.on('pointerdown', () => {
        if (this.candidates[i]) {
          this.selectedCandidate = this.candidates[i];
          this.updateCandidateUI();
          this.updateDetailCard();
        }
      });
    }

    // Candidate Detail Card
    const cardY = panelY + 126;
    parent.add(this.add.rectangle(panelX + 16, cardY, panelW - 32, 136, 0x19211c, 0.95)
      .setOrigin(0)
      .setStrokeStyle(1, 0x384539));

    this.detailCharText = this.add.text(panelX + 32, cardY + 16, '【未落笔】', {
      fontFamily: 'serif', fontSize: '26px', color: '#eeddb6',
    });
    this.detailTypeText = this.add.text(panelX + 150, cardY + 22, '', {
      fontSize: '13px', color: '#a0b39c',
    });
    this.detailSummaryText = this.add.text(panelX + 32, cardY + 54, '请在左侧宣纸画板书写，系统将实时识别。', {
      fontSize: '13px', color: '#c4d0be', wordWrap: { width: 350 }, lineSpacing: 4,
    });
    this.detailRecipeText = this.add.text(panelX + 32, cardY + 84, '', {
      fontSize: '12px', color: '#e2d7c5', wordWrap: { width: 350 },
    });
    this.detailStatusText = this.add.text(panelX + 32, cardY + 108, '', {
      fontSize: '12px', color: '#86efac', wordWrap: { width: 350 },
    });

    parent.add([
      this.detailCharText,
      this.detailTypeText,
      this.detailSummaryText,
      this.detailRecipeText,
      this.detailStatusText,
    ]);

    // Synthesize Button
    this.synthesizeButton = this.add.text(panelX + panelW - 145, panelY + panelH - 46, '凝 字 成 符', {
      fontFamily: 'serif',
      fontSize: '16px',
      color: '#333333',
      backgroundColor: '#7c8577',
      padding: { x: 20, y: 8 },
    }).setOrigin(0).setInteractive({ useHandCursor: false });

    this.synthesizeButton.on('pointerdown', () => this.executeSynthesis());
    parent.add(this.synthesizeButton);

    // Recipe Book preview below
    this.drawRecipeBook(parent, this.canvasX, this.canvasY + this.canvasHeight + 48);

    // Initial state
    this.updateCandidateUI();
    this.updateDetailCard();
  }

  private finishStroke(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke.length >= 2) {
      this.drawnStrokes.push([...this.currentStroke]);
      this.currentStroke = [];
      this.performRecognition();
    }
  }

  private redrawInkCanvas(): void {
    this.inkGraphics.clear();
    for (const stroke of this.drawnStrokes) {
      if (stroke.length < 2) continue;
      this.inkGraphics.lineStyle(5.5, 0x1a1a1a, 0.95);
      this.inkGraphics.beginPath();
      this.inkGraphics.moveTo(this.canvasX + stroke[0][0], this.canvasY + stroke[0][1]);
      for (let i = 1; i < stroke.length; i++) {
        this.inkGraphics.lineTo(this.canvasX + stroke[i][0], this.canvasY + stroke[i][1]);
      }
      this.inkGraphics.strokePath();

      // Caps
      this.inkGraphics.fillStyle(0x1a1a1a, 0.95);
      this.inkGraphics.fillCircle(this.canvasX + stroke[0][0], this.canvasY + stroke[0][1], 2.75);
      this.inkGraphics.fillCircle(this.canvasX + stroke[stroke.length - 1][0], this.canvasY + stroke[stroke.length - 1][1], 2.75);
    }
  }

  private undoStroke(): void {
    if (this.drawnStrokes.length > 0) {
      this.drawnStrokes.pop();
      this.redrawInkCanvas();
      this.performRecognition();
    }
  }

  private clearHandwriting(): void {
    this.drawnStrokes = [];
    this.currentStroke = [];
    this.inkGraphics.clear();
    this.candidates = [];
    this.selectedCandidate = undefined;
    this.updateCandidateUI();
    this.updateDetailCard();
  }

  private performRecognition(): void {
    if (this.drawnStrokes.length === 0) {
      this.candidates = [];
      this.selectedCandidate = undefined;
      this.updateCandidateUI();
      this.updateDetailCard();
      return;
    }

    const results = handwritingService.recognize(this.drawnStrokes, 6);
    this.candidates = results;

    // Prioritize selecting a known word if available among candidates, otherwise the first candidate
    const firstKnown = results.find((r) => r.isKnown);
    this.selectedCandidate = firstKnown || results[0];

    this.updateCandidateUI();
    this.updateDetailCard();
  }

  private updateCandidateUI(): void {
    if (this.candidates.length === 0) {
      this.candidateStatusText.setText(
        this.drawnStrokes.length === 0
          ? '提笔挥毫，笔走龙蛇（离线万字库即时匹配）'
          : '正在运笔分析字形...'
      );
    } else {
      this.candidateStatusText.setText('已识别候选汉字（点击方格可自由切换）：');
    }

    for (let i = 0; i < 6; i++) {
      const slot = this.candidateButtons[i];
      const bg = slot.getAt(0) as Phaser.GameObjects.Rectangle;
      const charText = slot.getAt(1) as Phaser.GameObjects.Text;
      const starText = slot.getAt(2) as Phaser.GameObjects.Text;

      const candidate = this.candidates[i];
      if (candidate) {
        charText.setText(candidate.character);
        starText.setText(candidate.isKnown ? '★' : '');

        const isSelected = this.selectedCandidate?.character === candidate.character;
        if (isSelected) {
          bg.setStrokeStyle(2, 0xd0b466);
          bg.setFillStyle(0x28362b, 0.95);
        } else if (candidate.isKnown) {
          bg.setStrokeStyle(1.5, 0x86efac);
          bg.setFillStyle(0x1e2a21, 0.95);
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
      this.detailSummaryText.setText('请在左侧宣纸画板书写，系统将实时识别。');
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
      this.showFloatingNotice('请先在左侧宣纸画板书写汉字');
      return;
    }

    const candidate = this.selectedCandidate;
    const wordId = candidate.wordId || candidate.character;
    const check = gameState.canSynthesizeCharacter(wordId);
    if (!check.canSynthesize) {
      this.showFloatingNotice(check.error || '仓中笔画不足，无法凝字成符');
      return;
    }

    const ok = gameState.synthesizeCharacter(wordId);
    if (ok) {
      this.showFloatingNotice(`✨ 造字成功！汉字【${wordId}】存量 +1！可前往铸武台锻造武器。`);
      this.clearHandwriting();
      this.refreshInventoryUI();
      this.refreshRecipeBook();
      this.refreshForgeUI();
    }
  }

  private drawRecipeBook(parent: Phaser.GameObjects.Container, x: number, y: number): void {
    parent.add(this.add.text(x, y, '快捷凝字 (点击直接消耗笔画生成):', {
      fontSize: '13px', color: '#a0aca0',
    }));

    const bookContainer = this.add.container(x, y + 24);
    (this as any).recipeBookContainer = bookContainer;
    parent.add(bookContainer);

    this.refreshRecipeBook();
  }

  private refreshRecipeBook(): void {
    const container = (this as any).recipeBookContainer as Phaser.GameObjects.Container | undefined;
    if (!container) return;
    container.removeAll(true);

    const recipeWords = gameState.meta.recipeBook;
    if (recipeWords.length === 0) {
      container.add(this.add.text(0, 4, '（暂无已凝结汉字，请先在上方挥毫造字）', {
        fontSize: '12px', color: '#687769', fontStyle: 'italic',
      }));
      return;
    }

    recipeWords.forEach((wordId, index) => {
      const wx = index * 56;
      const btn = this.add.text(wx, 0, wordId, {
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
          this.showFloatingNotice(`✨ 快捷凝字成功！【${wordId}】存量 +1`);
          this.refreshInventoryUI();
          this.refreshRecipeBook();
          this.refreshForgeUI();
        } else {
          this.showFloatingNotice(check.error || '仓中笔画不足');
        }
      });

      container.add(btn);
    });
  }

  // --- 3. 铸武台 (Weapon Forge) ---

  private drawWeaponForge(): void {
    const parent = this.forgeContainer;

    parent.add(this.add.text(48, 160, '铸武台 (字词熔铸成武)', {
      fontFamily: 'serif', fontSize: '24px', color: '#ede3ce',
    }));
    parent.add(this.add.text(48, 194, '将仓中已生成的字拖拽或点击放入锻造台，熔铸词组武器。不限字数，字在锻造后消耗。', {
      fontSize: '13px', color: '#97a393',
    }));

    // Forge Slots Drop Zone
    const forgeBoxX = 48;
    const forgeBoxY = 230;
    const forgeBoxW = 470;
    const forgeBoxH = 140;

    const forgeBoxBg = this.add.rectangle(forgeBoxX, forgeBoxY, forgeBoxW, forgeBoxH, 0x222c24, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, 0x5a705e);
    parent.add(forgeBoxBg);

    parent.add(this.add.text(forgeBoxX + 16, forgeBoxY + 12, '锻造槽位 (拖拽或点击下方字放入，点击槽内字可移出):', {
      fontSize: '12px', color: '#8fa090',
    }));

    // Clear Button
    const clearBtn = this.add.text(forgeBoxX + forgeBoxW - 68, forgeBoxY + 10, '清空槽位', {
      fontSize: '11px', color: '#f87171', backgroundColor: '#332222', padding: { x: 6, y: 3 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => {
      this.currentForgeWords = [];
      this.refreshForgeUI();
    });
    parent.add(clearBtn);

    const slotsContainer = this.add.container(forgeBoxX, forgeBoxY);
    (this as any).forgeSlotsContainer = slotsContainer;
    parent.add(slotsContainer);

    // Forge Preview Card
    const previewX = forgeBoxX + forgeBoxW + 20;
    this.forgePreviewCard = this.add.container(previewX, forgeBoxY);
    parent.add(this.forgePreviewCard);

    // Word Inventory Section
    parent.add(this.add.text(48, 395, '仓中已生成字 (拖拽或点击放入锻造槽):', {
      fontSize: '14px', color: '#cbd5e1',
    }));

    const wordSelector = this.add.container(48, 425);
    (this as any).forgeWordSelector = wordSelector;
    parent.add(wordSelector);

    // Unlocked Weapons Shelf below
    parent.add(this.add.text(48, 510, '已铸造词组武器库 (点击直接装备出征):', {
      fontSize: '14px', color: '#cbd5e1',
    }));

    const weaponShelf = this.add.container(48, 540);
    (this as any).forgeWeaponShelf = weaponShelf;
    parent.add(weaponShelf);

    this.refreshForgeUI();
  }

  private refreshForgeUI(): void {
    this.refreshForgeSlots();
    this.refreshForgeWordSelector();
    this.refreshWeaponShelf();
    this.updateForgePreview();
  }

  private refreshForgeSlots(): void {
    const container = (this as any).forgeSlotsContainer as Phaser.GameObjects.Container | undefined;
    if (!container) return;
    container.removeAll(true);

    if (this.currentForgeWords.length === 0) {
      const emptyHint = this.add.text(235, 75, '【虚位以待】从下方拖拽或点击字放入熔炉', {
        fontSize: '13px', color: '#687769', fontStyle: 'italic',
      }).setOrigin(0.5);
      container.add(emptyHint);
      return;
    }

    this.currentForgeWords.forEach((wordId, index) => {
      const sx = 20 + index * 76;
      const sy = 40;

      const slot = this.add.container(sx, sy);
      const bg = this.add.rectangle(0, 0, 64, 76, 0x1d2720, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1.5, 0xd0b466)
        .setInteractive({ useHandCursor: true });

      const charText = this.add.text(32, 34, wordId, {
        fontFamily: 'serif', fontSize: '32px', color: '#f0dfb3',
      }).setOrigin(0.5);

      const closeText = this.add.text(56, 8, '✕', {
        fontSize: '11px', color: '#f87171',
      }).setOrigin(0.5);

      slot.add([bg, charText, closeText]);

      bg.on('pointerdown', () => {
        this.currentForgeWords.splice(index, 1);
        this.refreshForgeUI();
      });

      container.add(slot);

      if (index < this.currentForgeWords.length - 1) {
        const plus = this.add.text(sx + 64 + 6, sy + 38, '＋', {
          fontFamily: 'serif', fontSize: '18px', color: '#c0a87a',
        }).setOrigin(0.5);
        container.add(plus);
      }
    });
  }

  private refreshForgeWordSelector(): void {
    const container = (this as any).forgeWordSelector as Phaser.GameObjects.Container | undefined;
    if (!container) return;
    container.removeAll(true);

    const wordInventory = gameState.meta.wordInventory || {};
    const wordsInInventory = (Object.keys(wordInventory) as WordId[]).filter(
      (w) => (wordInventory[w] ?? 0) > 0
    );

    if (wordsInInventory.length === 0) {
      const emptyText = this.add.text(0, 8, '（仓中暂无已生成的字，请先前往上方「毛笔宣纸造字台」运笔造字）', {
        fontSize: '13px', color: '#6d7b6f', fontStyle: 'italic',
      });
      container.add(emptyText);
      return;
    }

    wordsInInventory.forEach((wordId, index) => {
      const totalCount = wordInventory[wordId] ?? 0;
      const placedCount = this.currentForgeWords.filter((w) => w === wordId).length;
      const available = totalCount - placedCount;

      const x = (index % 8) * 88;
      const y = Math.floor(index / 8) * 50;

      const card = this.add.container(x, y);
      const isAvailable = available > 0;

      const bg = this.add.rectangle(0, 0, 78, 42, isAvailable ? 0x222e25 : 0x181f1a, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1.5, isAvailable ? 0x5a705e : 0x333d35);

      const label = this.add.text(39, 21, `${wordId} ×${available}`, {
        fontFamily: 'serif',
        fontSize: '16px',
        color: isAvailable ? '#f0e8d5' : '#576258',
      }).setOrigin(0.5);

      card.add([bg, label]);
      container.add(card);

      if (isAvailable) {
        bg.setInteractive({ draggable: true, useHandCursor: true });

        // Click to add directly
        let dragStarted = false;
        bg.on('pointerdown', () => {
          dragStarted = false;
        });

        bg.on('dragstart', () => {
          dragStarted = true;
          bg.setStrokeStyle(2, 0xd0b466);
          card.setDepth(100);
        });

        bg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          card.x = dragX;
          card.y = dragY;
        });

        bg.on('dragend', (pointer: Phaser.Input.Pointer) => {
          card.setDepth(0);
          card.setPosition(x, y);

          // Check if pointer is within the forge slots bounding box (x: 48..518, y: 230..370)
          const inForgeBox = pointer.x >= 48 && pointer.x <= 518 && pointer.y >= 230 && pointer.y <= 370;
          if (inForgeBox) {
            this.currentForgeWords.push(wordId);
            this.refreshForgeUI();
          } else if (!dragStarted) {
            // Click without dragging
            this.currentForgeWords.push(wordId);
            this.refreshForgeUI();
          }
        });

        bg.on('pointerup', () => {
          if (!dragStarted) {
            this.currentForgeWords.push(wordId);
            this.refreshForgeUI();
          }
        });
      }
    });
  }

  private updateForgePreview(): void {
    const card = this.forgePreviewCard;
    if (!card) return;
    card.removeAll(true);

    // Background card
    card.add(this.add.rectangle(0, 0, 240, 140, 0x242e26, 0.98).setOrigin(0).setStrokeStyle(2, 0x78907b));

    if (this.currentForgeWords.length === 0) {
      card.add(this.add.text(120, 70, '未放入汉字\n请将下方字拖入或点击放入', {
        fontSize: '13px', color: '#728070', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5));
      return;
    }

    const check = gameState.canPlayerForgeWeapon(this.currentForgeWords);
    if (check.weaponId) {
      const weapon = COMPOUND_WEAPONS[check.weaponId];
      card.add(this.add.text(18, 14, `【${weapon.name}】`, {
        fontFamily: 'serif', fontSize: '20px', color: '#f7e7c4', fontStyle: 'bold',
      }));
      card.add(this.add.text(18, 40, `伤害 ${weapon.stats.damage} · 攻速 ${weapon.stats.attackSpeed}x`, {
        fontSize: '12px', color: '#d0b466',
      }));
      card.add(this.add.text(18, 62, weapon.summary, {
        fontSize: '11px', color: '#b2c2af', wordWrap: { width: 204 }, lineSpacing: 3,
      }));

      const isEquipped = gameState.meta.equippedWeapon === check.weaponId;
      const forgeBtn = this.add.text(120, 114, isEquipped ? '✓ 已装备出征' : '锻造并装备', {
        fontSize: '13px',
        color: isEquipped ? '#6e806d' : '#1e180d',
        backgroundColor: isEquipped ? '#38463a' : '#d2a74c',
        padding: { x: 18, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: !isEquipped });

      if (!isEquipped) {
        forgeBtn.on('pointerdown', () => {
          const forged = gameState.forgeWeapon(this.currentForgeWords);
          if (forged) {
            this.showFloatingNotice(`⚔️ 锻造成功！【${weapon.name}】已作为当前出征武器！`);
            this.currentForgeWords = [];
            this.refreshForgeUI();
            this.updateExpeditionWeaponBadge();
          }
        });
      }

      card.add(forgeBtn);
    } else {
      const errorMsg = check.error || '当前汉字组合尚未参透武器真意';
      card.add(this.add.text(120, 70, `${errorMsg}\n（可继续调整或添加放入的字）`, {
        fontSize: '12px', color: '#c27b7b', align: 'center', lineSpacing: 6, wordWrap: { width: 210 },
      }).setOrigin(0.5));
    }
  }

  private refreshWeaponShelf(): void {
    const shelf = (this as any).forgeWeaponShelf as Phaser.GameObjects.Container | undefined;
    if (!shelf) return;
    shelf.removeAll(true);

    const unlocked = gameState.meta.unlockedWeapons;
    unlocked.forEach((wId, index) => {
      const weapon = COMPOUND_WEAPONS[wId];
      if (!weapon) return;
      const x = index * 160;
      const isEquipped = gameState.meta.equippedWeapon === wId;

      const card = this.add.container(x, 0);
      card.add(this.add.rectangle(0, 0, 150, 78, isEquipped ? 0x364839 : 0x1f2621, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1.5, isEquipped ? 0xd0b466 : 0x48584a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gameState.equipWeapon(wId);
          this.showFloatingNotice(`已切换出征武器：【${weapon.name}】`);
          this.refreshWeaponShelf();
          this.updateForgePreview();
          this.updateExpeditionWeaponBadge();
        }));

      card.add(this.add.text(12, 10, weapon.name, {
        fontFamily: 'serif', fontSize: '16px', color: isEquipped ? '#fff' : '#e2d8c3', fontStyle: 'bold',
      }));

      card.add(this.add.text(12, 34, `伤害 ${weapon.stats.damage} · 攻速 ${weapon.stats.attackSpeed}x`, {
        fontSize: '11px', color: '#97a695',
      }));

      card.add(this.add.text(12, 54, isEquipped ? '✓ 当前出征' : '点击装备', {
        fontSize: '11px', color: isEquipped ? '#f0dfb3' : '#6b7a69',
      }));

      shelf.add(card);
    });
  }

  // --- 4. 出征关口 (Expedition Gate) ---

  private drawExpeditionGate(): void {
    const gateX = 818;
    const gateY = 160;

    const gate = this.add.container(gateX, gateY);
    gate.add(this.add.rectangle(0, 0, 158, 480, 0x222a23, 0.98).setOrigin(0).setStrokeStyle(2, 0x8a7751));

    gate.add(this.add.text(79, 52, '关', {
      fontFamily: 'serif', fontSize: '56px', color: '#e6d3a2',
    }).setOrigin(0.5));

    gate.add(this.add.text(79, 116, '三域出征', {
      fontFamily: 'serif', fontSize: '18px', color: '#f1eee3',
    }).setOrigin(0.5));

    gate.add(this.add.text(79, 144, `通关 ${gameState.meta.victories} 次`, {
      fontSize: '13px', color: '#aeb9ae',
    }).setOrigin(0.5));

    // Current equipped weapon badge
    const badge = this.add.text(79, 224, '', {
      fontFamily: 'serif', fontSize: '15px', color: '#f2dfb5', align: 'center', wordWrap: { width: 130 }, lineSpacing: 4,
    }).setOrigin(0.5);
    (this as any).expeditionWeaponBadge = badge;
    gate.add(badge);
    this.updateExpeditionWeaponBadge();

    // Start expedition button
    const startBtn = this.add.text(79, 410, '出 征', {
      fontFamily: 'serif',
      fontSize: '22px',
      color: '#241e15',
      backgroundColor: '#d8be7c',
      padding: { x: 26, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setBackgroundColor('#eed79b'));
    startBtn.on('pointerout', () => startBtn.setBackgroundColor('#d8be7c'));
    startBtn.on('pointerdown', () => {
      gameState.startExpedition();
      this.scene.start('Route');
    });

    gate.add(startBtn);
  }

  private updateExpeditionWeaponBadge(): void {
    const badge = (this as any).expeditionWeaponBadge as Phaser.GameObjects.Text | undefined;
    if (badge) {
      const weapon = gameState.getEquippedWeapon();
      badge.setText(`当前佩武：\n【${weapon.name}】\n(${weapon.type === 'ranged' ? '远程' : weapon.type === 'defense' ? '防守' : '近战'})`);
    }
  }

  // --- UI Helpers ---

  private refreshInventoryUI(): void {
    STROKES.forEach((s) => {
      if (this.inventoryTexts[s]) {
        this.inventoryTexts[s].setText(`${gameState.meta.inventory[s]}`);
      }
    });
  }

  private showFloatingNotice(text: string): void {
    const notice = this.add.text(512, 110, text, {
      fontFamily: 'serif',
      fontSize: '17px',
      color: '#ffffff',
      backgroundColor: '#6b4e28',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setDepth(100);

    this.tweens.add({
      targets: notice,
      y: 90,
      alpha: 0,
      duration: 2600,
      ease: 'Power2',
      onComplete: () => notice.destroy(),
    });
  }

  private drawSettlement(settlement: Settlement): void {
    const title = settlement.outcome === 'victory' ? '凯旋归营' : settlement.outcome === 'retreat' ? '携墨归营' : '败退归营';
    const keptTotal = gameState.inventoryTotal(settlement.kept);
    const veil = this.add.rectangle(512, 384, 1024, 768, 0x111712, 0.72).setDepth(200);
    const panel = this.add.container(512, 384).setDepth(201);
    panel.add(this.add.rectangle(0, 0, 480, 270, 0xe8e1ce, 1).setStrokeStyle(3, 0x765b3f));
    panel.add(this.add.text(0, -90, title, { fontFamily: 'serif', fontSize: '36px', color: '#352d24' }).setOrigin(0.5));
    panel.add(this.add.text(0, -32, `抵达第 ${settlement.areaReached} 区域`, { fontSize: '16px', color: '#645b50' }).setOrigin(0.5));
    panel.add(this.add.text(0, 8, `带回笔画 ${keptTotal} 枚${settlement.lost ? ` · 遗失 ${settlement.lost} 枚` : ''}`, { fontSize: '18px', color: '#594329' }).setOrigin(0.5));
    const close = this.add.text(0, 78, '收 入 仓 中', {
      fontSize: '17px', color: '#f5ead1', backgroundColor: '#684d35', padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => {
      panel.destroy();
      veil.destroy();
      this.refreshInventoryUI();
    });
    panel.add(close);
  }
}
