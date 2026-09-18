import Phaser from 'phaser';

type Monster = {
  body: Phaser.GameObjects.Container;
  name: string;
  speed: number;
  damageCooldown: number;
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerHp = 100;
  private playerSpeed = 220;
  private monsters: Monster[] = [];
  private strokes: string[] = [];
  private area = 1;
  private areaClearing = false;
  private attackCooldown = 0;
  private dodgeCooldown = 0;
  private invulnerableUntil = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private hpText!: Phaser.GameObjects.Text;
  private strokeText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('Game');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#17251f');
    this.createArena();
    this.createPlayer();
    this.createHud();
    this.setupInput();
    this.spawnWave();
  }

  private createArena(): void {
    this.add.rectangle(512, 384, 1000, 700, 0x213a2d);
    this.add.rectangle(512, 384, 930, 630, 0x294535).setStrokeStyle(2, 0x6d8b72);
  }

  private createPlayer(): void {
    this.player = this.add.container(512, 390);
    this.player.add(this.add.circle(0, 0, 29, 0x9ad7bc, 0.18));
    this.player.add(this.add.circle(0, 0, 22, 0xd8eee1));
    this.player.add(this.add.text(0, 0, '人', {
      color: '#173126', fontFamily: 'serif', fontSize: '31px',
    }).setOrigin(0.5));
  }

  private createHud(): void {
    this.add.rectangle(0, 0, 1024, 72, 0x102019, 0.94).setOrigin(0);
    this.hpText = this.add.text(24, 16, '', { color: '#ffb4a8', fontSize: '20px' });
    this.strokeText = this.add.text(190, 16, '', { color: '#f5db9b', fontSize: '20px' });
    this.areaText = this.add.text(850, 16, '', { color: '#b9dfc8', fontSize: '20px' });
    this.statusText = this.add.text(512, 735, 'WASD 移动 · 鼠标左键攻击 · 空格翻滚', {
      color: '#c5d8ca', fontSize: '16px',
    }).setOrigin(0.5);
    this.refreshHud();
  }

  private setupInput(): void {
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.input.on('pointerdown', () => this.attack());
  }

  private spawnWave(): void {
    this.areaClearing = false;
    const count = 3 + this.area * 2;
    const names = ['狼', '火狼', '山鬼', '水妖', '石人'];
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const distance = 210 + (index % 3) * 45;
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 90, 934);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 110, 675);
      const name = names[(index + this.area - 1) % names.length];
      const body = this.add.container(x, y);
      body.add(this.add.circle(0, 0, 19, name.includes('火') ? 0xc9574c : 0x7b5c68));
      body.add(this.add.text(0, 0, name[0], {
        color: '#fff4e8', fontFamily: 'serif', fontSize: '20px',
      }).setOrigin(0.5));
      this.monsters.push({ body, name, speed: 38 + this.area * 5, damageCooldown: 0 });
    }
    this.statusText.setText(`第 ${this.area} 区域 · 击败 ${count} 个汉字怪物`);
  }

  private attack(): void {
    if (this.attackCooldown > 0 || this.areaClearing) return;
    this.attackCooldown = 250;
    const targetIndex = this.monsters.findIndex((monster) =>
      Phaser.Math.Distance.Between(this.player.x, this.player.y, monster.body.x, monster.body.y) < 105,
    );
    const slash = this.add.arc(this.player.x, this.player.y, 68, -55, 55, false, 0xf5db9b, 0.5);
    slash.setStrokeStyle(4, 0xf5db9b, 0.9);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.25, duration: 180, onComplete: () => slash.destroy() });
    if (targetIndex === -1) return;

    const target = this.monsters[targetIndex];
    this.strokes.push(...this.strokesFor(target.name));
    target.body.destroy();
    this.monsters.splice(targetIndex, 1);
    this.refreshHud();
    if (this.monsters.length === 0) this.finishArea();
  }

  private strokesFor(monsterName: string): string[] {
    const pool = monsterName.split('').flatMap((character) => {
      const map: Record<string, string[]> = {
        狼: ['丿', '丶', '㇇'], 火: ['丶', '丿', '㇏'], 山: ['丨', '㇇', '一'],
        鬼: ['丿', '乛', '丶'], 水: ['丨', '㇇', '㇏'], 妖: ['丿', '一', '女'],
        石: ['一', '丿', '口'], 人: ['丿', '㇏'],
      };
      return map[character] ?? ['一'];
    });
    return [pool[Phaser.Math.Between(0, pool.length - 1)]];
  }

  private finishArea(): void {
    this.areaClearing = true;
    this.area += 1;
    this.statusText.setText('区域已清除 · 即将进入下一片汉字荒原');
    this.time.delayedCall(1000, () => this.spawnWave());
  }

  private refreshHud(): void {
    this.hpText?.setText(`生命 ${this.playerHp}/100`);
    this.strokeText?.setText(`笔画 ${this.strokes.length}`);
    this.areaText?.setText(`区域 ${this.area}`);
  }

  update(_time: number, delta: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    const direction = new Phaser.Math.Vector2(x, y).normalize();
    const dodging = this.spaceKey.isDown && this.dodgeCooldown <= 0;
    if (dodging) {
      this.dodgeCooldown = 650;
      this.invulnerableUntil = this.time.now + 320;
      this.player.setAlpha(0.45);
      this.time.delayedCall(320, () => this.player.setAlpha(1));
    }
    const speed = dodging ? this.playerSpeed * 2.7 : this.playerSpeed;
    this.player.x = Phaser.Math.Clamp(this.player.x + direction.x * speed * delta / 1000, 55, 969);
    this.player.y = Phaser.Math.Clamp(this.player.y + direction.y * speed * delta / 1000, 95, 690);

    for (const monster of this.monsters) {
      monster.damageCooldown = Math.max(0, monster.damageCooldown - delta);
      const directionToPlayer = new Phaser.Math.Vector2(this.player.x - monster.body.x, this.player.y - monster.body.y).normalize();
      monster.body.x += directionToPlayer.x * monster.speed * delta / 1000;
      monster.body.y += directionToPlayer.y * monster.speed * delta / 1000;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, monster.body.x, monster.body.y);
      if (distance < 35 && monster.damageCooldown <= 0 && this.time.now > this.invulnerableUntil) {
        monster.damageCooldown = 800;
        this.playerHp = Math.max(0, this.playerHp - (monster.name.includes('火') ? 12 : 8));
        this.refreshHud();
        if (this.playerHp === 0) this.scene.restart();
      }
    }
  }
}
