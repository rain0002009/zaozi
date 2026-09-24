import Phaser from 'phaser';
import { gameState, WordId, COMPOUND_WEAPONS, CompoundWeaponId } from '../state/GameState';

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

    // Header title
    parent.add(this.scene.add.text(48, 160, '铸武台 (字词熔铸成武)', {
      fontFamily: 'serif', fontSize: '24px', color: '#ede3ce',
    }));
    parent.add(this.scene.add.text(48, 194, '将仓中已生成的字拖拽或点击放入锻造台，熔铸词组武器。不限字数，字在锻造后消耗。', {
      fontSize: '13px', color: '#97a393',
    }));

    // Open Configurator Button
    const configBtn = this.scene.add.text(780, 160, '⚙️ 天工配置台 (配置武器/特性)', {
      fontSize: '13px',
      color: '#d0b466',
      backgroundColor: '#263428',
      padding: { x: 12, y: 6 },
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    configBtn.on('pointerdown', () => {
      window.open(window.location.pathname + '?view=weapon-editor', '_blank');
    });
    parent.add(configBtn);

    // Forge Slots Drop Zone
    const forgeBoxX = 48;
    const forgeBoxY = 230;
    const forgeBoxW = 470;
    const forgeBoxH = 140;

    const forgeBoxBg = this.scene.add.rectangle(forgeBoxX, forgeBoxY, forgeBoxW, forgeBoxH, 0x222c24, 0.98)
      .setOrigin(0)
      .setStrokeStyle(2, 0x5a705e);
    parent.add(forgeBoxBg);

    parent.add(this.scene.add.text(forgeBoxX + 16, forgeBoxY + 12, '锻造槽位 (拖拽或点击下方字放入，点击槽内字可移出):', {
      fontSize: '12px', color: '#8fa090',
    }));

    // Clear Button
    const clearBtn = this.scene.add.text(forgeBoxX + forgeBoxW - 68, forgeBoxY + 10, '清空槽位', {
      fontSize: '11px', color: '#f87171', backgroundColor: '#332222', padding: { x: 6, y: 3 },
    }).setOrigin(0).setInteractive({ useHandCursor: true });
    clearBtn.on('pointerdown', () => {
      this.currentForgeWords = [];
      this.refresh();
    });
    parent.add(clearBtn);

    this.forgeSlotsContainer = this.scene.add.container(forgeBoxX, forgeBoxY);
    parent.add(this.forgeSlotsContainer);

    // Forge Preview Card
    const previewX = forgeBoxX + forgeBoxW + 20;
    this.forgePreviewCard = this.scene.add.container(previewX, forgeBoxY);
    parent.add(this.forgePreviewCard);

    // Word Inventory Section
    parent.add(this.scene.add.text(48, 395, '仓中已生成字 (拖拽或点击放入锻造槽):', {
      fontSize: '14px', color: '#cbd5e1',
    }));

    this.forgeWordSelector = this.scene.add.container(48, 425);
    parent.add(this.forgeWordSelector);

    // Unlocked Weapons Shelf below
    parent.add(this.scene.add.text(48, 510, '已铸造词组武器库 (点击直接装备出征):', {
      fontSize: '14px', color: '#cbd5e1',
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
        fontSize: '13px', color: '#687769', fontStyle: 'italic',
      }).setOrigin(0.5);
      this.forgeSlotsContainer.add(emptyHint);
      return;
    }

    this.currentForgeWords.forEach((wordId, index) => {
      const sx = 20 + index * 76;
      const sy = 40;

      const slot = this.scene.add.container(sx, sy);
      const bg = this.scene.add.rectangle(0, 0, 64, 76, 0x1d2720, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1.5, 0xd0b466)
        .setInteractive({ useHandCursor: true });

      const charText = this.scene.add.text(32, 34, wordId, {
        fontFamily: 'serif', fontSize: '32px', color: '#f0dfb3',
      }).setOrigin(0.5);

      const closeText = this.scene.add.text(56, 8, '✕', {
        fontSize: '11px', color: '#f87171',
      }).setOrigin(0.5);

      slot.add([bg, charText, closeText]);

      bg.on('pointerdown', () => {
        this.currentForgeWords.splice(index, 1);
        this.refresh();
      });

      this.forgeSlotsContainer.add(slot);

      if (index < this.currentForgeWords.length - 1) {
        const plus = this.scene.add.text(sx + 64 + 6, sy + 38, '＋', {
          fontFamily: 'serif', fontSize: '18px', color: '#c0a87a',
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
        fontSize: '13px', color: '#6d7b6f', fontStyle: 'italic',
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

      const bg = this.scene.add.rectangle(0, 0, 78, 42, isAvailable ? 0x222e25 : 0x181f1a, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1.5, isAvailable ? 0x5a705e : 0x333d35);

      const label = this.scene.add.text(39, 21, `${wordId} ×${available}`, {
        fontFamily: 'serif',
        fontSize: '16px',
        color: isAvailable ? '#f0e8d5' : '#576258',
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
            this.currentForgeWords.push(wordId);
            this.refresh();
          } else if (!dragStarted) {
            this.currentForgeWords.push(wordId);
            this.refresh();
          }
        });

        bg.on('pointerup', () => {
          if (!dragStarted) {
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

    this.forgePreviewCard.add(
      this.scene.add.rectangle(0, 0, 240, 140, 0x242e26, 0.98).setOrigin(0).setStrokeStyle(2, 0x78907b)
    );

    if (this.currentForgeWords.length === 0) {
      this.forgePreviewCard.add(
        this.scene.add.text(120, 70, '未放入汉字\n请将下方字拖入或点击放入', {
          fontSize: '13px', color: '#728070', align: 'center', lineSpacing: 6,
        }).setOrigin(0.5)
      );
      return;
    }

    const check = gameState.canPlayerForgeWeapon(this.currentForgeWords);
    if (check.weaponId) {
      const weapon = COMPOUND_WEAPONS[check.weaponId];
      if (!weapon) return;

      this.forgePreviewCard.add(this.scene.add.text(18, 14, `【${weapon.name}】`, {
        fontFamily: 'serif', fontSize: '20px', color: '#f7e7c4', fontStyle: 'bold',
      }));
      this.forgePreviewCard.add(this.scene.add.text(18, 40, `伤害 ${weapon.stats.damage} · 攻速 ${weapon.stats.attackSpeed}x`, {
        fontSize: '12px', color: '#d0b466',
      }));
      this.forgePreviewCard.add(this.scene.add.text(18, 62, weapon.summary, {
        fontSize: '11px', color: '#b2c2af', wordWrap: { width: 204 }, lineSpacing: 3,
      }));

      const isEquipped = gameState.meta.equippedWeapon === check.weaponId;
      const forgeBtn = this.scene.add.text(120, 114, isEquipped ? '✓ 已装备出征' : '锻造并装备', {
        fontSize: '13px',
        color: isEquipped ? '#6e806d' : '#1e180d',
        backgroundColor: isEquipped ? '#38463a' : '#d2a74c',
        padding: { x: 18, y: 6 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: !isEquipped });

      if (!isEquipped) {
        forgeBtn.on('pointerdown', () => {
          const forged = gameState.forgeWeapon(this.currentForgeWords);
          if (forged) {
            this.callbacks.showNotice(`⚔️ 锻造成功！【${weapon.name}】已作为当前出征武器！`);
            this.currentForgeWords = [];
            this.refresh();
            this.callbacks.onForged(forged);
          }
        });
      }

      this.forgePreviewCard.add(forgeBtn);
    } else {
      const errorMsg = check.error || '当前汉字组合尚未参透武器真意';
      this.forgePreviewCard.add(this.scene.add.text(120, 70, `${errorMsg}\n（可继续调整或添加放入的字）`, {
        fontSize: '12px', color: '#c27b7b', align: 'center', lineSpacing: 6, wordWrap: { width: 210 },
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
      card.add(this.scene.add.rectangle(0, 0, 150, 78, isEquipped ? 0x364839 : 0x1f2621, 0.95)
        .setOrigin(0)
        .setStrokeStyle(1.5, isEquipped ? 0xd0b466 : 0x48584a)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
          gameState.equipWeapon(wId);
          this.callbacks.showNotice(`已切换出征武器：【${weapon.name}】`);
          this.refreshWeaponShelf();
          this.updateForgePreview();
          this.callbacks.onWeaponEquipped(wId);
        }));

      card.add(this.scene.add.text(12, 10, weapon.name, {
        fontFamily: 'serif', fontSize: '16px', color: isEquipped ? '#fff' : '#e2d8c3', fontStyle: 'bold',
      }));

      card.add(this.scene.add.text(12, 34, `伤害 ${weapon.stats.damage} · 攻速 ${weapon.stats.attackSpeed}x`, {
        fontSize: '11px', color: '#97a695',
      }));

      card.add(this.scene.add.text(12, 54, isEquipped ? '✓ 当前出征' : '点击装备', {
        fontSize: '11px', color: isEquipped ? '#f0dfb3' : '#6b7a69',
      }));

      this.forgeWeaponShelf.add(card);
    });
  }
}
