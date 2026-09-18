import Phaser from 'phaser';
import { gameState, ROUTES, RouteDefinition, Stroke, STROKES } from '../state/GameState';

type EnemyKind = 'chaser' | 'ranged' | 'charger' | 'boss';
type EnemyState = 'hunt' | 'windup' | 'charge';

type Enemy = {
  body: Phaser.GameObjects.Container;
  healthFill: Phaser.GameObjects.Rectangle;
  name: string;
  kind: EnemyKind;
  state: EnemyState;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number;
  stateTimer: number;
  velocity: Phaser.Math.Vector2;
};

type Projectile = {
  body: Phaser.GameObjects.Container;
  velocity: Phaser.Math.Vector2;
  hostile: boolean;
  damage: number;
  ttl: number;
};

type Pickup = {
  body: Phaser.GameObjects.Container;
  stroke: Stroke;
  ttl: number;
};

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Container;
  private enemies: Enemy[] = [];
  private projectiles: Projectile[] = [];
  private pickups: Pickup[] = [];
  private route!: RouteDefinition;
  private hp = 100;
  private attackCooldown = 0;
  private fireCooldown = 0;
  private dodgeCooldown = 0;
  private dodgeRemaining = 0;
  private dodgeVelocity = new Phaser.Math.Vector2();
  private invulnerableUntil = 0;
  private aimAngle = 0;
  private encounterCleared = false;
  private ended = false;
  private paused = false;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private pauseKey!: Phaser.Input.Keyboard.Key;
  private hpFill!: Phaser.GameObjects.Rectangle;
  private hpText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private lootText!: Phaser.GameObjects.Text;
  private abilityText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private pauseOverlay?: Phaser.GameObjects.Container;

  constructor() { super('Game'); }

  create(): void {
    const run = gameState.expedition ?? gameState.startExpedition();
    this.route = ROUTES[run.route ?? (run.area >= 3 ? 'boss' : 'wilds')];
    this.hp = run.hp;
    this.enemies = [];
    this.projectiles = [];
    this.pickups = [];
    this.attackCooldown = 0;
    this.fireCooldown = 0;
    this.dodgeCooldown = 0;
    this.dodgeRemaining = 0;
    this.invulnerableUntil = 0;
    this.aimAngle = 0;
    this.encounterCleared = false;
    this.ended = false;
    this.paused = false;

    this.drawArena();
    this.createPlayer();
    this.createHud();
    this.setupInput();
    this.spawnEncounter();
  }

  private drawArena(): void {
    this.cameras.main.setBackgroundColor('#111813');
    this.add.rectangle(512, 390, 1024, 620, 0x27332b);
    this.add.rectangle(512, 390, 914, 540, 0xd7d0ba).setStrokeStyle(5, this.route.accent, 0.8);
    const ink = this.add.graphics().setDepth(0);
    ink.fillStyle(0x313a31, 0.11);
    for (let index = 0; index < 34; index += 1) {
      ink.fillCircle(Phaser.Math.Between(70, 954), Phaser.Math.Between(124, 650), Phaser.Math.Between(4, 28));
    }
    ink.lineStyle(1, 0x655f52, 0.18);
    for (let x = 92; x < 950; x += 72) ink.lineBetween(x, 120, x - 80, 654);
    this.add.text(512, 391, this.route.id === 'boss' ? '墨' : this.route.id === 'ember' ? '火' : this.route.id === 'rift' ? '鬼' : '野', {
      fontFamily: 'serif', fontSize: '300px', color: '#232c25',
    }).setOrigin(0.5).setAlpha(0.055);
  }

  private createPlayer(): void {
    this.player = this.add.container(512, 555).setDepth(5);
    this.player.add(this.add.circle(0, 0, 29, 0x557d65, 0.25));
    this.player.add(this.add.circle(0, 0, 21, 0xe4eadc).setStrokeStyle(2, 0x4c6653));
    this.player.add(this.add.text(0, 0, '人', { fontFamily: 'serif', fontSize: '29px', color: '#223229' }).setOrigin(0.5));
    const aim = this.add.container(0, 0);
    aim.name = 'aim';
    aim.add(this.add.rectangle(31, 0, 19, 3, 0x80552f).setOrigin(0, 0.5));
    this.player.add(aim);
  }

  private createHud(): void {
    this.add.rectangle(0, 0, 1024, 92, 0x111813, 0.98).setOrigin(0).setDepth(20);
    this.add.text(24, 12, '人 · 初行者', { fontFamily: 'serif', fontSize: '18px', color: '#e5e7d9' }).setDepth(21);
    this.add.rectangle(24, 43, 176, 14, 0x42282a).setOrigin(0).setDepth(21);
    this.hpFill = this.add.rectangle(24, 43, 176, 14, 0xc9685e).setOrigin(0).setDepth(22);
    this.hpText = this.add.text(24, 63, '', { fontSize: '13px', color: '#dca49d' }).setDepth(21);
    this.enemyText = this.add.text(250, 23, '', { fontSize: '16px', color: '#d7c89e' }).setDepth(21);
    this.lootText = this.add.text(250, 53, '', { fontSize: '14px', color: '#aab8aa' }).setDepth(21);
    this.abilityText = this.add.text(790, 20, '', { fontSize: '14px', color: '#e0d8c2', align: 'right' }).setOrigin(1, 0).setDepth(21);
    this.add.text(978, 24, this.route.title, { fontFamily: 'serif', fontSize: '22px', color: '#e4cf9f' }).setOrigin(1, 0).setDepth(21);
    this.add.text(978, 56, `第 ${gameState.expedition?.area ?? 1} / 3 区域`, { fontSize: '13px', color: '#8fa092' }).setOrigin(1, 0).setDepth(21);
    this.statusText = this.add.text(512, 731, '左键挥刀 · 空格闪避 · P 暂停', { fontSize: '15px', color: '#bdc8ba' }).setOrigin(0.5).setDepth(20);
    this.refreshHud();
  }

  private setupInput(): void {
    this.input.mouse?.disableContextMenu();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.fireKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.pauseKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.aimAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.worldX, pointer.worldY);
    });
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonDown()) this.castFire();
      else this.meleeAttack();
    });
  }

  private spawnEncounter(): void {
    const area = gameState.expedition?.area ?? 1;
    if (this.route.id === 'boss') {
      this.spawnEnemy('boss', '墨', 512, 276);
      this.statusText.setText('「墨」正在吞噬残存的笔画');
      return;
    }

    const count = 3 + area + this.route.enemyBonus;
    for (let index = 0; index < count; index += 1) {
      const position = this.spawnPosition(index, count);
      let kind: EnemyKind;
      if (area === 1) kind = index % 3 === 2 ? 'charger' : 'chaser';
      else if (this.route.id === 'ember') kind = index % 2 === 0 ? 'ranged' : 'chaser';
      else kind = index % 3 === 0 ? 'ranged' : 'charger';
      const name = kind === 'ranged' ? '水妖' : kind === 'charger' ? '山鬼' : index % 3 === 0 ? '火狼' : '狼';
      this.spawnEnemy(kind, name, position.x, position.y);
    }
    this.statusText.setText(`${this.route.description} · 清除全部字怪`);
  }

  private spawnPosition(index: number, count: number): Phaser.Math.Vector2 {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(512 + Math.cos(angle) * (245 + (index % 2) * 52), 105, 919),
      Phaser.Math.Clamp(380 + Math.sin(angle) * (190 + (index % 2) * 32), 145, 625),
    );
  }

  private spawnEnemy(kind: EnemyKind, name: string, x: number, y: number): void {
    const area = gameState.expedition?.area ?? 1;
    const isBoss = kind === 'boss';
    const maxHp = isBoss ? 30 : kind === 'charger' ? 5 + area : kind === 'ranged' ? 3 + area : 3 + area;
    const radius = isBoss ? 46 : 23;
    const color = isBoss ? 0x29252c : kind === 'ranged' ? 0x547d86 : kind === 'charger' ? 0x765f55 : name.includes('火') ? 0xb95b49 : 0x5f6b62;
    const body = this.add.container(x, y).setDepth(4);
    body.add(this.add.circle(0, 0, radius + 7, color, 0.2));
    body.add(this.add.circle(0, 0, radius, color, 0.96).setStrokeStyle(2, 0xefe4cf, 0.65));
    body.add(this.add.text(0, 0, name, { fontFamily: 'serif', fontSize: isBoss ? '38px' : name.length > 1 ? '16px' : '23px', color: '#f4eddf' }).setOrigin(0.5));
    body.add(this.add.rectangle(0, -radius - 13, radius * 2, 5, 0x2c2222).setOrigin(0.5));
    const healthFill = this.add.rectangle(-radius, -radius - 13, radius * 2, 5, isBoss ? 0xc45158 : 0xd58a69).setOrigin(0, 0.5);
    body.add(healthFill);
    this.enemies.push({
      body, healthFill, name, kind, state: 'hunt', hp: maxHp, maxHp,
      speed: isBoss ? 46 : kind === 'ranged' ? 48 : kind === 'charger' ? 42 : 60,
      damage: isBoss ? 18 : name.includes('火') ? 12 : 9,
      attackCooldown: Phaser.Math.Between(500, 1100), stateTimer: Phaser.Math.Between(900, 1800),
      velocity: new Phaser.Math.Vector2(),
    });
  }

  private meleeAttack(): void {
    if (this.attackCooldown > 0 || this.encounterCleared || this.ended || this.paused) return;
    this.attackCooldown = 330;
    const degrees = Phaser.Math.RadToDeg(this.aimAngle);
    const slash = this.add.arc(this.player.x, this.player.y, 88, degrees - 56, degrees + 56, false, 0xd8b66e, 0.34)
      .setStrokeStyle(5, 0xd8b66e, 0.92).setDepth(8);
    this.tweens.add({ targets: slash, alpha: 0, scale: 1.18, duration: 180, onComplete: () => slash.destroy() });
    const hits = this.enemies.filter((enemy) => {
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.body.x, enemy.body.y);
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.body.x, enemy.body.y);
      return distance < (enemy.kind === 'boss' ? 132 : 112) && Math.abs(Phaser.Math.Angle.Wrap(angle - this.aimAngle)) < Phaser.Math.DegToRad(60);
    });
    hits.forEach((enemy) => this.damageEnemy(enemy, 1, this.aimAngle));
  }

  private castFire(): void {
    if (!gameState.hasWord('火')) {
      this.statusText.setText('未装备「火」字 · 返回基地用笔画合成');
      return;
    }
    if (this.fireCooldown > 0 || this.encounterCleared || this.ended || this.paused) return;
    this.fireCooldown = 1250;
    const velocity = new Phaser.Math.Vector2(Math.cos(this.aimAngle), Math.sin(this.aimAngle)).scale(390);
    const body = this.add.container(this.player.x + velocity.x * 0.08, this.player.y + velocity.y * 0.08).setDepth(7);
    body.add(this.add.circle(0, 0, 15, 0xd85d3f, 0.24));
    body.add(this.add.text(0, 0, '火', { fontFamily: 'serif', fontSize: '24px', color: '#d44930' }).setOrigin(0.5));
    this.projectiles.push({ body, velocity, hostile: false, damage: 3, ttl: 1600 });
  }

  private damageEnemy(enemy: Enemy, damage: number, knockbackAngle: number): void {
    if (!enemy.body.active) return;
    enemy.hp -= damage;
    enemy.healthFill.scaleX = Math.max(0, enemy.hp / enemy.maxHp);
    enemy.body.x += Math.cos(knockbackAngle) * (enemy.kind === 'boss' ? 5 : 16);
    enemy.body.y += Math.sin(knockbackAngle) * (enemy.kind === 'boss' ? 5 : 16);
    enemy.body.setAlpha(0.42);
    this.time.delayedCall(80, () => enemy.body.active && enemy.body.setAlpha(1));
    if (enemy.hp <= 0) this.killEnemy(enemy);
  }

  private killEnemy(enemy: Enemy): void {
    const index = this.enemies.indexOf(enemy);
    if (index < 0) return;
    const dropCount = enemy.kind === 'boss' ? 9 : Math.max(1, Math.round(this.route.lootMultiplier * (Math.random() < 0.35 ? 2 : 1)));
    for (let drop = 0; drop < dropCount; drop += 1) {
      if (enemy.kind === 'boss' || Math.random() < 0.78) {
        this.spawnPickup(enemy.body.x + Phaser.Math.Between(-18, 18), enemy.body.y + Phaser.Math.Between(-18, 18), this.strokeFor(enemy.name));
      }
    }
    this.tweens.killTweensOf(enemy.body);
    enemy.body.destroy();
    this.enemies.splice(index, 1);
    if (this.enemies.length === 0) this.clearEncounter();
  }

  private strokeFor(name: string): Stroke {
    const map: Record<string, Stroke[]> = {
      狼: ['丿', '丶', '㇇'], 火: ['丶', '丿', '㇏'], 山: ['丨', '㇇', '一'],
      鬼: ['丿', '㇇', '丶'], 水: ['丨', '㇇', '㇏'], 妖: ['丿', '一', '㇏'], 墨: [...STROKES],
    };
    const pool = name.split('').flatMap((character) => map[character] ?? ['一']);
    return pool[Phaser.Math.Between(0, pool.length - 1)];
  }

  private spawnPickup(x: number, y: number, stroke: Stroke): void {
    const body = this.add.container(x, y).setDepth(3);
    body.add(this.add.circle(0, 0, 12, 0xd9b866, 0.88).setStrokeStyle(2, 0xf1e3bb));
    body.add(this.add.text(0, 0, stroke, { fontFamily: 'serif', fontSize: '18px', color: '#3f3020' }).setOrigin(0.5));
    this.tweens.add({ targets: body, y: y - 10, yoyo: true, repeat: -1, duration: 520 + Phaser.Math.Between(0, 180) });
    this.pickups.push({ body, stroke, ttl: 12000 });
  }

  private clearEncounter(): void {
    this.encounterCleared = true;
    this.projectiles.filter((projectile) => projectile.hostile).forEach((projectile) => projectile.body.destroy());
    this.projectiles = this.projectiles.filter((projectile) => !projectile.hostile);
    if (this.route.id === 'ember' && gameState.expedition) {
      this.hp = Math.min(gameState.expedition.maxHp, this.hp + 18);
      this.statusText.setText('妖火熄灭 · 恢复 18 点生命');
    } else {
      this.statusText.setText('区域肃清 · 战利品正在归拢');
    }
    this.time.delayedCall(900, () => this.showAreaResult());
  }

  private showAreaResult(): void {
    if (this.ended) return;
    this.collectAllPickups();
    this.ended = true;
    if (gameState.expedition) gameState.expedition.hp = this.hp;
    const isVictory = this.route.id === 'boss';
    const overlay = this.add.container(512, 390).setDepth(30);
    overlay.add(this.add.rectangle(0, 0, 1024, 780, 0x101612, 0.76));
    overlay.add(this.add.rectangle(0, 0, 520, 310, 0xe6dfcc, 0.99).setStrokeStyle(3, this.route.accent));
    overlay.add(this.add.text(0, -105, isVictory ? '墨 散 天 明' : '区 域 肃 清', { fontFamily: 'serif', fontSize: '38px', color: '#302e27' }).setOrigin(0.5));
    const total = gameState.expedition ? gameState.inventoryTotal(gameState.expedition.carried) : 0;
    overlay.add(this.add.text(0, -48, `本次出征已携带 ${total} 枚笔画`, { fontSize: '17px', color: '#625a4c' }).setOrigin(0.5));
    if (isVictory) {
      overlay.add(this.makeActionButton(0, 64, '凯旋归营', () => {
        const settlement = gameState.settle('victory');
        this.scene.start('Base', { settlement });
      }));
      return;
    }
    overlay.add(this.makeActionButton(-118, 72, '继续深入', () => {
      gameState.advanceArea();
      this.scene.start('Route');
    }));
    overlay.add(this.makeActionButton(118, 72, '携物撤退', () => {
      const settlement = gameState.settle('retreat');
      this.scene.start('Base', { settlement });
    }, true));
  }

  private makeActionButton(x: number, y: number, label: string, action: () => void, quiet = false): Phaser.GameObjects.Text {
    const button = this.add.text(x, y, label, {
      fontSize: '17px', color: quiet ? '#554c40' : '#f5ead2', backgroundColor: quiet ? '#cbc2ad' : '#664a34', padding: { x: 20, y: 11 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    button.on('pointerdown', action);
    return button;
  }

  private updateEnemies(delta: number): void {
    for (const enemy of [...this.enemies]) {
      enemy.attackCooldown -= delta;
      enemy.stateTimer -= delta;
      const toPlayer = new Phaser.Math.Vector2(this.player.x - enemy.body.x, this.player.y - enemy.body.y);
      const distance = toPlayer.length();
      const direction = toPlayer.normalize();

      if (enemy.kind === 'ranged') {
        if (distance < 190) enemy.body.setPosition(enemy.body.x - direction.x * enemy.speed * delta / 1000, enemy.body.y - direction.y * enemy.speed * delta / 1000);
        else if (distance > 285) enemy.body.setPosition(enemy.body.x + direction.x * enemy.speed * delta / 1000, enemy.body.y + direction.y * enemy.speed * delta / 1000);
        if (enemy.attackCooldown <= 0) {
          this.enemyProjectile(enemy, direction, '水');
          enemy.attackCooldown = 1500;
        }
      } else if (enemy.kind === 'charger') {
        this.updateCharger(enemy, direction, delta);
      } else if (enemy.kind === 'boss') {
        enemy.body.x += direction.x * enemy.speed * delta / 1000;
        enemy.body.y += direction.y * enemy.speed * delta / 1000;
        if (enemy.attackCooldown <= 0) {
          this.bossVolley(enemy);
          enemy.attackCooldown = enemy.hp < enemy.maxHp / 2 ? 1250 : 1750;
        }
      } else if (distance > 38) {
        enemy.body.x += direction.x * enemy.speed * delta / 1000;
        enemy.body.y += direction.y * enemy.speed * delta / 1000;
      }

      if (distance < (enemy.kind === 'boss' ? 68 : 42) && enemy.attackCooldown <= 0) {
        this.takeDamage(enemy.damage);
        enemy.attackCooldown = 850;
      }
      enemy.body.x = Phaser.Math.Clamp(enemy.body.x, 72, 952);
      enemy.body.y = Phaser.Math.Clamp(enemy.body.y, 118, 660);
    }
  }

  private updateCharger(enemy: Enemy, direction: Phaser.Math.Vector2, delta: number): void {
    if (enemy.state === 'hunt') {
      enemy.body.x += direction.x * enemy.speed * delta / 1000;
      enemy.body.y += direction.y * enemy.speed * delta / 1000;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'windup';
        enemy.stateTimer = 620;
        enemy.velocity.copy(direction);
        enemy.body.setScale(1.28).setAlpha(0.62);
      }
    } else if (enemy.state === 'windup' && enemy.stateTimer <= 0) {
      enemy.state = 'charge';
      enemy.stateTimer = 420;
      enemy.velocity.scale(390);
      enemy.body.setAlpha(1).setScale(1);
    } else if (enemy.state === 'charge') {
      enemy.body.x += enemy.velocity.x * delta / 1000;
      enemy.body.y += enemy.velocity.y * delta / 1000;
      if (enemy.stateTimer <= 0) {
        enemy.state = 'hunt';
        enemy.stateTimer = 1900;
      }
    }
  }

  private enemyProjectile(enemy: Enemy, direction: Phaser.Math.Vector2, glyph: string): void {
    const body = this.add.container(enemy.body.x, enemy.body.y).setDepth(6);
    body.add(this.add.circle(0, 0, 12, 0x4c7d89, 0.35));
    body.add(this.add.text(0, 0, glyph, { fontFamily: 'serif', fontSize: '19px', color: '#397083' }).setOrigin(0.5));
    this.projectiles.push({ body, velocity: direction.clone().scale(210), hostile: true, damage: enemy.damage, ttl: 3200 });
  }

  private bossVolley(enemy: Enemy): void {
    const count = enemy.hp < enemy.maxHp / 2 ? 10 : 7;
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + this.time.now * 0.0004;
      this.enemyProjectile(enemy, new Phaser.Math.Vector2(Math.cos(angle), Math.sin(angle)), '墨');
    }
    this.cameras.main.shake(110, 0.0025);
  }

  private updateProjectiles(delta: number): void {
    for (let index = this.projectiles.length - 1; index >= 0; index -= 1) {
      const projectile = this.projectiles[index];
      projectile.ttl -= delta;
      projectile.body.x += projectile.velocity.x * delta / 1000;
      projectile.body.y += projectile.velocity.y * delta / 1000;
      let consumed = projectile.ttl <= 0 || projectile.body.x < 55 || projectile.body.x > 969 || projectile.body.y < 100 || projectile.body.y > 680;
      if (projectile.hostile) {
        if (Phaser.Math.Distance.Between(projectile.body.x, projectile.body.y, this.player.x, this.player.y) < 27) {
          this.takeDamage(projectile.damage);
          consumed = true;
        }
      } else {
        const enemy = this.enemies.find((candidate) => Phaser.Math.Distance.Between(projectile.body.x, projectile.body.y, candidate.body.x, candidate.body.y) < (candidate.kind === 'boss' ? 52 : 28));
        if (enemy) {
          this.fireBurst(projectile.body.x, projectile.body.y, enemy);
          consumed = true;
        }
      }
      if (consumed) {
        projectile.body.destroy();
        this.projectiles.splice(index, 1);
      }
    }
  }

  private fireBurst(x: number, y: number, primary: Enemy): void {
    const burst = this.add.circle(x, y, 42, 0xe2633f, 0.34).setDepth(8);
    this.tweens.add({ targets: burst, alpha: 0, scale: 1.45, duration: 240, onComplete: () => burst.destroy() });
    for (const enemy of [...this.enemies]) {
      if (enemy === primary || Phaser.Math.Distance.Between(x, y, enemy.body.x, enemy.body.y) < 62) this.damageEnemy(enemy, 3, this.aimAngle);
    }
  }

  private takeDamage(rawDamage: number): void {
    if (this.time.now < this.invulnerableUntil || this.ended) return;
    const damage = Math.ceil(rawDamage * (gameState.hasWord('盾') ? 0.65 : 1));
    this.hp = Math.max(0, this.hp - damage);
    this.invulnerableUntil = this.time.now + 520;
    this.player.setAlpha(0.35);
    this.cameras.main.shake(120, 0.005);
    this.time.delayedCall(160, () => this.player.active && this.player.setAlpha(1));
    if (this.hp <= 0) this.gameOver();
  }

  private gameOver(): void {
    this.ended = true;
    const settlement = gameState.settle('defeat');
    const overlay = this.add.container(512, 390).setDepth(30);
    overlay.add(this.add.rectangle(0, 0, 1024, 780, 0x0b100c, 0.84));
    overlay.add(this.add.text(0, -82, '人 · 归于墨色', { fontFamily: 'serif', fontSize: '44px', color: '#dfb3a5' }).setOrigin(0.5));
    overlay.add(this.add.text(0, -20, `败退保留四分之一战利品 · 遗失 ${settlement.lost} 枚`, { fontSize: '17px', color: '#cad3c7' }).setOrigin(0.5));
    overlay.add(this.makeActionButton(0, 68, '返回基地', () => this.scene.start('Base', { settlement })));
  }

  private updatePickups(delta: number): void {
    for (let index = this.pickups.length - 1; index >= 0; index -= 1) {
      const pickup = this.pickups[index];
      pickup.ttl -= delta;
      const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, pickup.body.x, pickup.body.y);
      if (distance < 220 || this.encounterCleared) {
        const pull = new Phaser.Math.Vector2(this.player.x - pickup.body.x, this.player.y - pickup.body.y).normalize();
        const speed = this.encounterCleared ? 520 : distance < 70 ? 320 : 150;
        pickup.body.x += pull.x * speed * delta / 1000;
        pickup.body.y += pull.y * speed * delta / 1000;
      }
      if (distance < 27) this.collectPickup(index);
      else if (pickup.ttl <= 0) {
        pickup.body.destroy();
        this.pickups.splice(index, 1);
      }
    }
  }

  private collectPickup(index: number): void {
    const pickup = this.pickups[index];
    gameState.addCarried(pickup.stroke);
    pickup.body.destroy();
    this.pickups.splice(index, 1);
  }

  private collectAllPickups(): void {
    while (this.pickups.length) this.collectPickup(this.pickups.length - 1);
  }

  private updatePlayer(delta: number): void {
    let x = 0;
    let y = 0;
    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    const direction = new Phaser.Math.Vector2(x, y).normalize();
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) && this.dodgeCooldown <= 0) {
      const dodgeDirection = direction.lengthSq() > 0 ? direction : new Phaser.Math.Vector2(Math.cos(this.aimAngle), Math.sin(this.aimAngle));
      this.dodgeVelocity.copy(dodgeDirection).scale(560);
      this.dodgeRemaining = 260;
      this.dodgeCooldown = 780;
      this.invulnerableUntil = this.time.now + 310;
      this.player.setAlpha(0.45);
    }
    if (this.dodgeRemaining > 0) {
      this.player.x += this.dodgeVelocity.x * delta / 1000;
      this.player.y += this.dodgeVelocity.y * delta / 1000;
      this.dodgeRemaining -= delta;
      if (this.dodgeRemaining <= 0) this.player.setAlpha(1);
    } else {
      this.player.x += direction.x * 220 * delta / 1000;
      this.player.y += direction.y * 220 * delta / 1000;
    }
    this.player.x = Phaser.Math.Clamp(this.player.x, 72, 952);
    this.player.y = Phaser.Math.Clamp(this.player.y, 118, 660);
    const aim = this.player.getByName('aim') as Phaser.GameObjects.Container;
    aim.rotation = this.aimAngle;
  }

  private togglePause(): void {
    if (this.ended) return;
    this.paused = !this.paused;
    this.time.paused = this.paused;
    if (this.paused) {
      this.tweens.pauseAll();
      this.pauseOverlay = this.add.container(512, 390).setDepth(40);
      this.pauseOverlay.add(this.add.rectangle(0, 0, 1024, 780, 0x0b100c, 0.76));
      this.pauseOverlay.add(this.add.text(0, -24, '暂 停', { fontFamily: 'serif', fontSize: '42px', color: '#eee7d7' }).setOrigin(0.5));
      this.pauseOverlay.add(this.add.text(0, 34, '按 P 继续', { fontSize: '16px', color: '#aebbae' }).setOrigin(0.5));
    } else {
      this.pauseOverlay?.destroy();
      this.pauseOverlay = undefined;
      this.tweens.resumeAll();
    }
  }

  private refreshHud(): void {
    const run = gameState.expedition;
    const carried = run ? gameState.inventoryTotal(run.carried) : 0;
    this.hpFill?.setDisplaySize(176 * (this.hp / (run?.maxHp ?? 100)), 14);
    this.hpText?.setText(`生命 ${this.hp}/${run?.maxHp ?? 100}${gameState.hasWord('盾') ? ' · 盾减伤 35%' : ''}`);
    this.enemyText?.setText(`字怪 ${this.enemies.length}`);
    this.lootText?.setText(`携带笔画 ${carried}`);
    const fire = gameState.hasWord('火') ? this.fireCooldown > 0 ? `火 ${Math.ceil(this.fireCooldown / 100) / 10}s` : '火 就绪' : '火 未合成';
    const dodge = this.dodgeCooldown > 0 ? `闪避 ${Math.ceil(this.dodgeCooldown / 100) / 10}s` : '闪避 就绪';
    this.abilityText?.setText(`${gameState.meta.equippedWords.join(' · ')}\n${fire}  |  ${dodge}`);
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.pauseKey)) this.togglePause();
    if (this.ended || this.paused) return;
    if (Phaser.Input.Keyboard.JustDown(this.fireKey)) this.castFire();
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);
    this.fireCooldown = Math.max(0, this.fireCooldown - delta);
    this.dodgeCooldown = Math.max(0, this.dodgeCooldown - delta);
    this.updatePlayer(delta);
    if (!this.encounterCleared) this.updateEnemies(delta);
    this.updateProjectiles(delta);
    this.updatePickups(delta);
    this.refreshHud();
  }
}
