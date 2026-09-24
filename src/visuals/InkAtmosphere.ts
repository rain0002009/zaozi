import Phaser from 'phaser';

export interface FloatingParticle {
  sprite: Phaser.GameObjects.Image;
  type: 'ink' | 'gold';
  x: number;
  y: number;
  vy: number;
  swaySpeed: number;
  swayAmplitude: number;
  swayPhase: number;
  rotSpeed: number;
  baseAlpha: number;
  pulsePhase: number;
  pulseSpeed: number;
}

export class InkAtmosphereManager {
  private scene: Phaser.Scene;
  private particles: FloatingParticle[] = [];
  private container: Phaser.GameObjects.Container;
  private isDestroyed = false;

  constructor(scene: Phaser.Scene, particleCount: number = 38, depth: number = 10) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setDepth(depth);
    this.initParticles(particleCount);
  }

  private initParticles(count: number): void {
    const width = 1024;
    const height = 768;

    for (let i = 0; i < count; i++) {
      const isGold = i % 3 === 0; // 1/3 gold flakes, 2/3 soft ink specks
      const textureKey = isGold ? 'tx_gold_particle' : 'tx_ink_particle';

      const x = Math.random() * width;
      const y = Math.random() * height;
      const sprite = this.scene.add.image(x, y, textureKey);

      const baseScale = isGold ? 0.5 + Math.random() * 0.55 : 0.4 + Math.random() * 0.8;
      sprite.setScale(baseScale);

      const baseAlpha = isGold ? 0.35 + Math.random() * 0.55 : 0.2 + Math.random() * 0.4;
      sprite.setAlpha(baseAlpha);

      this.container.add(sprite);

      this.particles.push({
        sprite,
        type: isGold ? 'gold' : 'ink',
        x,
        y,
        vy: isGold ? 12 + Math.random() * 18 : 10 + Math.random() * 14,
        swaySpeed: 0.8 + Math.random() * 1.4,
        swayAmplitude: 0.6 + Math.random() * 1.2,
        swayPhase: Math.random() * Math.PI * 2,
        rotSpeed: isGold ? (Math.random() - 0.5) * 1.5 : 0,
        baseAlpha,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 1.5 + Math.random() * 2.0,
      });
    }
  }

  public update(time: number, delta: number): void {
    if (this.isDestroyed) return;
    const dt = delta / 1000;
    const width = 1024;
    const height = 768;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Vertical drift
      p.y += p.vy * dt;

      // Horizontal subtle sine sway
      p.swayPhase += p.swaySpeed * dt;
      p.x += Math.sin(p.swayPhase) * p.swayAmplitude;

      // Rotation & Alpha glimmer for gold flakes
      if (p.type === 'gold') {
        p.sprite.rotation += p.rotSpeed * dt;
        p.pulsePhase += p.pulseSpeed * dt;
        const glimmer = Math.sin(p.pulsePhase) * 0.2;
        p.sprite.setAlpha(Math.max(0.1, Math.min(1, p.baseAlpha + glimmer)));
      }

      // Recycle if fallen below screen bottom
      if (p.y > height + 20) {
        p.y = -15;
        p.x = Math.random() * width;
      }
      if (p.x < -20) p.x = width + 10;
      if (p.x > width + 20) p.x = -10;

      p.sprite.setPosition(p.x, p.y);
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.container.destroy(true);
    this.particles = [];
  }
}

/**
 * Visual effects helpers for Ancient Calligraphy theme.
 */
export class InkVFX {
  /**
   * Spawns a subtle radiating ink droplet splatter when clicking a button or placing a stroke.
   */
  static spawnInkSpatter(
    scene: Phaser.Scene,
    x: number,
    y: number,
    options?: { count?: number; color?: 'ink' | 'gold' | 'mixed'; depth?: number }
  ): void {
    const count = options?.count ?? 8;
    const colorMode = options?.color ?? 'mixed';
    const depth = options?.depth ?? 300;

    for (let i = 0; i < count; i++) {
      const isGold = colorMode === 'gold' || (colorMode === 'mixed' && i % 3 === 0);
      const textureKey = isGold ? 'tx_gold_particle' : 'tx_ink_particle';

      const drop = scene.add.image(x, y, textureKey).setDepth(depth);
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = 40 + Math.random() * 85;
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed + 8; // slight gravity bias
      const targetScale = isGold ? 0.2 : 0.15;

      drop.setScale(0.6 + Math.random() * 0.5);
      drop.setAlpha(0.85);

      scene.tweens.add({
        targets: drop,
        x: targetX,
        y: targetY,
        scale: targetScale,
        alpha: 0,
        duration: 320 + Math.random() * 120,
        ease: 'Cubic.easeOut',
        onComplete: () => drop.destroy(),
      });
    }
  }

  /**
   * Requirement 9: 0.3s ease with subtle overshoot bounce (Back.easeOut)
   */
  static applyOvershootEntrance(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject | Phaser.GameObjects.GameObject[],
    options?: { delay?: number; duration?: number; fromScale?: number }
  ): Phaser.Tweens.Tween {
    const duration = options?.duration ?? 300;
    const delay = options?.delay ?? 0;
    const fromScale = options?.fromScale ?? 0.94;

    const targets = Array.isArray(target) ? target : [target];
    targets.forEach((t: any) => {
      if (typeof t.setScale === 'function') t.setScale(fromScale);
      if (typeof t.setAlpha === 'function') t.setAlpha(0);
    });

    return scene.tweens.add({
      targets,
      scale: 1,
      alpha: 1,
      duration,
      delay,
      ease: 'Back.easeOut',
    });
  }

  /**
   * Requirement 8: Creates an inner/outer drop shadow beneath floating parchment panels.
   */
  static createDropShadow(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    radius: number = 6,
    alpha: number = 0.45,
    offset: { x: number; y: number } = { x: 6, y: 8 }
  ): Phaser.GameObjects.Rectangle {
    // In Phaser, a dark rounded rectangle with offset simulates a soft elevation drop shadow
    const shadow = scene.add.rectangle(x + offset.x, y + offset.y, w, h, 0x000000, alpha)
      .setOrigin(0);
    return shadow;
  }
}
