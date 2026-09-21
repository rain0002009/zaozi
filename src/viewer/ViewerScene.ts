import Phaser from 'phaser';

export type BrotatoAction = 'idle' | 'walk' | 'attack1' | 'attack2' | 'attack3' | 'dodge' | 'hurt';

export class ViewerScene extends Phaser.Scene {
  private characterSprite!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private groundGraphics!: Phaser.GameObjects.Graphics;

  // Base transforms
  private baseScale = 0.55;
  private groundY = 0;
  private characterBaseY = 0;
  private facing: 'left' | 'right' = 'right';

  // State
  private isPlaying = true;
  private currentAction: BrotatoAction = 'idle';
  private actionElapsed = 0;
  private animTime = 0;
  private zoomLevel = 2.0;

  // Tunable Dynamics (Brotato procedural parameters)
  public params = {
    speed: 1.0,
    waddleTilt: 9, // degrees
    bounceHeight: 12, // pixels
    squashAmount: 0.08, // scale delta on step
    breathAmount: 0.04, // scale delta on idle breath
    breathSpeed: 3.5,
    waddleSpeed: 10.0,
  };

  // Display toggles
  private showGrid = true;
  private showGround = true;
  private showShadow = true;

  constructor() {
    super('ViewerScene');
  }

  preload(): void {
    this.load.image('ren_brotato', '/assets/characters/ren/ren_brotato.png');
  }

  create(): void {
    const { width, height } = this.scale;
    const centerX = width / 2;
    this.groundY = Math.round(height * 0.68);
    // Feet anchor at groundY
    this.characterBaseY = this.groundY;

    // Grid & Ground
    this.gridGraphics = this.add.graphics();
    this.groundGraphics = this.add.graphics();
    this.drawGrid();
    this.drawGround(this.groundY);

    // Dynamic Shadow (expands/contracts with squash & bounce)
    this.shadow = this.add.ellipse(centerX, this.groundY + 2, 70, 20, 0x05070d, 0.45);

    // Character Sprite (origin at feet: 0.5, 0.95)
    this.characterSprite = this.add.sprite(centerX, this.characterBaseY, 'ren_brotato')
      .setOrigin(0.5, 0.95)
      .setScale(this.baseScale);

    this.setZoom(this.zoomLevel);

    // Expose control API
    (window as any).__viewer = this;
  }

  update(_time: number, delta: number): void {
    if (!this.isPlaying) return;

    const dt = (delta / 1000) * this.params.speed;
    this.animTime += dt;
    this.actionElapsed += dt * 1000;

    this.applyProceduralMotion(dt);
  }

  private applyProceduralMotion(_dt: number): void {
    const facingSign = this.facing === 'left' ? -1 : 1;
    let targetAngle = 0;
    let targetScaleX = this.baseScale;
    let targetScaleY = this.baseScale;
    let targetY = this.characterBaseY;
    let shadowScale = 1.0;

    switch (this.currentAction) {
      case 'idle': {
        // Natural breathing: volume-conserving squash & stretch
        const breath = Math.sin(this.animTime * this.params.breathSpeed);
        targetScaleY = this.baseScale * (1.0 + breath * this.params.breathAmount);
        targetScaleX = this.baseScale * (1.0 - breath * (this.params.breathAmount * 0.75));
        targetAngle = Math.sin(this.animTime * (this.params.breathSpeed * 0.5)) * 1.2;
        shadowScale = 1.0 + breath * 0.05;
        break;
      }

      case 'walk': {
        // Iconic Brotato Waddle Bounce
        const waddlePhase = this.animTime * this.params.waddleSpeed;
        const sinWaddle = Math.sin(waddlePhase);
        const cosWaddle = Math.cos(waddlePhase * 2);

        // 1. Tilt from side to side
        targetAngle = sinWaddle * this.params.waddleTilt;

        // 2. Vertical bounce (hops on each stride)
        const hop = Math.abs(sinWaddle);
        targetY = this.characterBaseY - hop * this.params.bounceHeight;

        // 3. Impact squash on landing, stretch in air
        targetScaleY = this.baseScale * (1.0 + (hop - 0.5) * this.params.squashAmount * 2);
        targetScaleX = this.baseScale * (1.0 - (hop - 0.5) * this.params.squashAmount * 1.5);

        // 4. Dynamic shadow shrinks when in air, darkens/widens on landing
        shadowScale = 1.0 - hop * 0.25;
        this.shadow.setAlpha(0.45 - hop * 0.15);
        break;
      }

      case 'attack1': {
        // Thrust lunge: squash horizontally, lean forward, snap back
        const progress = Math.min(1.0, this.actionElapsed / 240);
        if (progress < 0.35) {
          // Windup / forward burst
          const p = progress / 0.35;
          targetAngle = 14 * p;
          targetScaleX = this.baseScale * (1.0 + p * 0.25);
          targetScaleY = this.baseScale * (1.0 - p * 0.15);
          targetY = this.characterBaseY - p * 4;
        } else {
          // Spring back with elastic settle
          const p = (progress - 0.35) / 0.65;
          const decay = Math.exp(-p * 4) * Math.cos(p * Math.PI * 3);
          targetAngle = 14 * decay;
          targetScaleX = this.baseScale * (1.0 + decay * 0.2);
          targetScaleY = this.baseScale * (1.0 - decay * 0.15);
        }
        if (this.actionElapsed >= 320) this.setAction('idle');
        break;
      }

      case 'attack2': {
        // Horizontal slash: draw back, snap forward
        const progress = Math.min(1.0, this.actionElapsed / 280);
        if (progress < 0.3) {
          const p = progress / 0.3;
          targetAngle = -10 * p;
          targetScaleX = this.baseScale * (1.0 - p * 0.1);
        } else {
          const p = (progress - 0.3) / 0.7;
          const decay = Math.exp(-p * 3.5) * Math.cos(p * Math.PI * 2.5);
          targetAngle = 18 * decay;
          targetScaleX = this.baseScale * (1.0 + decay * 0.15);
        }
        if (this.actionElapsed >= 340) this.setAction('idle');
        break;
      }

      case 'attack3': {
        // Heavy uppercut / leap: crouch down then leap high!
        const progress = Math.min(1.0, this.actionElapsed / 360);
        if (progress < 0.25) {
          // Crouch squash
          const p = progress / 0.25;
          targetScaleY = this.baseScale * (1.0 - p * 0.3);
          targetScaleX = this.baseScale * (1.0 + p * 0.3);
        } else if (progress < 0.6) {
          // Leap stretch
          const p = (progress - 0.25) / 0.35;
          targetY = this.characterBaseY - Math.sin(p * Math.PI) * 28;
          targetScaleY = this.baseScale * (1.0 + Math.sin(p * Math.PI) * 0.35);
          targetScaleX = this.baseScale * (1.0 - Math.sin(p * Math.PI) * 0.2);
          targetAngle = 8;
        } else {
          // Land & bounce
          const p = (progress - 0.6) / 0.4;
          const decay = Math.exp(-p * 4) * Math.cos(p * Math.PI * 3);
          targetScaleY = this.baseScale * (1.0 - decay * 0.2);
          targetScaleX = this.baseScale * (1.0 + decay * 0.2);
        }
        if (this.actionElapsed >= 420) this.setAction('idle');
        break;
      }

      case 'dodge': {
        // Low slide squash
        const progress = Math.min(1.0, this.actionElapsed / 260);
        const p = Math.sin(progress * Math.PI);
        targetScaleY = this.baseScale * (1.0 - p * 0.4);
        targetScaleX = this.baseScale * (1.0 + p * 0.35);
        targetAngle = 22 * p;
        if (this.actionElapsed >= 280) this.setAction('idle');
        break;
      }

      case 'hurt': {
        // Shake and wobble
        const progress = Math.min(1.0, this.actionElapsed / 220);
        const shake = Math.sin(progress * Math.PI * 6) * (1.0 - progress);
        targetAngle = shake * 15;
        targetScaleX = this.baseScale * (1.0 + shake * 0.2);
        targetScaleY = this.baseScale * (1.0 - shake * 0.2);
        if (this.actionElapsed >= 240) this.setAction('idle');
        break;
      }
    }

    // Apply values
    this.characterSprite.setScale(facingSign * targetScaleX, targetScaleY);
    this.characterSprite.setAngle(targetAngle * facingSign);
    this.characterSprite.setY(targetY);

    this.shadow.setScale(shadowScale, shadowScale);

    this.syncStatusUI(targetAngle * facingSign, targetScaleX, targetScaleY, this.characterBaseY - targetY);
  }

  private syncStatusUI(angle: number, scaleX: number, scaleY: number, bounceY: number): void {
    const stAction = document.getElementById('st-action');
    const stAngle = document.getElementById('st-angle');
    const stScale = document.getElementById('st-scale');
    const stBounce = document.getElementById('st-bounce');

    const ACTION_NAMES: Record<BrotatoAction, string> = {
      idle: '中立待机 (Idle 呼吸)',
      walk: '摇摆步态 (Waddle 蹦跳)',
      attack1: '一段突刺 (Thrust)',
      attack2: '二段横斩 (Slash)',
      attack3: '三段升龙 (Leap)',
      dodge: '战术滑步 (Dodge)',
      hurt: '受击震颤 (Hurt)',
    };

    if (stAction) stAction.innerText = ACTION_NAMES[this.currentAction] || this.currentAction;
    if (stAngle) stAngle.innerText = `${angle.toFixed(1)}°`;
    if (stScale) stScale.innerText = `${(scaleX / this.baseScale).toFixed(2)}x, ${(scaleY / this.baseScale).toFixed(2)}x`;
    if (stBounce) stBounce.innerText = `${bounceY.toFixed(1)} px`;
  }

  // --- Public Control APIs ---

  setPlay(play: boolean): void {
    this.isPlaying = play;
  }

  setAction(action: BrotatoAction): void {
    this.currentAction = action;
    this.actionElapsed = 0;
  }

  setFacing(facing: 'left' | 'right'): void {
    this.facing = facing;
  }

  setZoom(zoom: number): void {
    this.zoomLevel = zoom;
    this.cameras.main.setZoom(zoom);
  }

  setShowGrid(show: boolean): void {
    this.showGrid = show;
    this.gridGraphics.setVisible(show);
  }

  setShowGround(show: boolean): void {
    this.showGround = show;
    this.groundGraphics.setVisible(show);
  }

  setShowShadow(show: boolean): void {
    this.showShadow = show;
    this.shadow.setVisible(show);
  }

  private drawGrid(): void {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x1f293d, 0.4);
    const { width, height } = this.scale;
    const step = 32;

    for (let x = 0; x < width; x += step) {
      this.gridGraphics.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y < height; y += step) {
      this.gridGraphics.lineBetween(0, y, width, y);
    }
  }

  private drawGround(groundY: number): void {
    this.groundGraphics.clear();
    this.groundGraphics.lineStyle(2, 0x334155, 0.8);
    const { width } = this.scale;
    this.groundGraphics.lineBetween(0, groundY, width, groundY);
    for (let x = 0; x < width; x += 16) {
      this.groundGraphics.lineBetween(x, groundY, x - 8, groundY + 8);
    }
  }
}
