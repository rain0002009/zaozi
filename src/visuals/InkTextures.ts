import Phaser from 'phaser';

export class InkTextureGenerator {
  /**
   * Generates all procedural textures for the Chinese calligraphy aesthetic.
   * Safe to call multiple times (checks if texture exists first).
   */
  static generateAll(scene: Phaser.Scene): void {
    const tm = scene.textures;

    if (!tm.exists('tx_ink_bg')) {
      this.generateInkBackground(scene);
    }
    if (!tm.exists('tx_paper_board')) {
      this.generatePaperBoard(scene);
    }
    if (!tm.exists('tx_bamboo_token')) {
      this.generateBambooToken(scene, false);
    }
    if (!tm.exists('tx_bamboo_token_active')) {
      this.generateBambooToken(scene, true);
    }
    if (!tm.exists('tx_gold_relief_gate')) {
      this.generateGoldReliefGate(scene);
    }
    if (!tm.exists('tx_ink_particle')) {
      this.generateInkParticle(scene);
    }
    if (!tm.exists('tx_gold_particle')) {
      this.generateGoldParticle(scene);
    }
    if (!tm.exists('tx_inventory_bar')) {
      this.generateInventoryBar(scene);
    }
    if (!tm.exists('tx_brush_btn_gold')) {
      this.generateBrushButton(scene, 'tx_brush_btn_gold', 130, 44, 'gold');
    }
    if (!tm.exists('tx_brush_btn_dark')) {
      this.generateBrushButton(scene, 'tx_brush_btn_dark', 130, 44, 'dark');
    }
    if (!tm.exists('tx_brush_btn_red')) {
      this.generateBrushButton(scene, 'tx_brush_btn_red', 86, 34, 'red');
    }
    if (!tm.exists('tx_brush_btn_small_gold')) {
      this.generateBrushButton(scene, 'tx_brush_btn_small_gold', 92, 34, 'gold');
    }
    if (!tm.exists('tx_brush_btn_small_dark')) {
      this.generateBrushButton(scene, 'tx_brush_btn_small_dark', 92, 34, 'dark');
    }
  }

  /**
   * 全局：深墨绿×暗金×宣纸白配色，禁止任何纯色背景，
   * 渐变 + 宣纸纤维 + 水墨晕染纹理
   */
  private static generateInkBackground(scene: Phaser.Scene): void {
    const w = 1024;
    const h = 768;
    const canvas = scene.textures.createCanvas('tx_ink_bg', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 1. Base Dark Ink-Green Gradient (Vertical & Radial blend)
    const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
    baseGrad.addColorStop(0, '#0c130e');
    baseGrad.addColorStop(0.3, '#141f17');
    baseGrad.addColorStop(0.7, '#18251b');
    baseGrad.addColorStop(1, '#0a100c');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // 2. Diffused Ink Blooms (Water-and-ink washes)
    const radial1 = ctx.createRadialGradient(280, 260, 40, 280, 260, 420);
    radial1.addColorStop(0, 'rgba(32, 52, 38, 0.45)');
    radial1.addColorStop(0.6, 'rgba(22, 36, 26, 0.2)');
    radial1.addColorStop(1, 'rgba(12, 19, 14, 0)');
    ctx.fillStyle = radial1;
    ctx.fillRect(0, 0, w, h);

    const radial2 = ctx.createRadialGradient(760, 480, 50, 760, 480, 480);
    radial2.addColorStop(0, 'rgba(38, 58, 44, 0.4)');
    radial2.addColorStop(0.7, 'rgba(20, 32, 23, 0.15)');
    radial2.addColorStop(1, 'rgba(10, 16, 12, 0)');
    ctx.fillStyle = radial2;
    ctx.fillRect(0, 0, w, h);

    // 3. Distant Ink Mountain Silhouettes with misty feathering
    ctx.save();
    ctx.fillStyle = 'rgba(18, 28, 20, 0.7)';
    ctx.beginPath();
    ctx.moveTo(0, 520);
    ctx.bezierCurveTo(120, 420, 240, 260, 360, 310);
    ctx.bezierCurveTo(460, 350, 580, 220, 720, 290);
    ctx.bezierCurveTo(840, 340, 940, 270, 1024, 380);
    ctx.lineTo(1024, 768);
    ctx.lineTo(0, 768);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 4. Subtle Rice Paper Fibers & Noise
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 14;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 1.1));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // 5. Heavy Vignette at borders
    const vignette = ctx.createRadialGradient(w / 2, h / 2, 280, w / 2, h / 2, 620);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(5, 10, 6, 0.35)');
    vignette.addColorStop(1, 'rgba(3, 6, 4, 0.85)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    canvas.refresh();
  }

  /**
   * 宣纸画板：真实宣纸纹理 + 红色米字格 + 边缘微微泛黄做旧
   */
  private static generatePaperBoard(scene: Phaser.Scene): void {
    const size = 288;
    const canvas = scene.textures.createCanvas('tx_paper_board', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 1. Aged Rice Paper Base Color with warmth
    const baseGrad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size * 0.7);
    baseGrad.addColorStop(0, '#f9f4e8');
    baseGrad.addColorStop(0.7, '#f4ece0');
    baseGrad.addColorStop(1, '#e5d7be'); // aged yellowish edge
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // 2. Organic paper fibers and tea-colored aging stains
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 18;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.95));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.85));
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Vintage Border Vignette (做旧泛黄暗角)
    ctx.save();
    const borderVignette = ctx.createRadialGradient(size / 2, size / 2, size * 0.42, size / 2, size / 2, size * 0.72);
    borderVignette.addColorStop(0, 'rgba(180, 140, 90, 0)');
    borderVignette.addColorStop(0.85, 'rgba(175, 135, 85, 0.25)');
    borderVignette.addColorStop(1, 'rgba(130, 95, 55, 0.6)');
    ctx.fillStyle = borderVignette;
    ctx.fillRect(0, 0, size, size);

    // Inner shadow frame
    ctx.strokeStyle = 'rgba(110, 80, 48, 0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, size - 4, size - 4);
    ctx.restore();

    // 4. Cinnabar Red Mi-Grid (朱砂红米字格)
    ctx.save();
    ctx.strokeStyle = 'rgba(186, 52, 42, 0.38)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);

    // Diagonals
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(size - 8, size - 8);
    ctx.moveTo(size - 8, 8);
    ctx.lineTo(8, size - 8);
    ctx.stroke();

    // Horizontal & Vertical center axes
    ctx.beginPath();
    ctx.moveTo(size / 2, 8);
    ctx.lineTo(size / 2, size - 8);
    ctx.moveTo(8, size / 2);
    ctx.lineTo(size - 8, size / 2);
    ctx.stroke();

    // Nine-palace inner square
    ctx.setLineDash([3, 3]);
    const third = size / 3;
    ctx.strokeRect(third, third, third, third);
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 笔画按钮：像"竹简/令牌"造型，选中时描金边
   */
  private static generateBambooToken(scene: Phaser.Scene, isActive: boolean): void {
    const key = isActive ? 'tx_bamboo_token_active' : 'tx_bamboo_token';
    const w = 84;
    const h = 50;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 1. Bamboo wood background with vertical fibers
    const woodGrad = ctx.createLinearGradient(0, 0, 0, h);
    woodGrad.addColorStop(0, '#243226');
    woodGrad.addColorStop(0.5, '#1e2b20');
    woodGrad.addColorStop(1, '#152017');
    ctx.fillStyle = woodGrad;

    // Rounded bamboo token shape
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 6);
    ctx.fill();

    // Vertical bamboo wood grain stripes
    ctx.save();
    for (let x = 6; x < w - 6; x += 4) {
      const alpha = 0.08 + Math.random() * 0.12;
      ctx.strokeStyle = `rgba(200, 220, 190, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 4);
      ctx.lineTo(x, h - 4);
      ctx.stroke();
    }
    ctx.restore();

    // 2. Beveled bamboo edges (Top highlight, Bottom burnished shadow)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(6, 4);
    ctx.lineTo(w - 6, 4);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.beginPath();
    ctx.moveTo(6, h - 4);
    ctx.lineTo(w - 6, h - 4);
    ctx.stroke();

    // 3. If active: 描金边 + 浮雕金光光晕
    if (isActive) {
      ctx.save();
      // Outer subtle glow
      ctx.shadowColor = '#e2c56a';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#dfc068';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, 6);
      ctx.stroke();

      // Inner fine golden line
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff3c4';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(5, 5, w - 10, h - 10, 4);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = 'rgba(70, 90, 75, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, 6);
      ctx.stroke();
    }

    canvas.refresh();
  }

  /**
   * 关卡面板：金色浮雕质感边框
   */
  private static generateGoldReliefGate(scene: Phaser.Scene): void {
    const w = 158;
    const h = 480;
    const canvas = scene.textures.createCanvas('tx_gold_relief_gate', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Base deep dark ink panel
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1c241e');
    bgGrad.addColorStop(0.5, '#222d25');
    bgGrad.addColorStop(1, '#172019');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Inner subtle vertical grain
    ctx.strokeStyle = 'rgba(180, 200, 180, 0.05)';
    for (let x = 6; x < w; x += 5) {
      ctx.beginPath();
      ctx.moveTo(x, 6);
      ctx.lineTo(x, h - 6);
      ctx.stroke();
    }

    // Outer Relief Golden Frame (双重浮雕金边)
    ctx.save();
    // 1. Dark antique gold base frame
    ctx.strokeStyle = '#856a2f';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, w - 6, h - 6);

    // 2. Beveled highlight edge
    ctx.strokeStyle = '#dfc476';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(3, h - 3);
    ctx.lineTo(3, 3);
    ctx.lineTo(w - 3, 3);
    ctx.stroke();

    ctx.strokeStyle = '#4e3b15';
    ctx.beginPath();
    ctx.moveTo(w - 3, 3);
    ctx.lineTo(w - 3, h - 3);
    ctx.lineTo(3, h - 3);
    ctx.stroke();

    // 3. Inner decorative gold thread
    ctx.strokeStyle = 'rgba(215, 180, 100, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // 4. Corner Ruyi / Cloud Ornaments (四个角花浮雕)
    const drawCorner = (cx: number, cy: number, sx: number, sy: number) => {
      ctx.fillStyle = '#d4b76a';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e7ce89';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + sx * 8, cy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx, cy + sy * 8);
      ctx.stroke();
    };

    drawCorner(12, 12, 1, 1);
    drawCorner(w - 12, 12, -1, 1);
    drawCorner(12, h - 12, 1, -1);
    drawCorner(w - 12, h - 12, -1, -1);
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 全屏缓慢飘落的墨点粒子
   */
  private static generateInkParticle(scene: Phaser.Scene): void {
    const size = 16;
    const canvas = scene.textures.createCanvas('tx_ink_particle', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const rad = ctx.createRadialGradient(size / 2, size / 2, 1, size / 2, size / 2, size / 2);
    rad.addColorStop(0, 'rgba(18, 26, 20, 0.95)');
    rad.addColorStop(0.5, 'rgba(24, 34, 26, 0.7)');
    rad.addColorStop(0.9, 'rgba(30, 44, 32, 0.25)');
    rad.addColorStop(1, 'rgba(30, 44, 32, 0)');
    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();

    canvas.refresh();
  }

  /**
   * 全屏缓慢飘落的金色碎屑粒子
   */
  private static generateGoldParticle(scene: Phaser.Scene): void {
    const size = 12;
    const canvas = scene.textures.createCanvas('tx_gold_particle', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // Diamond gold leaf shape with radiant center
    const rad = ctx.createRadialGradient(size / 2, size / 2, 0.5, size / 2, size / 2, size / 2);
    rad.addColorStop(0, 'rgba(255, 248, 210, 1)');
    rad.addColorStop(0.4, 'rgba(235, 196, 90, 0.9)');
    rad.addColorStop(0.8, 'rgba(190, 145, 45, 0.4)');
    rad.addColorStop(1, 'rgba(160, 115, 30, 0)');
    ctx.fillStyle = rad;

    ctx.beginPath();
    ctx.moveTo(size / 2, 1);
    ctx.lineTo(size - 1, size / 2);
    ctx.lineTo(size / 2, size - 1);
    ctx.lineTo(1, size / 2);
    ctx.closePath();
    ctx.fill();

    canvas.refresh();
  }

  /**
   * 仓中笔画栏：深墨绿暗纹背景 + 暗金双线浮雕边框
   */
  private static generateInventoryBar(scene: Phaser.Scene): void {
    const w = 928;
    const h = 64;
    const canvas = scene.textures.createCanvas('tx_inventory_bar', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 1. Dark ink-green horizontal gradient
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#152018');
    bgGrad.addColorStop(0.3, '#1c281f');
    bgGrad.addColorStop(0.7, '#223026');
    bgGrad.addColorStop(1, '#162119');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 8);
    ctx.fill();

    // 2. Paper fiber texture
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const n = (Math.random() - 0.5) * 12;
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 1.1));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // 3. Antique gold embossed borders
    ctx.save();
    // Outer border
    ctx.strokeStyle = '#735e2e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 8);
    ctx.stroke();

    // Top highlight
    ctx.strokeStyle = 'rgba(223, 196, 104, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.lineTo(w - 10, 4);
    ctx.stroke();

    // Inner fine border
    ctx.strokeStyle = 'rgba(180, 200, 180, 0.12)';
    ctx.beginPath();
    ctx.roundRect(6, 6, w - 12, h - 12, 6);
    ctx.stroke();
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 毛笔笔触造型按钮：墨迹边缘、飞白微纹、选中与高光
   */
  private static generateBrushButton(
    scene: Phaser.Scene,
    key: string,
    w: number,
    h: number,
    style: 'gold' | 'dark' | 'red'
  ): void {
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 1. Draw calligraphic brush stroke contour
    ctx.save();
    ctx.beginPath();
    // Start at left center with slight tapered bristle sweep
    ctx.moveTo(8, h / 2);
    ctx.bezierCurveTo(4, 5, 14, 2, 26, 2);
    ctx.lineTo(w - 26, 2);
    ctx.bezierCurveTo(w - 14, 2, w - 3, 5, w - 6, h / 2);
    ctx.bezierCurveTo(w - 3, h - 5, w - 14, h - 2, w - 26, h - 2);
    ctx.lineTo(26, h - 2);
    ctx.bezierCurveTo(14, h - 2, 4, h - 5, 8, h / 2);
    ctx.closePath();

    // 2. Gradient fill depending on style
    if (style === 'gold') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#c79f45');
      grad.addColorStop(0.3, '#dfc476');
      grad.addColorStop(0.7, '#c9a147');
      grad.addColorStop(1, '#a68132');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(223, 196, 118, 0.5)';
      ctx.shadowBlur = 6;
    } else if (style === 'red') {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#5a2020');
      grad.addColorStop(0.5, '#7c2d2d');
      grad.addColorStop(1, '#4a1717');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(180, 50, 50, 0.4)';
      ctx.shadowBlur = 5;
    } else {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#202c22');
      grad.addColorStop(0.5, '#2b3b2f');
      grad.addColorStop(1, '#19231b');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 5;
    }
    ctx.fill();

    // 3. Bristle fly-out texture (飞白水墨微丝)
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const yOff = 7 + i * ((h - 14) / 3);
      ctx.strokeStyle =
        style === 'gold'
          ? 'rgba(255, 245, 200, 0.35)'
          : style === 'red'
          ? 'rgba(255, 200, 200, 0.18)'
          : 'rgba(200, 225, 200, 0.15)';
      ctx.beginPath();
      ctx.moveTo(14 + Math.random() * 8, yOff);
      ctx.lineTo(w - 16 - Math.random() * 8, yOff);
      ctx.stroke();
    }

    // 4. Subtle calligraphic edge highlight
    ctx.strokeStyle =
      style === 'gold' ? '#fff0ba' : style === 'red' ? '#e57373' : '#687f6e';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    canvas.refresh();
  }
}

