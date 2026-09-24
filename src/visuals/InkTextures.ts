import Phaser from 'phaser';

export class InkTextureGenerator {
  /**
   * Generates all procedural textures for the Chinese calligraphy & ancient scene aesthetic.
   * Safe to call multiple times (checks if texture exists first).
   */
  static generateAll(scene: Phaser.Scene): void {
    const tm = scene.textures;

    // 1. Scene Background & Writing Desk
    if (!tm.exists('tx_scene_desk_bg')) {
      this.generateDeskBackground(scene);
    }
    if (!tm.exists('tx_scroll_desk')) {
      this.generateScrollBoard(scene);
    }
    if (!tm.exists('tx_inventory_scroll')) {
      this.generateInventoryScroll(scene);
    }

    // 2. Facility Navigation Placards (令签/牌匾)
    if (!tm.exists('tx_token_sign_craft')) {
      this.generateTokenSign(scene, 'tx_token_sign_craft', false);
    }
    if (!tm.exists('tx_token_sign_craft_active')) {
      this.generateTokenSign(scene, 'tx_token_sign_craft_active', true);
    }
    if (!tm.exists('tx_token_sign_forge')) {
      this.generateTokenSign(scene, 'tx_token_sign_forge', false);
    }
    if (!tm.exists('tx_token_sign_forge_active')) {
      this.generateTokenSign(scene, 'tx_token_sign_forge_active', true);
    }

    // 3. Tokens, Slots & Altars
    if (!tm.exists('tx_bamboo_token')) {
      this.generateBambooToken(scene, false);
    }
    if (!tm.exists('tx_bamboo_token_active')) {
      this.generateBambooToken(scene, true);
    }
    if (!tm.exists('tx_seal_slot')) {
      this.generateSealSlot(scene, false);
    }
    if (!tm.exists('tx_seal_slot_active')) {
      this.generateSealSlot(scene, true);
    }
    if (!tm.exists('tx_furnace_panel')) {
      this.generateFurnacePanel(scene);
    }
    if (!tm.exists('tx_preview_altar')) {
      this.generatePreviewAltar(scene);
    }
    if (!tm.exists('tx_word_token')) {
      this.generateWordToken(scene, true);
    }
    if (!tm.exists('tx_word_token_dim')) {
      this.generateWordToken(scene, false);
    }
    if (!tm.exists('tx_weapon_card')) {
      this.generateWeaponCard(scene, false);
    }
    if (!tm.exists('tx_weapon_card_equipped')) {
      this.generateWeaponCard(scene, true);
    }
    if (!tm.exists('tx_gold_relief_gate')) {
      this.generateGoldReliefGate(scene);
    }

    // 4. Particles
    if (!tm.exists('tx_ink_particle')) {
      this.generateInkParticle(scene);
    }
    if (!tm.exists('tx_gold_particle')) {
      this.generateGoldParticle(scene);
    }

    // 5. Calligraphic Brush Buttons
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
      this.generateBrushButton(scene, 'tx_brush_btn_small_gold', 96, 36, 'gold');
    }
    if (!tm.exists('tx_brush_btn_small_dark')) {
      this.generateBrushButton(scene, 'tx_brush_btn_small_dark', 96, 36, 'dark');
    }
  }

  /**
   * 1. 古风文房木案与营房背景 (1024×768)
   * 沉浸式古木桌面质感 + 水墨远山 + 温暖烛光晕染 + 暗角
   */
  private static generateDeskBackground(scene: Phaser.Scene): void {
    const w = 1024;
    const h = 768;
    const canvas = scene.textures.createCanvas('tx_scene_desk_bg', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 深色古樟木与砚墨渐变基底
    const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
    baseGrad.addColorStop(0, '#0d130f');
    baseGrad.addColorStop(0.35, '#152119');
    baseGrad.addColorStop(0.7, '#18241b');
    baseGrad.addColorStop(1, '#0b100c');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, w, h);

    // 古木横向有机木纹肌理
    ctx.save();
    for (let y = 10; y < h; y += 7) {
      const alpha = 0.04 + Math.random() * 0.08;
      ctx.strokeStyle = `rgba(180, 210, 185, ${alpha})`;
      ctx.lineWidth = 1 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y + (Math.random() - 0.5) * 3);
      ctx.bezierCurveTo(
        w * 0.3, y + (Math.random() - 0.5) * 5,
        w * 0.7, y + (Math.random() - 0.5) * 5,
        w, y + (Math.random() - 0.5) * 3
      );
      ctx.stroke();
    }
    ctx.restore();

    // 案台中心与左侧宣纸的温暖烛光/书卷光晕
    const candleGlow = ctx.createRadialGradient(380, 360, 40, 380, 360, 520);
    candleGlow.addColorStop(0, 'rgba(235, 205, 130, 0.12)');
    candleGlow.addColorStop(0.4, 'rgba(180, 160, 100, 0.05)');
    candleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = candleGlow;
    ctx.fillRect(0, 0, w, h);

    // 案头远处写意远山虚影
    ctx.save();
    ctx.fillStyle = 'rgba(22, 34, 25, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, 460);
    ctx.bezierCurveTo(150, 360, 260, 240, 380, 280);
    ctx.bezierCurveTo(500, 320, 620, 200, 750, 260);
    ctx.bezierCurveTo(860, 300, 960, 240, 1024, 340);
    ctx.lineTo(1024, 768);
    ctx.lineTo(0, 768);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 真实宣纸木纤维噪点
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const n = (Math.random() - 0.5) * 11;
      data[i] = Math.max(0, Math.min(255, data[i] + n));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 1.1));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
    }
    ctx.putImageData(imgData, 0, 0);

    // 案台四周深沉暗角
    const vignette = ctx.createRadialGradient(w / 2, h / 2, 280, w / 2, h / 2, 640);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(0.7, 'rgba(6, 10, 7, 0.4)');
    vignette.addColorStop(1, 'rgba(3, 5, 3, 0.88)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    canvas.refresh();
  }

  /**
   * 2. 摊开的宣纸画卷 (296×296)
   * 左右紫檀木卷轴轴头 + 锦绫装裱包边 + 做旧宣纸 + 朱砂红米字格 + 内凹阴影
   */
  private static generateScrollBoard(scene: Phaser.Scene): void {
    const size = 296;
    const canvas = scene.textures.createCanvas('tx_scroll_desk', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 1. 锦绫装裱外框 (Silk Brocade Mounting)
    const silkGrad = ctx.createLinearGradient(0, 0, size, size);
    silkGrad.addColorStop(0, '#1c281f');
    silkGrad.addColorStop(0.5, '#243328');
    silkGrad.addColorStop(1, '#18231b');
    ctx.fillStyle = silkGrad;
    ctx.fillRect(0, 0, size, size);

    // 锦绫暗纹细金线
    ctx.strokeStyle = 'rgba(180, 150, 80, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(3, 3, size - 6, size - 6);

    // 左右两侧的紫檀木卷轴轴头 (Scroll Rod Finials)
    const rodW = 10;
    const drawScrollRod = (rx: number) => {
      const rodGrad = ctx.createLinearGradient(rx, 0, rx + rodW, 0);
      rodGrad.addColorStop(0, '#3a1f10');
      rodGrad.addColorStop(0.4, '#6b3e20');
      rodGrad.addColorStop(0.8, '#4a2914');
      rodGrad.addColorStop(1, '#241208');
      ctx.fillStyle = rodGrad;
      ctx.fillRect(rx, 2, rodW, size - 4);

      // 上下嵌金箍
      ctx.fillStyle = '#dfc068';
      ctx.fillRect(rx, 2, rodW, 5);
      ctx.fillRect(rx, size - 7, rodW, 5);
    };
    drawScrollRod(2);
    drawScrollRod(size - 12);

    // 2. 宣纸内芯区域 (Paper Core with aging)
    const px = 16;
    const py = 8;
    const pw = size - 32;
    const ph = size - 16;

    // 内凹阴影槽 (Inner shadow frame)
    ctx.save();
    ctx.fillStyle = '#121813';
    ctx.fillRect(px - 1, py - 1, pw + 2, ph + 2);

    // 宣纸暖调底色
    const paperGrad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, pw * 0.7);
    paperGrad.addColorStop(0, '#f9f4e8');
    paperGrad.addColorStop(0.7, '#f3ece0');
    paperGrad.addColorStop(1, '#e3d5be');
    ctx.fillStyle = paperGrad;
    ctx.fillRect(px, py, pw, ph);

    // 宣纸有机植物纤维与茶色陈年斑
    const imgData = ctx.getImageData(px, py, pw, ph);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise * 0.95));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise * 0.85));
    }
    ctx.putImageData(imgData, px, py);

    // 宣纸四周泛黄做旧暗角
    const paperVignette = ctx.createRadialGradient(size / 2, size / 2, pw * 0.38, size / 2, size / 2, pw * 0.68);
    paperVignette.addColorStop(0, 'rgba(160, 120, 70, 0)');
    paperVignette.addColorStop(0.85, 'rgba(165, 125, 75, 0.22)');
    paperVignette.addColorStop(1, 'rgba(120, 85, 45, 0.55)');
    ctx.fillStyle = paperVignette;
    ctx.fillRect(px, py, pw, ph);

    // 3. 朱砂红米字格 (Cinnabar Red Mi-Grid)
    ctx.strokeStyle = 'rgba(186, 52, 42, 0.36)';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 4]);

    const cx = px + pw / 2;
    const cy = py + ph / 2;

    // 对角线
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 6);
    ctx.lineTo(px + pw - 6, py + ph - 6);
    ctx.moveTo(px + pw - 6, py + 6);
    ctx.lineTo(px + 6, py + ph - 6);
    ctx.stroke();

    // 十字中线
    ctx.beginPath();
    ctx.moveTo(cx, py + 6);
    ctx.lineTo(cx, py + ph - 6);
    ctx.moveTo(px + 6, cy);
    ctx.lineTo(px + pw - 6, cy);
    ctx.stroke();

    // 九宫内格
    ctx.setLineDash([3, 3]);
    const thirdW = pw / 3;
    const thirdH = ph / 3;
    ctx.strokeRect(px + thirdW, py + thirdH, thirdW, thirdH);

    // 内凹阴影线 (Paper Edge Inset Line)
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(70, 48, 25, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px, py, pw, ph);
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 3. 顶部锦缎横幅卷轴栏 (928×64)
   * 左右木轴头 + 锦缎织物暗纹 + 暗金双线边框
   */
  private static generateInventoryScroll(scene: Phaser.Scene): void {
    const w = 928;
    const h = 64;
    const canvas = scene.textures.createCanvas('tx_inventory_scroll', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 锦缎主卷轴底面
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#152119');
    bgGrad.addColorStop(0.3, '#1d2a20');
    bgGrad.addColorStop(0.7, '#233226');
    bgGrad.addColorStop(1, '#16221a');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(8, 2, w - 16, h - 4, 6);
    ctx.fill();

    // 左右两端的木轴收口 (Finials)
    const drawKnob = (kx: number) => {
      const knobGrad = ctx.createLinearGradient(kx, 0, kx + 8, 0);
      knobGrad.addColorStop(0, '#422412');
      knobGrad.addColorStop(0.5, '#784422');
      knobGrad.addColorStop(1, '#2c160a');
      ctx.fillStyle = knobGrad;
      ctx.beginPath();
      ctx.roundRect(kx, 0, 8, h, 3);
      ctx.fill();

      // 金箍环
      ctx.fillStyle = '#dfc068';
      ctx.fillRect(kx, 4, 8, 4);
      ctx.fillRect(kx, h - 8, 8, 4);
    };
    drawKnob(0);
    drawKnob(w - 8);

    // 织物纤维质感
    const imgData = ctx.getImageData(8, 2, w - 16, h - 4);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const n = (Math.random() - 0.5) * 10;
        data[i] = Math.max(0, Math.min(255, data[i] + n));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + n * 1.1));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + n));
      }
    }
    ctx.putImageData(imgData, 8, 2);

    // 暗金双线浮雕边线
    ctx.save();
    ctx.strokeStyle = '#7c6532';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(10, 4, w - 20, h - 8, 5);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(223, 196, 104, 0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18, 6);
    ctx.lineTo(w - 18, 6);
    ctx.stroke();
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 4. 悬挂令签 / 牌匾导航按钮 (156×42)
   */
  private static generateTokenSign(scene: Phaser.Scene, key: string, isActive: boolean): void {
    const w = 156;
    const h = 42;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 令签紫檀古木渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (isActive) {
      grad.addColorStop(0, '#2b3a2f');
      grad.addColorStop(0.5, '#35473a');
      grad.addColorStop(1, '#222f25');
    } else {
      grad.addColorStop(0, '#19231b');
      grad.addColorStop(0.5, '#202c23');
      grad.addColorStop(1, '#151d17');
    }
    ctx.fillStyle = grad;

    // 上小下平的令签轮廓
    ctx.beginPath();
    ctx.roundRect(3, 3, w - 6, h - 6, [8, 8, 4, 4]);
    ctx.fill();

    // 纵向木质纤维线条
    ctx.save();
    for (let x = 8; x < w - 8; x += 5) {
      const alpha = isActive ? 0.08 + Math.random() * 0.1 : 0.04 + Math.random() * 0.06;
      ctx.strokeStyle = `rgba(200, 225, 200, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 5);
      ctx.lineTo(x, h - 5);
      ctx.stroke();
    }
    ctx.restore();

    // 边框处理：选中时明亮双重鎏金边 + 金光；未选中时深铜色沉稳边
    ctx.save();
    if (isActive) {
      ctx.shadowColor = '#e2c56a';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#dfc068';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(3, 3, w - 6, h - 6, [8, 8, 4, 4]);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#fff2c2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(6, 6, w - 12, h - 12, [6, 6, 3, 3]);
      ctx.stroke();
    } else {
      ctx.strokeStyle = '#485c4d';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(3, 3, w - 6, h - 6, [8, 8, 4, 4]);
      ctx.stroke();
    }
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 5. 玄铁熔炼古鼎面板 (470×140)
   * 铸武台的铸剑熔炉实物表达：古铜暗金厚实外壁 + 内凹炉膛微光
   */
  private static generateFurnacePanel(scene: Phaser.Scene): void {
    const w = 470;
    const h = 140;
    const canvas = scene.textures.createCanvas('tx_furnace_panel', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 玄铁青铜厚壁底色
    const baseGrad = ctx.createLinearGradient(0, 0, w, h);
    baseGrad.addColorStop(0, '#1c2620');
    baseGrad.addColorStop(0.5, '#24322a');
    baseGrad.addColorStop(1, '#17211a');
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 8);
    ctx.fill();

    // 熔炉内凹炉膛 (Recessed Furnace Interior with subtle amber ember glow)
    const cavity = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, w * 0.45);
    cavity.addColorStop(0, 'rgba(235, 140, 50, 0.08)');
    cavity.addColorStop(0.5, 'rgba(160, 100, 35, 0.03)');
    cavity.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = cavity;
    ctx.fillRect(6, 6, w - 12, h - 12);

    // 古铜浮雕外圈
    ctx.save();
    ctx.strokeStyle = '#7c6532';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(3, 3, w - 6, h - 6, 8);
    ctx.stroke();

    // 四角如意云雷纹浮雕加固钉
    const drawRivet = (cx: number, cy: number) => {
      ctx.fillStyle = '#c9a44b';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    };
    drawRivet(12, 12);
    drawRivet(w - 12, 12);
    drawRivet(12, h - 12);
    drawRivet(w - 12, h - 12);

    // 内沿凹槽暗线
    ctx.strokeStyle = 'rgba(25, 38, 28, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 6. 兵刃玄案 / 神兵预览神龛 (240×140)
   */
  private static generatePreviewAltar(scene: Phaser.Scene): void {
    const w = 240;
    const h = 140;
    const canvas = scene.textures.createCanvas('tx_preview_altar', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 案台底色
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1b251e');
    bgGrad.addColorStop(0.5, '#222f26');
    bgGrad.addColorStop(1, '#172019');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 8);
    ctx.fill();

    // 浮雕金边
    ctx.strokeStyle = '#7c6532';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(3, 3, w - 6, h - 6, 8);
    ctx.stroke();

    // 内沿暗青金线
    ctx.strokeStyle = 'rgba(223, 196, 104, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(7, 7, w - 14, h - 14);

    canvas.refresh();
  }

  /**
   * 7. 玉石印台候选字槽位 (64×52)
   */
  private static generateSealSlot(scene: Phaser.Scene, isActive: boolean): void {
    const key = isActive ? 'tx_seal_slot_active' : 'tx_seal_slot';
    const w = 64;
    const h = 52;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 玉石印台渐变
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (isActive) {
      grad.addColorStop(0, '#293a2e');
      grad.addColorStop(0.5, '#334839');
      grad.addColorStop(1, '#213025');
    } else {
      grad.addColorStop(0, '#1a241d');
      grad.addColorStop(0.5, '#202b23');
      grad.addColorStop(1, '#151d17');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 5);
    ctx.fill();

    // 边线
    if (isActive) {
      ctx.save();
      ctx.shadowColor = '#dfc068';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#dfc068';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, 5);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#3e5242';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, 5);
      ctx.stroke();
    }

    canvas.refresh();
  }

  /**
   * 8. 仓中字牌 (78×42)
   */
  private static generateWordToken(scene: Phaser.Scene, isAvailable: boolean): void {
    const key = isAvailable ? 'tx_word_token' : 'tx_word_token_dim';
    const w = 78;
    const h = 42;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    if (isAvailable) {
      grad.addColorStop(0, '#222f25');
      grad.addColorStop(0.5, '#2b3b2f');
      grad.addColorStop(1, '#1c271f');
    } else {
      grad.addColorStop(0, '#171e19');
      grad.addColorStop(0.5, '#1b231d');
      grad.addColorStop(1, '#131814');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 5);
    ctx.fill();

    ctx.strokeStyle = isAvailable ? '#546b57' : '#2e3b31';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 5);
    ctx.stroke();

    canvas.refresh();
  }

  /**
   * 9. 武器典藏匣 / 卡牌 (150×78)
   */
  private static generateWeaponCard(scene: Phaser.Scene, isEquipped: boolean): void {
    const key = isEquipped ? 'tx_weapon_card_equipped' : 'tx_weapon_card';
    const w = 150;
    const h = 78;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    const grad = ctx.createLinearGradient(0, 0, w, h);
    if (isEquipped) {
      grad.addColorStop(0, '#28372b');
      grad.addColorStop(0.5, '#344738');
      grad.addColorStop(1, '#212d23');
    } else {
      grad.addColorStop(0, '#1c251e');
      grad.addColorStop(0.5, '#232e26');
      grad.addColorStop(1, '#172019');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 6);
    ctx.fill();

    if (isEquipped) {
      ctx.save();
      ctx.shadowColor = '#dfc068';
      ctx.shadowBlur = 6;
      ctx.strokeStyle = '#dfc068';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, 6);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#485c4b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, 6);
      ctx.stroke();
    }

    canvas.refresh();
  }

  /**
   * 10. 竹简令牌 (84×50)
   */
  private static generateBambooToken(scene: Phaser.Scene, isActive: boolean): void {
    const key = isActive ? 'tx_bamboo_token_active' : 'tx_bamboo_token';
    const w = 84;
    const h = 50;
    const canvas = scene.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 竹简木纹背景
    const woodGrad = ctx.createLinearGradient(0, 0, 0, h);
    woodGrad.addColorStop(0, '#253427');
    woodGrad.addColorStop(0.5, '#1e2c21');
    woodGrad.addColorStop(1, '#152017');
    ctx.fillStyle = woodGrad;

    ctx.beginPath();
    ctx.roundRect(2, 2, w - 4, h - 4, 6);
    ctx.fill();

    // 纵向竹木纤维
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

    // 倒角高光与阴影
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

    // 选中态浮雕描金边
    if (isActive) {
      ctx.save();
      ctx.shadowColor = '#e2c56a';
      ctx.shadowBlur = 8;
      ctx.strokeStyle = '#dfc068';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(2, 2, w - 4, h - 4, 6);
      ctx.stroke();

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
   * 11. 关卡门扉：金色双重浮雕 (158×480)
   */
  private static generateGoldReliefGate(scene: Phaser.Scene): void {
    const w = 158;
    const h = 480;
    const canvas = scene.textures.createCanvas('tx_gold_relief_gate', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();

    // 营门深色古铁木背景
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1c241e');
    bgGrad.addColorStop(0.5, '#222d25');
    bgGrad.addColorStop(1, '#172019');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // 双重浮雕暗金框架
    ctx.save();
    ctx.strokeStyle = '#856a2f';
    ctx.lineWidth = 3;
    ctx.strokeRect(3, 3, w - 6, h - 6);

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

    // 内框暗金线
    ctx.strokeStyle = 'rgba(215, 180, 100, 0.45)';
    ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    // 四角如意云纹角花
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
   * 12. 毛笔笔触造型按钮
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

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(8, h / 2);
    ctx.bezierCurveTo(4, 5, 14, 2, 26, 2);
    ctx.lineTo(w - 26, 2);
    ctx.bezierCurveTo(w - 14, 2, w - 3, 5, w - 6, h / 2);
    ctx.bezierCurveTo(w - 3, h - 5, w - 14, h - 2, w - 26, h - 2);
    ctx.lineTo(26, h - 2);
    ctx.bezierCurveTo(14, h - 2, 4, h - 5, 8, h / 2);
    ctx.closePath();

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

    // 飞白水墨微丝
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

    ctx.strokeStyle = style === 'gold' ? '#fff0ba' : style === 'red' ? '#e57373' : '#687f6e';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    canvas.refresh();
  }

  /**
   * 13. 墨点粒子
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
   * 14. 金箔粒子
   */
  private static generateGoldParticle(scene: Phaser.Scene): void {
    const size = 12;
    const canvas = scene.textures.createCanvas('tx_gold_particle', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();

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
}
