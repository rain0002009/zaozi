import Phaser from 'phaser';

type Monster = {
  body: Phaser.GameObjects.Container;
  name: string;
  speed: number;
  maxHp: number;
  hp: number;
  damageCooldown: number;
};

type StrokePickup = {
  body: Phaser.GameObjects.Container;
  stroke: string;
  ttl: number;
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private playerHp = 100;
  private playerSpeed = 220;
  private monsters: Monster[] = [];
  private pickups: StrokePickup[] = [];
  private strokes: string[] = [];
  private area = 1;
  private areaClearing = false;
  private ended = false;
  private paused = false;
  private attackCooldown = 0;
  private dodgeCooldown = 0;
  private invulnerableUntil = 0;
  private aimAngle = 0;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private hpText!: Phaser.GameObjects.Text;
  private strokeText!: Phaser.GameObjects.Text;
  private areaText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private dodgeText!: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Container;

  constructor() { super('Game'); }

  create(): void {
    this.playerHp = 100;
    this.area = 1;
    this.areaClearing = false;
    this.ended = false;
    this.paused = false;
    this.attackCooldown = 0;
    this.dodgeCooldown = 0;
    this.invulnerableUntil = 0;
    this.aimAngle = 0;
    this.monsters = [];
    this.pickups = [];
    this.strokes = [];
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
    const grid = this.add.graphics().setAlpha(0.2);
    for (let x = 70; x <= 954; x += 64) grid.lineBetween(x, 96, x, 690);
    for (let y = 110; y <= 674; y += 64) grid.lineBetween(70, y, 954, y);
  }

  private createPlayer(): void {
    this.player = this.add.container(512, 390);
    this.player.add(this.add.circle(0, 0, 31, 0x9ad7bc, 0.18));
    this.player.add(this.add.circle(0, 0, 22, 0xd8eee1));
    this.player.add(this.add.text(0, 0, '人', { color: '#173126', fontFamily: 'serif', fontSize: '31px' }).setOrigin(0.5));
    this.player.setDepth(3);
  }

  private createHud(): void {
    this.add.rectangle(0, 0, 1024, 82, 0x102019, 0.96).setOrigin(0).setDepth(10);
    this.add.text(24, 12, '人 · 初行者', { color: '#d8eee1', fontSize: '14px' }).setDepth(11);
    this.add.rectangle(24, 35, 145, 13, 0x351f24).setOrigin(0).setDepth(11);
    this.hpFill = this.add.rectangle(24, 35, 145, 13, 0xd96c63).setOrigin(0).setDepth(12);
    this.hpText = this.add.text(24, 54, '', { color: '#ffb4a8', fontSize: '16px' }).setDepth(11);
    this.strokeText = this.add.text(205, 28, '', { color: '#f5db9b', fontSize: '19px' }).setDepth(11);
    this.areaText = this.add.text(850, 28, '', { color: '#b9dfc8', fontSize: '19px' }).setOrigin(1, 0).setDepth(11);
    this.dodgeText = this.add.text(512, 28, '', { color: '#a9d9ed', fontSize: '16px' }).setOrigin(0.5, 0).setDepth(11);
    this.statusText = this.add.text(512, 735, 'WASD 移动 · 鼠标左键攻击 · 空格翻滚 · P 暂停', { color: '#c5d8ca', fontSize: '16px' }).setOrigin(0.5).setDepth(10);
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
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
    });
    this.input.on('pointerdown', () => this.attack());
  }

  private spawnWave(): void {
    this.areaClearing = false;
    const count = Math.min(3 + this.area * 2, 14);
    const names = ['狼', '火狼', '山鬼', '水妖', '石人'];
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count;
      const distance = 215 + (index % 3) * 42;
      const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * distance, 90, 934);
      const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * distance, 110, 675);
      const name = names[(index + this.area - 1) % names.length];
      const maxHp = 2 + Math.floor(this.area / 3) + (name.length > 1 ? 1 : 0);
      const body = this.add.container(x, y).setDepth(2);
      body.add(this.add.circle(0, 0, 20, name.includes('火') ? 0xc9574c : 0x7b5c68));
      body.add(this.add.text(0, 0, name[0], { color: '#fff4e8', fontFamily: 'serif', fontSize: '20px' }).setOrigin(0.5));
      body.add(this.add.rectangle(0, -30, 38, 4, 0x271b20).setOrigin(0.5));
      body.add(this.add.rectangle(-19, -30, 38, 4, 0xe99577).setOrigin(0, 0.5));
      this.monsters.push({ body, name, speed: 38 + this.area * 5, maxHp, hp: maxHp, damageCooldown: 0 });
      this.tweens.add({ targets: body, scale: 1.08, yoyo: true, repeat: -1, duration: 700 + index * 30 });
    }
    this.statusText.setText(`第 ${this.area} 区域 · 击败 ${count} 个汉字怪物`);
    this.refreshHud();
  }

  private attack(): void {
    if (this.attackCooldown > 0 || this.areaClearing || this.ended || this.paused) return;
    this.attackCooldown = 260;
    const angleDegrees = Phaser.Math.RadToDeg(this.aimAngle);
    const slash = this.add.arc(this.player.x, this.player.y, 78, angleDegrees - 52, angleDegrees + 52, false, 0xf5db9b, 0.42).setStrokeStyle(4, 0xf5db9b, 0.95).setDepth(4);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.18, duration: 170, onComplete: () => slash.destroy() });
    const target = this.monsters
      .map((monster, index) => ({ monster, index, distance: Phaser.Math.Distance.Between(this.player.x, this.player.y, monster.body.x, monster.body.y), angle: Phaser.Math.Angle.Between(this.player.x, this.player.y, monster.body.x, monster.body.y) }))
      .filter(({ distance, angle }) => distance < 112 && Math.abs(Phaser.Math.Angle.Wrap(angle - this.aimAngle)) < Phaser.Math.DegToRad(58))
      .sort((left, right) => left.distance - right.distance)[0];
    if (!target) return;
    const monster = target.monster;
    monster.hp -= 1;
    monster.body.x += Math.cos(this.aimAngle) * 18;
    monster.body.y += Math.sin(this.aimAngle) * 18;
    const healthFill = monster.body.list[3] as Phaser.GameObjects.Rectangle;
    healthFill.scaleX = Math.max(0, monster.hp / monster.maxHp);
    this.flashMonster(monster.body);
    if (monster.hp > 0) return;
    const stroke = this.strokesFor(monster.name)[0];
    this.spawnDrop(monster.body.x, monster.body.y, stroke);
    monster.body.destroy();
    this.monsters.splice(target.index, 1);
    if (this.monsters.length === 0) this.finishArea();
  }

  private flashMonster(body: Phaser.GameObjects.Container): void {
    body.setAlpha(0.45);
    this.time.delayedCall(90, () => body.active && body.setAlpha(1));
  }

  private spawnDrop(x: number, y: number, stroke: string): void {
    const body = this.add.container(x, y).setDepth(1);
    body.add(this.add.circle(0, 0, 10, 0xf5db9b, 0.9));
    body.add(this.add.text(0, 0, stroke, { color: '#49351d', fontSize: '17px', fontFamily: 'serif' }).setOrigin(0.5));
    this.tweens.add({ targets: body, y: y - 12, yoyo: true, repeat: -1, duration: 620 });
    this.pickups.push({ body, stroke, ttl: 9000 });
  }

  private strokesFor(monsterName: string): string[] {
    const pool = monsterName.split('').flatMap((character) => {
      const map: Record<string, string[]> = { 狼: ['丿', '丶', '㇇'], 火: ['丶', '丿', '㇏'], 山: ['丨', '㇇', '一'], 鬼: ['丿', '乛', '丶'], 水: ['丨', '㇇', '㇏'], 妖: ['丿', '一', '女'], 石: ['一', '丿', '口'], 人: ['丿', '㇏'] };
      return map[character] ?? ['一'];
    });
    return [pool[Phaser.Math.Between(0, pool.length - 1)]];
  }

  private finishArea(): void {
    this.areaClearing = true;
    this.area += 1;
    this.statusText.setText('区域已清除 · 靠近金色笔画收集战利品');
    this.time.delayedCall(1600, () => { if (!this.ended) this.spawnWave(); });
  }

  private refreshHud(): void {
    this.hpText?.setText(`生命 ${this.playerHp}/100`);
    this.strokeText?.setText(`笔画 ${this.strokes.length}   ·   战场 ${this.monsters.length}`);
    this.areaText?.setText(`区域 ${this.area}`);
    if (this.hpFill) this.hpFill.width = 145 * (this.playerHp / 100);
    if (this.dodgeText) this.dodgeText.setText(this.dodgeCooldown > 0 ? `翻滚 ${(this.dodgeCooldown / 1000).toFixed(1)}s` : '翻滚就绪');
  }

  private collectPickups(delta: number): void {
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      pickup.ttl -= delta;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.body.x, pickup.body.y);
      if (distance < 180) {
        const pull = new Phaser.Math.Vector2(this.player.x - pickup.body.x, this.player.y - pickup.body.y).normalize();
        const speed = distance < 70 ? 270 : 120;
        pickup.body.x += pull.x * speed * delta / 1000;
        pickup.body.y += pull.y * speed * delta / 1000;
      }
      if (distance < 28) {
        this.strokes.push(pickup.stroke);
        this.statusText.setText(`获得笔画 ${pickup.stroke} · 继续深入`);
        pickup.body.destroy();
        this.pickups.splice(index, 1);
      } else if (pickup.ttl <= 0) {
        pickup.body.destroy();
        this.pickups.splice(index, 1);
      }
    }
  }

  private takeDamage(amount: number): void {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.cameras.main.shake(100, 0.004);
    this.player.setAlpha(0.45);
    this.time.delayedCall(120, () => !this.ended && this.player.setAlpha(1));
    this.refreshHud();
    if (this.playerHp === 0) this.gameOver();
  }

  private gameOver(): void {
    this.ended = true;
    const overlay = this.add.container(512, 384).setDepth(20);
    overlay.add(this.add.rectangle(0, 0, 1024, 768, 0x0b1410, 0.82));
    overlay.add(this.add.text(0, -80, '人 · 归于墨色', { color: '#f4c5b6', fontSize: '44px', fontFamily: 'serif' }).setOrigin(0.5));
    overlay.add(this.add.text(0, -20, `你深入了 ${this.area - 1} 个区域，收集 ${this.strokes.length} 枚笔画`, { color: '#d8eee1', fontSize: '18px' }).setOrigin(0.5));
    const restart = this.add.text(0, 72, '[ 重新入局 ]', { color: '#f5db9b', fontSize: '26px', fontFamily: 'monospace' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    restart.on('pointerover', () => restart.setColor('#fff1c7'));
    restart.on('pointerout', () => restart.setColor('#f5db9b'));
    restart.on('pointerdown', () => this.scene.restart());
    overlay.add(restart);
  }

  private togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pauseOverlay = this.add.container(512, 384).setDepth(19);
      this.pauseOverlay.add(this.add.rectangle(0, 0, 1024, 768, 0x0b1410, 0.72));
      this.pauseOverlay.add(this.add.text(0, -28, '暂 停', { color: '#e7f2e9', fontSize: '42px', fontFamily: 'serif' }).setOrigin(0.5));
      this.pauseOverlay.add(this.add.text(0, 34, '按 P 继续', { color: '#b9dfc8', fontSize: '18px' }).setOrigin(0.5));
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
    }
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) this.togglePause();
    if (this.ended || this.paused) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    const direction = new Phaser.Math.Vector2(x, y).normalize();
    const dodging = Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.dodgeCooldown <= 0;
    if (dodging) {
      this.dodgeCooldown = 650;
      this.invulnerableUntil = this.time.now + 320;
      this.player.setAlpha(0.45);
      this.time.delayedCall(320, () => !this.ended && this.player.setAlpha(1));
    }
    const speed = dodging ? this.playerSpeed * 2.7 : this.playerSpeed;
    this.player.x = Phaser.Math.Clamp(this.player.x + direction.x * speed * delta / 1000, 55, 969);
    this.player.y = Phaser.Math.Clamp(this.player.y + direction.y * speed * delta / 1000, 95, 690);
    for (const monster of this.monsters) {
      monster.damageCooldown = Math.max(0, monster.damageCooldown - delta);
      const directionToPlayer = new Phaser.Math.Vector2(this.player.x - monster.body.x, this.player.y - monster.body.y).normalize();
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, monster.body.x, monster.body.y);
      if (distance > 38) {
        monster.body.x += directionToPlayer.x * monster.speed * delta / 1000;
        monster.body.y += directionToPlayer.y * monster.speed * delta / 1000;
      }
      if (distance < 42 && monster.damageCooldown <= 0 && this.time.now > this.invulnerableUntil) {
        monster.damageCooldown = 800;
        this.takeDamage(monster.name.includes('火') ? 12 : 8);
      }
    }
    this.collectPickups(delta);
    this.refreshHud();
  }
}
