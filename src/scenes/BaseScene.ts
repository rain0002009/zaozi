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

import { InkTextureGenerator } from '../visuals/InkTextures';
import { InkAtmosphereManager, InkVFX } from '../visuals/InkAtmosphere';

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
  private strokeImages: Record<Stroke, Phaser.GameObjects.Image> = {} as any;

  // Atmosphere
  private atmosphere!: InkAtmosphereManager;

  constructor() {
    super('Base');
  }

  create(data: BaseSceneData): void {
    this.cameras.main.setBackgroundColor('#0c130e');

    // 1. Generate all procedural textures
    InkTextureGenerator.generateAll(this);

    // 2. Ink & Mountain textured background (Requirement 1)
    this.drawInkBackground();

    // 3. Full-screen floating particles atmosphere (Requirement 7)
    this.atmosphere = new InkAtmosphereManager(this, 40, 15);
    this.events.once('shutdown', () => {
      if (this.atmosphere) this.atmosphere.destroy();
    });

    // Top Header (Requirement 2: WenKai serif typography)
    this.add.text(48, 26, '归 字 营', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '38px',
      color: '#f5ead2',
      shadow: {
        color: 'rgba(223, 196, 104, 0.35)',
        blur: 10,
        fill: true,
      },
    });
    this.add.text(194, 38, '人族最后的造字与铸武之所', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '14px',
      color: '#9aa898',
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

  override update(time: number, delta: number): void {
    if (this.atmosphere) {
      this.atmosphere.update(time, delta);
    }
  }

  private drawInkBackground(): void {
    // Requirement 1: Textured ink wash background with mountain silhouettes and vignette
    this.add.image(0, 0, 'tx_ink_bg').setOrigin(0);
  }

  private drawTabSwitcher(): void {
    const tabs = [
      { id: 'craft' as const, label: '✍️ 毛笔宣纸造字台' },
      { id: 'forge' as const, label: '⚔️ 铸武台 (字词熔铸成武)' },
    ];

    tabs.forEach((tab, index) => {
      const x = 510 + index * 170;
      const isCurrent = this.currentTab === tab.id;
      const btn = this.add.text(x, 34, tab.label, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '14px',
        color: isCurrent ? '#fdf5e6' : '#8fa08e',
        backgroundColor: isCurrent ? '#2a3b2e' : '#18241b',
        padding: { x: 14, y: 8 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      btn.setStroke(isCurrent ? '#dfc068' : '#394c3c', 1.5);

      btn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 6 });
        this.switchTab(tab.id);
      });
      (this as any)[`tabBtn_${tab.id}`] = btn;
    });
  }

  private switchTab(tab: 'craft' | 'forge'): void {
    const prevTab = this.currentTab;
    this.currentTab = tab;
    this.gridContainer.setVisible(tab === 'craft');
    this.forgeContainer.setVisible(tab === 'forge');

    const activeContainer = tab === 'craft' ? this.gridContainer : this.forgeContainer;
    if (prevTab !== tab) {
      InkVFX.applyOvershootEntrance(this, activeContainer);
    }

    const btnCraft = (this as any).tabBtn_craft as Phaser.GameObjects.Text | undefined;
    const btnForge = (this as any).tabBtn_forge as Phaser.GameObjects.Text | undefined;

    if (btnCraft) {
      btnCraft.setColor(tab === 'craft' ? '#fdf5e6' : '#8fa08e');
      btnCraft.setBackgroundColor(tab === 'craft' ? '#2a3b2e' : '#18241b');
      btnCraft.setStroke(tab === 'craft' ? '#dfc068' : '#394c3c', 1.5);
    }
    if (btnForge) {
      btnForge.setColor(tab === 'forge' ? '#fdf5e6' : '#8fa08e');
      btnForge.setBackgroundColor(tab === 'forge' ? '#2a3b2e' : '#18241b');
      btnForge.setStroke(tab === 'forge' ? '#dfc068' : '#394c3c', 1.5);
    }
  }

  // --- 1. 仓中笔画栏 (Inventory Bar) ---

  private drawInventoryBar(): void {
    // Outer drop shadow (Requirement 8)
    InkVFX.createDropShadow(this, 48, 80, 928, 64, 8, 0.45);

    const bar = this.add.container(48, 80);

    // Procedural textured bar background (Requirement 1)
    bar.add(this.add.image(0, 0, 'tx_inventory_bar').setOrigin(0));

    // Label with calligraphy font and antique gold
    bar.add(this.add.text(20, 22, '仓中笔画:', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '15px',
      color: '#dfc068',
      fontStyle: 'bold',
    }));

    STROKES.forEach((stroke, index) => {
      const x = 118 + index * 98;
      const slot = this.add.container(x, 7);

      const isSelected = stroke === this.selectedStrokeForPlacement;
      const tokenImg = this.add.image(0, 0, isSelected ? 'tx_bamboo_token_active' : 'tx_bamboo_token')
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });

      const strokeText = this.add.text(24, 7, stroke, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '26px',
        color: isSelected ? '#fff2c8' : '#ede2ca',
        stroke: '#1b261d',
        strokeThickness: 2,
      });

      const countText = this.add.text(62, 25, `${gameState.meta.inventory[stroke]}`, {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '13px',
        color: '#fbf7ed',
      }).setOrigin(0.5);

      this.inventoryTexts[stroke] = countText;
      this.strokeButtons[stroke] = slot;
      this.strokeImages[stroke] = tokenImg;

      slot.add([tokenImg, strokeText, countText]);

      tokenImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.selectedStrokeForPlacement = stroke;
        this.updateSelectedStrokeHighlight();
        InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 7 });
      });

      bar.add(slot);
    });
  }

  private updateSelectedStrokeHighlight(): void {
    STROKES.forEach((s) => {
      const img = this.strokeImages[s];
      if (img) {
        img.setTexture(s === this.selectedStrokeForPlacement ? 'tx_bamboo_token_active' : 'tx_bamboo_token');
      }
    });
  }

  // --- 2. 出征关口 (Expedition Gate) ---

  private drawExpeditionGate(): void {
    const gateX = 818;
    const gateY = 160;

    // Requirement 8: Floating drop shadow
    InkVFX.createDropShadow(this, gateX, gateY, 158, 480, 8, 0.55, { x: 7, y: 9 });

    const gate = this.add.container(gateX, gateY);
    // Requirement 6: Embossed golden relief frame
    gate.add(this.add.image(0, 0, 'tx_gold_relief_gate').setOrigin(0));

    // Requirement 6: Gilded calligraphy character "关" with outer drop glow
    const charGlow = this.add.text(79, 52, '关', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '58px',
      color: '#fff3cd',
      stroke: '#806225',
      strokeThickness: 3,
      shadow: {
        color: '#e6c86e',
        blur: 16,
        stroke: true,
        fill: true,
      },
    }).setOrigin(0.5);
    gate.add(charGlow);

    gate.add(this.add.text(79, 116, '三域出征', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '18px',
      color: '#f4ebd8',
    }).setOrigin(0.5));

    gate.add(this.add.text(79, 144, `通关 ${gameState.meta.victories} 次`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '13px',
      color: '#aeb9ae',
    }).setOrigin(0.5));

    // Current equipped weapon badge
    const badge = this.add.text(79, 230, '', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '14px',
      color: '#faebc7',
      align: 'center',
      wordWrap: { width: 130 },
      lineSpacing: 5,
    }).setOrigin(0.5);
    (this as any).expeditionWeaponBadge = badge;
    gate.add(badge);
    this.updateExpeditionWeaponBadge();

    // Start expedition button (Requirement 3: brush stroke styling, gold glow aura, ink spatter)
    const btnContainer = this.add.container(79, 410);
    const btnImg = this.add.image(0, 0, 'tx_brush_btn_gold').setOrigin(0.5).setInteractive({ useHandCursor: true });
    const btnText = this.add.text(0, 0, '出 征', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '22px',
      color: '#251b0d',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    btnContainer.add([btnImg, btnText]);
    gate.add(btnContainer);

    btnImg.on('pointerover', () => {
      this.tweens.add({ targets: btnContainer, scale: 1.06, duration: 150, ease: 'Sine.easeOut' });
    });
    btnImg.on('pointerout', () => {
      this.tweens.add({ targets: btnContainer, scale: 1.0, duration: 150, ease: 'Sine.easeOut' });
    });
    btnImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 14 });
      this.time.delayedCall(160, () => {
        gameState.startExpedition();
        this.scene.start('Route');
      });
    });
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
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '16px',
      color: '#fff5dc',
      backgroundColor: '#2a352c',
      padding: { x: 26, y: 10 },
      stroke: '#d5b364',
      strokeThickness: 1.5,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: notice,
      y: 86,
      alpha: 0,
      duration: 2600,
      ease: 'Power2',
      onComplete: () => notice.destroy(),
    });
  }

  private drawSettlement(settlement: Settlement): void {
    const title = settlement.outcome === 'victory' ? '凯旋归营' : settlement.outcome === 'retreat' ? '携墨归营' : '败退归营';
    const keptTotal = gameState.inventoryTotal(settlement.kept);
    const veil = this.add.rectangle(512, 384, 1024, 768, 0x0a100c, 0.78).setDepth(200);

    // Drop shadow behind modal
    const shadow = InkVFX.createDropShadow(this, 272, 249, 480, 270, 8, 0.6, { x: 8, y: 10 }).setDepth(201);

    const panel = this.add.container(512, 384).setDepth(202);
    panel.add(this.add.rectangle(0, 0, 480, 270, 0x1f2a22, 0.98).setStrokeStyle(2, 0xc49f49));
    panel.add(this.add.rectangle(0, 0, 468, 258, 0x000000, 0).setStrokeStyle(1, 0x485a4a));

    panel.add(this.add.text(0, -84, title, {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '34px',
      color: '#fdf5e6',
      stroke: '#7d6124',
      strokeThickness: 2,
    }).setOrigin(0.5));

    panel.add(this.add.text(0, -30, `抵达第 ${settlement.areaReached} 区域`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '15px',
      color: '#a3b2a0',
    }).setOrigin(0.5));

    panel.add(this.add.text(0, 10, `带回笔画 ${keptTotal} 枚${settlement.lost ? ` · 遗失 ${settlement.lost} 枚` : ''}`, {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '18px',
      color: '#f0dfb3',
    }).setOrigin(0.5));

    const closeBtnImg = this.add.image(0, 80, 'tx_brush_btn_gold').setOrigin(0.5).setInteractive({ useHandCursor: true });
    const closeBtnText = this.add.text(0, 80, '收 入 仓 中', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '17px',
      color: '#261b0a',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    closeBtnImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 10 });
      panel.destroy();
      shadow.destroy();
      veil.destroy();
      this.refreshInventoryUI();
    });

    panel.add([closeBtnImg, closeBtnText]);

    // Requirement 9: 0.3s Overshoot entrance
    InkVFX.applyOvershootEntrance(this, panel);
  }
}
