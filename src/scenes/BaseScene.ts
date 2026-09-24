import Phaser from 'phaser';
import {
  gameState,
  STROKES,
  Stroke,
  Settlement,
  WordId,
  CompoundWeaponId,
} from '../state/GameState';
import { CalligraphyWorkshop } from '../workshops/CalligraphyWorkshop';
import { ForgeWorkshop } from '../workshops/ForgeWorkshop';

type BaseSceneData = { settlement?: Settlement };

export class BaseScene extends Phaser.Scene {
  // Navigation tabs
  private currentTab: 'craft' | 'forge' = 'craft';

  // Containers
  private gridContainer!: Phaser.GameObjects.Container;
  private forgeContainer!: Phaser.GameObjects.Container;

  // Workshops
  private calligraphyWorkshop!: CalligraphyWorkshop;
  private forgeWorkshop!: ForgeWorkshop;

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
    this.calligraphyWorkshop = new CalligraphyWorkshop(this, this.gridContainer, {
      onSynthesized: (_wordId: WordId) => {
        this.refreshInventoryUI();
        this.calligraphyWorkshop.refresh();
        this.forgeWorkshop.refresh();
      },
      showNotice: (msg: string) => this.showFloatingNotice(msg),
      getCurrentTab: () => this.currentTab,
    });

    // Container for Weapon Forge
    this.forgeContainer = this.add.container(0, 0);
    this.forgeWorkshop = new ForgeWorkshop(this, this.forgeContainer, {
      onForged: (_weaponId: CompoundWeaponId) => {
        this.updateExpeditionWeaponBadge();
        this.refreshInventoryUI();
      },
      onWeaponEquipped: (_weaponId: CompoundWeaponId) => {
        this.updateExpeditionWeaponBadge();
      },
      showNotice: (msg: string) => this.showFloatingNotice(msg),
    });

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

  // --- 2. 出征关口 (Expedition Gate) ---

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
