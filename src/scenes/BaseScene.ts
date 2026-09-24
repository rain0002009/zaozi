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

  // Placards navigation
  private tabPlacards: Record<'craft' | 'forge', { bg: Phaser.GameObjects.Image; text: Phaser.GameObjects.Text; container: Phaser.GameObjects.Container }> = {} as any;

  // Atmosphere
  private atmosphere!: InkAtmosphereManager;

  constructor() {
    super('Base');
  }

  create(data: BaseSceneData): void {
    this.cameras.main.setBackgroundColor('#0b100c');

    // 1. Generate all procedural textures
    InkTextureGenerator.generateAll(this);

    // 2. Scholar's ancient desk & camp chamber background (Requirement 1 & Scene Metaphor)
    this.drawInkBackground();

    // 3. Full-screen floating particles atmosphere
    this.atmosphere = new InkAtmosphereManager(this, 36, 15);
    this.events.once('shutdown', () => {
      if (this.atmosphere) this.atmosphere.destroy();
    });

    // Top Header (古风书法题匾)
    this.add.text(48, 24, '归 字 营', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '36px',
      color: '#fdf5e6',
      shadow: {
        color: 'rgba(223, 196, 104, 0.45)',
        blur: 10,
        fill: true,
      },
    });
    this.add.text(190, 36, '人族最后的造字与铸武之所', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '13px',
      color: '#8f9f8d',
    });

    // Top Tab Switcher as Hanging Placards (令签挂牌)
    this.drawTabSwitcher();

    // Inventory Bar (Unrolled silk scroll banner)
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
    // 古风文房木案与营台背景 (无粗糙生硬色块)
    this.add.image(0, 0, 'tx_scene_desk_bg').setOrigin(0);
  }

  private drawTabSwitcher(): void {
    const tabs = [
      { id: 'craft' as const, label: '✍️ 挥毫造字' },
      { id: 'forge' as const, label: '⚔️ 熔字铸武' },
    ];

    tabs.forEach((tab, index) => {
      const x = 580 + index * 170;
      const y = 38;
      const isCurrent = this.currentTab === tab.id;

      const container = this.add.container(x, y);

      const bgKey = isCurrent
        ? (tab.id === 'craft' ? 'tx_token_sign_craft_active' : 'tx_token_sign_forge_active')
        : (tab.id === 'craft' ? 'tx_token_sign_craft' : 'tx_token_sign_forge');

      const bg = this.add.image(0, 0, bgKey).setOrigin(0.5).setInteractive({ useHandCursor: true });

      const text = this.add.text(0, 0, tab.label, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '15px',
        color: isCurrent ? '#fff3c7' : '#9bb09a',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      container.add([bg, text]);

      bg.on('pointerover', () => {
        if (this.currentTab !== tab.id) container.setScale(1.04);
      });
      bg.on('pointerout', () => {
        container.setScale(1.0);
      });
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        InkVFX.spawnInkSpatter(this, pointer.x, pointer.y, { color: 'gold', count: 8 });
        this.switchTab(tab.id);
      });

      this.tabPlacards[tab.id] = { bg, text, container };
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

    const craftPlacard = this.tabPlacards['craft'];
    const forgePlacard = this.tabPlacards['forge'];

    if (craftPlacard) {
      const isAct = tab === 'craft';
      craftPlacard.bg.setTexture(isAct ? 'tx_token_sign_craft_active' : 'tx_token_sign_craft');
      craftPlacard.text.setColor(isAct ? '#fff3c7' : '#9bb09a');
    }
    if (forgePlacard) {
      const isAct = tab === 'forge';
      forgePlacard.bg.setTexture(isAct ? 'tx_token_sign_forge_active' : 'tx_token_sign_forge');
      forgePlacard.text.setColor(isAct ? '#fff3c7' : '#9bb09a');
    }
  }

  // --- 1. 仓中笔画栏 (Inventory Scroll) ---

  private drawInventoryBar(): void {
    const bar = this.add.container(48, 80);

    // 锦缎木轴画卷底图 (彻底根除外凸黑框)
    bar.add(this.add.image(0, 0, 'tx_inventory_scroll').setOrigin(0));

    // 标签标题
    bar.add(this.add.text(24, 22, '仓中笔画:', {
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
        strokeThickness: 1.5,
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

    const gate = this.add.container(gateX, gateY);
    // 浮雕暗金门扉底图 (无生硬黑框)
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
      veil.destroy();
      this.refreshInventoryUI();
    });

    panel.add([closeBtnImg, closeBtnText]);

    // Requirement 9: 0.3s Overshoot entrance
    InkVFX.applyOvershootEntrance(this, panel);
  }
}
