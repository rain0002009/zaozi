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

    // Open Configurator Button (天工配置台)
    const configBtn = this.scene.add.text(760, 114, '⚙️ 天工配置台', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '13px',
      color: '#dfc068',
      backgroundColor: '#1b251e',
      padding: { x: 14, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    configBtn.setStroke('#635128', 1.5);
    configBtn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 6 });
      window.open(window.location.pathname + '?view=weapon-editor', '_blank');
    });
    parent.add(configBtn);

    // 1. Forge Slots Drop Zone (玄铁熔炼古鼎实物面板，彻底移除外部黑框)
    const forgeBoxX = 48;
    const forgeBoxY = 160;
    const forgeBoxW = 470;
    const forgeBoxH = 140;

    const forgeBoxBg = this.scene.add.image(forgeBoxX, forgeBoxY, 'tx_furnace_panel').setOrigin(0);
    parent.add(forgeBoxBg);

    parent.add(this.scene.add.text(forgeBoxX + 16, forgeBoxY + 12, '【 熔炉槽位 】', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '15px',
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

    // 2. Forge Preview Card (兵刃玄案/神案底图，彻底移除外部黑框)
    const previewX = forgeBoxX + forgeBoxW + 16;
    this.forgePreviewCard = this.scene.add.container(previewX, forgeBoxY);
    parent.add(this.forgePreviewCard);

    // 3. Word Inventory Section (仓中字阵)
    parent.add(this.scene.add.text(48, 320, '【 仓中字阵 】', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '15px',
      color: '#dfc068',
      fontStyle: 'bold',
    }));

    this.forgeWordSelector = this.scene.add.container(48, 350);
    parent.add(this.forgeWordSelector);

    // 4. Unlocked Weapons Shelf below (已铸兵刃)
    parent.add(this.scene.add.text(48, 485, '【 已铸兵刃 】', {
      fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
      fontSize: '15px',
      color: '#dfc068',
      fontStyle: 'bold',
    }));

    this.forgeWeaponShelf = this.scene.add.container(48, 515);
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
      const emptyHint = this.scene.add.text(235, 75, '「待纳二字，合铸神兵」', {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", serif',
        fontSize: '14px',
        color: '#7b8f7e',
        fontStyle: 'italic',
      }).setOrigin(0.5);
      this.forgeSlotsContainer.add(emptyHint);
      return;
    }

    this.currentForgeWords.forEach((wordId, index) => {
      const sx = 20 + index * 76;
      const sy = 38;

      const slot = this.scene.add.container(sx, sy);
      const bg = this.scene.add.image(0, 0, 'tx_seal_slot_active')
        .setOrigin(0)
        .setScale(64 / 64, 76 / 52)
        .setInteractive({ useHandCursor: true });

      const charText = this.scene.add.text(32, 38, wordId, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '32px',
        color: '#fdf5e6',
        fontStyle: 'bold',
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
      const emptyText = this.scene.add.text(0, 8, '（仓中暂无可用汉字，请先于「挥毫造字」运笔凝字）', {
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

      const card = this.scene.add.container(x, y);
      const isAvailable = available > 0;

      const bg = this.scene.add.image(0, 0, isAvailable ? 'tx_word_token' : 'tx_word_token_dim')
        .setOrigin(0);

      const label = this.scene.add.text(39, 21, `${wordId} ×${available}`, {
        fontFamily: '"LXGW WenKai Screen", "LXGW WenKai", "Kaiti SC", KaiTi, serif',
        fontSize: '16px',
        color: isAvailable ? '#fdf5e6' : '#576258',
        fontStyle: 'bold',
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
          card.setScale(1.08);
          card.setDepth(100);
        });

        bg.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
          card.x = dragX;
          card.y = dragY;
        });

        bg.on('dragend', (pointer: Phaser.Input.Pointer) => {
          card.setDepth(0);
          card.setScale(1.0);
          card.setPosition(x, y);

          const inForgeBox = pointer.x >= 48 && pointer.x <= 518 && pointer.y >= 160 && pointer.y <= 300;
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

    // 兵刃玄案底图
    const cardBg = this.scene.add.image(0, 0, 'tx_preview_altar').setOrigin(0);
    this.forgePreviewCard.add(cardBg);

    if (this.currentForgeWords.length === 0) {
      this.forgePreviewCard.add(
        this.scene.add.text(120, 70, '「虚位以待，熔字见真章」\n将下方字牌拖入或点入炉膛', {
          fontFamily: '"Noto Serif SC", serif',
          fontSize: '12px',
          color: '#7b8f7e',
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

      // Forge button as calligraphic brush button
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

      const card = this.scene.add.container(x, 0);
      const bg = this.scene.add.image(0, 0, isEquipped ? 'tx_weapon_card_equipped' : 'tx_weapon_card')
        .setOrigin(0)
        .setInteractive({ useHandCursor: true });

      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        InkVFX.spawnInkSpatter(this.scene, pointer.x, pointer.y, { color: 'gold', count: 8 });
        gameState.equipWeapon(wId);
        this.callbacks.showNotice(`已切换出征武器：【${weapon.name}】`);
        this.refreshWeaponShelf();
        this.updateForgePreview();
        this.callbacks.onWeaponEquipped(wId);
      });

      card.add(bg);

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
