import Phaser from 'phaser';
import { gameState, WordId, COMPOUND_WEAPONS, CompoundWeaponId } from '../state/GameState';
import { InkVFX } from '../visuals/InkAtmosphere';

export type ForgeWorkshopCallbacks = {
  onForged: (weaponId: CompoundWeaponId) => void;
  onWeaponEquipped: (weaponId: CompoundWeaponId) => void;
  showNotice: (msg: string) => void;
};

export class ForgeWorkshop {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private callbacks: ForgeWorkshopCallbacks;

  // Forge state
  private currentForgeWords: WordId[] = [];
  private forgeSlotsContainer!: Phaser.GameObjects.Container;
  private forgePreviewCard!: Phaser.GameObjects.Container;
  private forgeWordSelector!: Phaser.GameObjects.Container;
  private forgeWeaponShelf!: Phaser.GameObjects.Container;

  constructor(
    scene: Phaser.Scene,
    container: Phaser.GameObjects.Container,
    callbacks: ForgeWorkshopCallbacks
  ) {
    this.scene = scene;
    this.container = container;
    this.callbacks = callbacks;
    this.create();
  }

  private create(): void {
    const parent = this.container;

    // Header title (Requirement 2: LXGW WenKai typography)
    parent.add(this.scene.add.text(48, 160, '铸武台 (字词熔铸成武)', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
      fontSize: '24px',
      color: '#fdf5e6',
      shadow: {
        color: 'rgba(223, 196, 104, 0.35)',
        blur: 8,
        fill: true,
      },
    }));
    parent.add(this.scene.add.text(48, 194, '将仓中已生成的字拖拽或点击放入锻造台，熔铸词组武器。不限字数，字在锻造后消耗。', {
      fontFamily: '"Noto Serif SC", serif',
      fontSize: '13px',
      color: '#9aa898',
    }));

    // Open Configurator Button
    const configBtn = this.scene.add.text(780, 160, '⚙️ 天工配置台 (配置武器/特性)', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '13px',
      color: '#dfc068',
      backgroundColor: '#202b22',
      padding: { x: 14, y: 7 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    configBtn.setStroke('#635128', 1.5);
    configBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 6 });
      window.open(window.location.pathname + '?view=weapon-editor', '_blank');
    });
    parent.add(configBtn);

    // Forge Slots Drop Zone (Requirement 8: Floating drop shadow)
    const forgeBoxX = 48;
    const forgeBoxY = 230;
    const forgeBoxW = 470;
    const forgeBoxH = 140;

    InkVFX.createDropShadow(this.scene, forgeBoxX, forgeBoxY, forgeBoxW, forgeBoxH, 8, 0.45, { x: 6, y: 8 });

    const forgeBoxBg = this.scene.add.rectangle(forgeBoxX, forgeBoxY, forgeBoxW, forgeBoxH, 0x1c251e, 0.98)
      .setOrigin(0)
      .setStrokeStyle(1.5, 0x78632f);
    const forgeBoxInner = this.scene.add.rectangle(forgeBoxX + 3, forgeBoxY + 3, forgeBoxW - 6, forgeBoxH - 6, 0x000000, 0)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3d4b3f);
    parent.add([forgeBoxBg, forgeBoxInner]);

    parent.add(this.scene.add.text(forgeBoxX + 16, forgeBoxY + 12, '锻造槽位 (拖拽或点击下方字放入，点击槽内字可移出):', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '13px',
      color: '#dfc068',
      fontStyle: 'bold',
    }));

    // Clear Button (Cinnabar brush button)
    const clearContainer = this.scene.add.container(forgeBoxX + forgeBoxW - 48, forgeBoxY + 18);
    const clearImg = this.scene.add.image(0, 0, 'tx_brush_btn_red').setOrigin(0.5).setInteractive({ useHandCursor: true });
    const clearText = this.scene.add.text(0, 0, '清空槽位', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '11px',
      color: '#ffd0d0',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    clearContainer.add([clearImg, clearText]);
    clearImg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'ink', count: 6 });
      this.currentForgeWords = [];
      this.refresh();
    });
    parent.add(clearContainer);

    this.forgeSlotsContainer = this.scene.add.container(forgeBoxX, forgeBoxY);
    parent.add(this.forgeSlotsContainer);

    // Forge Preview Card
    const previewX = forgeBoxX + forgeBoxW + 20;
    InkVFX.createDropShadow(this.scene, previewX, forgeBoxY, 240, 140, 6, 0.45, { x: 6, y: 7 });

    this.forgePreviewCard = this.scene.add.container(previewX, forgeBoxY);
    parent.add(this.forgePreviewCard);

    // Word Inventory Section
    parent.add(this.scene.add.text(48, 395, '仓中已生成字 (拖拽或点击放入锻造槽):', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '14px',
      color: '#dfc068',
      fontStyle: 'bold',
    }));

    this.forgeWordSelector = this.scene.add.container(48, 425);
    parent.add(this.forgeWordSelector);

    // Unlocked Weapons Shelf below
    parent.add(this.scene.add.text(48, 510, '已铸造词组武器库 (点击直接装备出征):', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '14px',
      color: '#dfc068',
      fontStyle: 'bold',
    }));

    this.forgeWeaponShelf = this.scene.add.container(48, 540);
    parent.add(this.forgeWeaponShelf);

    this.refresh();
  }

  public refresh(): void {
    this.refreshForgeSlots();
    this.refreshForgeWordSelector();
    this.refreshWeaponShelf();
    this.updateForgePreview();
  }

  public clearSlots(): void {
    this.currentForgeWords = [];
    this.refresh();
  }

  private refreshForgeSlots(): void {
    if (!this.forgeSlotsContainer) return;
    this.forgeSlotsContainer.removeAll(true);

    if (this.currentForgeWords.length === 0) {
      const emptyHint = this.scene.add.text(235, 75, '【虚位以待】从下方拖拽或点击字放入熔炉', {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '13px',
        color: '#687769',
        fontStyle: 'italic',
      }).setOrigin(0.5);
      this.forgeSlotsContainer.add(emptyHint);
      return;
    }

    this.currentForgeWords.forEach((wordId, index) => {
      const sx = 20 + index * 76;
      const sy = 38;

      // Drop shadow for slot
      InkVFX.createDropShadow(this.scene, sx + 48, sy + 230, 64, 76, 4, 0.35, { x: 3, y: 4 });

      const slot = this.scene.add.container(sx, sy);
      const bg = this.scene.add.rectangle(0, 0, 64, 76, 0x1d2720, 0.96)
        .setOrigin(0)
        .setStrokeStyle(1.5, 0xd0b466)
        .setInteractive({ useHandCursor: true });

      const charText = this.scene.add.text(32, 34, wordId, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '32px',
        color: '#fdf5e6',
      }).setOrigin(0.5);

      const closeText = this.scene.add.text(56, 8, '✕', {
        fontSize: '11px',
        color: '#f87171',
      }).setOrigin(0.5);

      slot.add([bg, charText, closeText]);

      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'ink', count: 6 });
        this.currentForgeWords.splice(index, 1);
        this.refresh();
      });

      this.forgeSlotsContainer.add(slot);

      if (index < this.currentForgeWords.length - 1) {
        const plus = this.scene.add.text(sx + 64 + 6, sy + 38, '＋', {
          fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
          fontSize: '18px',
          color: '#dfc068',
        }).setOrigin(0.5);
        this.forgeSlotsContainer.add(plus);
      }
    });
  }

  private refreshForgeWordSelector(): void {
    if (!this.forgeWordSelector) return;
    this.forgeWordSelector.removeAll(true);

    const wordInventory = gameState.meta.wordInventory || {};
    const wordsInInventory = (Object.keys(wordInventory) as WordId[]).filter(
      (w) => (wordInventory[w] ?? 0) > 0
    );

    if (wordsInInventory.length === 0) {
      const emptyText = this.scene.add.text(0, 8, '（仓中暂无已生成的字，请先前往上方「毛笔宣纸造字台」运笔造字）', {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '13px',
        color: '#6d7b6f',
        fontStyle: 'italic',
      });
      this.forgeWordSelector.add(emptyText);
      return;
    }

    wordsInInventory.forEach((wordId, index) => {
      const totalCount = wordInventory[wordId] ?? 0;
      const placedCount = this.currentForgeWords.filter((w) => w === wordId).length;
      const available = totalCount - placedCount;

      const x = (index % 8) * 88;
      const y = Math.floor(index / 8) * 50;

      // Drop shadow for word card
      InkVFX.createDropShadow(this.scene, x + 48, y + 425, 78, 42, 4, 0.35, { x: 2, y: 3 });

      const card = this.scene.add.container(x, y);
      const isAvailable = available > 0;

      const bg = this.scene.add.rectangle(0, 0, 78, 42, isAvailable ? 0x222e25 : 0x181f1a, 0.96)
        .setOrigin(0)
        .setStrokeStyle(1.5, isAvailable ? 0x4f6452 : 0x333d35);

      const label = this.scene.add.text(39, 21, `${wordId} ×${available}`, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '16px',
        color: isAvailable ? '#fdf5e6' : '#576258',
      }).setOrigin(0.5);

      card.add([bg, label]);
      this.forgeWordSelector.add(card);

      if (isAvailable) {
        bg.setInteractive({ draggable: true, useHandCursor: true });

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

          const inForgeBox = pointer.x >= 48 && pointer.x <= 518 && pointer.y >= 230 && pointer.y <= 370;
          if (inForgeBox) {
            InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 6 });
            this.currentForgeWords.push(wordId);
            this.refresh();
          } else if (!dragStarted) {
            InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 6 });
            this.currentForgeWords.push(wordId);
            this.refresh();
          }
        });

        bg.on('pointerup', (pointer: Phaser.Input.Pointer) => {
          if (!dragStarted) {
            InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 6 });
            this.currentForgeWords.push(wordId);
            this.refresh();
          }
        });
      }
    });
  }

  private updateForgePreview(): void {
    if (!this.forgePreviewCard) return;
    this.forgePreviewCard.removeAll(true);

    const cardBg = this.scene.add.rectangle(0, 0, 240, 140, 0x1c251e, 0.98)
      .setOrigin(0)
      .setStrokeStyle(1.5, 0x78632f);
    const cardInner = this.scene.add.rectangle(3, 3, 234, 134, 0x000000, 0)
      .setOrigin(0)
      .setStrokeStyle(1, 0x3d4b3f);
    this.forgePreviewCard.add([cardBg, cardInner]);

    if (this.currentForgeWords.length === 0) {
      this.forgePreviewCard.add(
        this.scene.add.text(120, 70, '未放入汉字\n请将下方字拖入或点击放入', {
          fontFamily: '"Noto Serif SC", serif',
          fontSize: '13px',
          color: '#728070',
          align: 'center',
          lineSpacing: 6,
        }).setOrigin(0.5)
      );
      return;
    }

    const check = gameState.canPlayerForgeWeapon(this.currentForgeWords);
    if (check.weaponId) {
      const weapon = COMPOUND_WEAPONS[check.weaponId];
      if (!weapon) return;

      this.forgePreviewCard.add(this.scene.add.text(18, 14, `【${weapon.name}】`, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '20px',
        color: '#fdf5e6',
        fontStyle: 'bold',
      }));
      this.forgePreviewCard.add(this.scene.add.text(18, 40, `伤害 ${weapon.stats.damage} · 攻速 ${weapon.stats.attackSpeed}x`, {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '12px',
        color: '#dfc068',
      }));
      this.forgePreviewCard.add(this.scene.add.text(18, 62, weapon.summary, {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '11px',
        color: '#a3b2a0',
        wordWrap: { width: 204 },
        lineSpacing: 3,
      }));

      const isEquipped = gameState.meta.equippedWeapon === check.weaponId;

      // Forge button as calligraphic brush button (Requirement 3)
      const btnContainer = this.scene.add.container(120, 114);
      const btnBg = this.scene.add.image(0, 0, isEquipped ? 'tx_brush_btn_small_dark' : 'tx_brush_btn_small_gold')
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: !isEquipped });

      const btnText = this.scene.add.text(0, 0, isEquipped ? '✓ 已装备出征' : '锻造并装备', {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
        fontSize: '13px',
        color: isEquipped ? '#5c6e5e' : '#251a0b',
        fontStyle: 'bold',
      }).setOrigin(0.5);

      btnContainer.add([btnBg, btnText]);

      if (!isEquipped) {
        btnBg.on('pointerover', () => btnContainer.setScale(1.05));
        btnBg.on('pointerout', () => btnContainer.setScale(1.0));
        btnBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 14 });
          const forged = gameState.forgeWeapon(this.currentForgeWords);
          if (forged) {
            this.callbacks.showNotice(`⚔️ 锻造成功！【${weapon.name}】已作为当前出征武器！`);
            this.currentForgeWords = [];
            this.refresh();
            this.callbacks.onForged(forged);
          }
        });
      }

      this.forgePreviewCard.add(btnContainer);
    } else {
      const errorMsg = check.error || '当前汉字组合尚未参透武器真意';
      this.forgePreviewCard.add(this.scene.add.text(120, 70, `${errorMsg}\n（可继续调整或添加放入的字）`, {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '12px',
        color: '#c27b7b',
        align: 'center',
        lineSpacing: 6,
        wordWrap: { width: 210 },
      }).setOrigin(0.5));
    }
  }

  private refreshWeaponShelf(): void {
    if (!this.forgeWeaponShelf) return;
    this.forgeWeaponShelf.removeAll(true);

    const unlocked = gameState.meta.unlockedWeapons;
    unlocked.forEach((wId, index) => {
      const weapon = COMPOUND_WEAPONS[wId];
      if (!weapon) return;
      const x = index * 160;
      const isEquipped = gameState.meta.equippedWeapon === wId;

      // Drop shadow for weapon card
      InkVFX.createDropShadow(this.scene, x + 48, 540, 150, 78, 4, 0.35, { x: 3, y: 4 });

      const card = this.scene.add.container(x, 0);
      card.add(this.scene.add.rectangle(0, 0, 150, 78, isEquipped ? 0x27362a : 0x1d2720, 0.96)
        .setOrigin(0)
        .setStrokeStyle(1.5, isEquipped ? 0xd0b466 : 0x48584a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 8 });
          gameState.equipWeapon(wId);
          this.callbacks.showNotice(`已切换出征武器：【${weapon.name}】`);
          this.refreshWeaponShelf();
          this.updateForgePreview();
          this.callbacks.onWeaponEquipped(wId);
        }));

      card.add(this.scene.add.text(12, 10, weapon.name, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '16px',
        color: isEquipped ? '#fff6dd' : '#fdf5e6',
        fontStyle: 'bold',
      }));

      card.add(this.scene.add.text(12, 34, `伤害 ${weapon.stats.damage} · 攻速 ${weapon.stats.attackSpeed}x`, {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '11px',
        color: '#dfc068',
      }));

      card.add(this.scene.add.text(12, 54, isEquipped ? '✓ 当前出征' : '点击装备', {
        fontFamily: '"Noto Serif SC", serif',
        fontSize: '11px',
        color: isEquipped ? '#f0dfb3' : '#788977',
      }));

      this.forgeWeaponShelf.add(card);
    });
  }
}
