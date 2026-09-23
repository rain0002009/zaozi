import {
  CompoundEquipment,
  DEFAULT_EQUIPMENT_PRESETS,
  EquipmentCategory,
  ElementType,
  TRAIT_REGISTRY,
  TraitId,
  TraitInstance,
  WeaponActionType,
  WeaponShape,
} from '../data/equipmentTypes';

const STORAGE_KEY = 'zaozi_weapon_editor_data';

export class WeaponEditorApp {
  private container: HTMLElement;
  private equipmentList: CompoundEquipment[] = [];
  private selectedId: string = '';
  private currentFilter: 'all' | EquipmentCategory = 'all';
  private searchQuery: string = '';
  private jsonViewMode: 'selected' | 'all' = 'selected';

  constructor(container: HTMLElement) {
    this.container = container;
    this.loadInitialData();
  }

  private loadInitialData(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.equipmentList = parsed;
          this.selectedId = this.equipmentList[0].id;
          return;
        }
      }
    } catch {
      // fallback
    }

    // clone defaults
    this.equipmentList = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT_PRESETS));
    this.selectedId = this.equipmentList[0]?.id || '';
  }

  private saveData(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.equipmentList, null, 2));
    } catch {
      // storage quota or disabled
    }
  }

  public render(): void {
    this.container.innerHTML = `
      <div class="we-app">
        <!-- Top Nav Header -->
        <header class="we-header">
          <div class="we-header-title">
            <span class="we-logo">⚔️</span>
            <div>
              <h1>铸武台 · 天工配置台</h1>
              <p class="we-subtitle">武器与防具基础属性、汉字配方及法则特性配置生成器</p>
            </div>
          </div>
          <div class="we-header-stats">
            <span class="we-badge">总数: <b id="stat-total">0</b></span>
            <span class="we-badge">武器: <b id="stat-weapon">0</b></span>
            <span class="we-badge">防具: <b id="stat-armor">0</b></span>
          </div>
          <div class="we-header-actions">
            <button class="we-btn we-btn-secondary" id="btn-reset">🔄 恢复预设</button>
            <button class="we-btn we-btn-primary" id="btn-back-game">🎮 返回游戏</button>
          </div>
        </header>

        <!-- Main 3-Column Workspace -->
        <div class="we-body">
          <!-- Col 1: Left List -->
          <aside class="we-col we-col-list">
            <div class="we-list-header">
              <input type="text" id="input-search" class="we-input we-search" placeholder="🔍 搜索装备名称/ID/汉字..." />
              <div class="we-filter-bar">
                <button class="we-chip active" data-filter="all">全部</button>
                <button class="we-chip" data-filter="weapon">⚔️ 武器</button>
                <button class="we-chip" data-filter="armor">🛡️ 防具</button>
                <button class="we-chip" data-filter="talisman">📿 宝具</button>
              </div>
              <div class="we-list-actions">
                <button class="we-btn we-btn-sm we-btn-gold" id="btn-add-weapon">+ 新建武器</button>
                <button class="we-btn we-btn-sm we-btn-outline" id="btn-add-armor">+ 新建防具</button>
              </div>
            </div>
            <div class="we-item-list" id="item-list-container"></div>
          </aside>

          <!-- Col 2: Center Editor Form -->
          <main class="we-col we-col-form" id="form-container">
            <!-- Dynamic Content -->
          </main>

          <!-- Col 3: Right JSON Console -->
          <aside class="we-col we-col-json">
            <div class="we-json-header">
              <div class="we-json-tabs">
                <button class="we-tab-btn active" id="tab-json-selected">当前装备 JSON</button>
                <button class="we-tab-btn" id="tab-json-all">全量配置 JSON</button>
              </div>
              <div class="we-json-actions">
                <button class="we-btn we-btn-xs we-btn-gold" id="btn-copy-json">📋 复制</button>
                <button class="we-btn we-btn-xs we-btn-outline" id="btn-download-json">💾 下载</button>
                <button class="we-btn we-btn-xs we-btn-outline" id="btn-import-json">📂 导入</button>
              </div>
            </div>
            <div class="we-json-viewer-box">
              <pre><code id="json-code"></code></pre>
            </div>
            <div class="we-json-footer">
              <span class="we-tip">💡 纯 JSON 代码生成，点击【复制】可直接粘贴至 GameState.ts 或外部数据源。</span>
            </div>
          </aside>
        </div>

        <!-- Hidden File Input for JSON import -->
        <input type="file" id="file-import-input" accept=".json,application/json" style="display:none;" />

        <!-- Floating Toast -->
        <div id="we-toast" class="we-toast"></div>
      </div>

      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html { width: 100%; height: 100%; overflow: hidden; background: #131714; color: #ede7d8; font-family: "Source Han Serif SC", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif; }
        .we-app { display: flex; flex-direction: column; width: 100vw; height: 100vh; overflow: hidden; }
        
        /* Header */
        .we-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 24px; background: #19221c; border-bottom: 1px solid #2e3d31;
          height: 62px; flex-shrink: 0;
        }
        .we-header-title { display: flex; align-items: center; gap: 14px; }
        .we-logo { font-size: 28px; }
        .we-header-title h1 { font-size: 19px; font-weight: 700; color: #f2e9d5; letter-spacing: 1px; }
        .we-subtitle { font-size: 11px; color: #8e9e8f; margin-top: 2px; }
        .we-header-stats { display: flex; gap: 10px; }
        .we-badge { background: #232f26; border: 1px solid #36493b; padding: 4px 10px; border-radius: 4px; font-size: 12px; color: #b7c8b9; }
        .we-badge b { color: #d0b466; margin-left: 4px; }
        .we-header-actions { display: flex; gap: 10px; }

        /* Buttons */
        .we-btn {
          cursor: pointer; border: none; outline: none; border-radius: 4px; font-size: 13px; font-family: inherit;
          padding: 7px 14px; transition: all 0.15s ease; display: inline-flex; align-items: center; gap: 5px;
        }
        .we-btn-primary { background: #35523b; color: #f2e8d3; border: 1px solid #577d5e; }
        .we-btn-primary:hover { background: #44674c; border-color: #79a782; }
        .we-btn-secondary { background: #232c25; color: #a9baa9; border: 1px solid #39473b; }
        .we-btn-secondary:hover { background: #2d3930; color: #e0eedf; }
        .we-btn-gold { background: #b89139; color: #1f1707; font-weight: 600; }
        .we-btn-gold:hover { background: #d2a74c; }
        .we-btn-outline { background: transparent; color: #c4d4c5; border: 1px solid #4a5c4e; }
        .we-btn-outline:hover { background: #243026; border-color: #6a836f; }
        .we-btn-danger { background: #572525; color: #fca5a5; border: 1px solid #843838; }
        .we-btn-danger:hover { background: #733131; }
        .we-btn-sm { padding: 5px 10px; font-size: 12px; }
        .we-btn-xs { padding: 4px 8px; font-size: 11px; }

        /* Body 3 Cols */
        .we-body { display: flex; flex: 1; overflow: hidden; background: #151b16; }
        .we-col { display: flex; flex-direction: column; overflow: hidden; }
        .we-col-list { width: 310px; border-right: 1px solid #28352b; background: #18201a; flex-shrink: 0; }
        .we-col-form { flex: 1; border-right: 1px solid #28352b; background: #151b16; overflow-y: auto; padding: 20px 24px; }
        .we-col-json { width: 380px; background: #121613; flex-shrink: 0; }

        /* Left List */
        .we-list-header { padding: 14px 16px; border-bottom: 1px solid #28352b; display: flex; flex-direction: column; gap: 10px; }
        .we-input {
          background: #111512; border: 1px solid #334336; color: #e2ddd0; padding: 7px 10px; border-radius: 4px;
          font-size: 13px; font-family: inherit; outline: none; transition: border 0.15s;
        }
        .we-input:focus { border-color: #c9aa59; }
        .we-search { width: 100%; }
        .we-filter-bar { display: flex; gap: 6px; }
        .we-chip {
          cursor: pointer; background: #202b22; border: 1px solid #304134; color: #9aa89b; font-size: 11px;
          padding: 4px 8px; border-radius: 12px; transition: all 0.15s;
        }
        .we-chip.active, .we-chip:hover { background: #324636; border-color: #617f67; color: #e9f0e8; }
        .we-list-actions { display: flex; gap: 8px; margin-top: 2px; }
        .we-item-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        
        .we-item-card {
          cursor: pointer; padding: 10px 12px; background: #1c251e; border: 1px solid #2b392e; border-radius: 5px;
          display: flex; flex-direction: column; gap: 6px; transition: all 0.15s;
        }
        .we-item-card:hover { background: #222e25; border-color: #485c4d; }
        .we-item-card.active { background: #28372c; border-color: #c5a454; box-shadow: 0 0 8px rgba(197, 164, 84, 0.15); }
        .we-card-top { display: flex; align-items: center; justify-content: space-between; }
        .we-card-name { font-size: 14px; font-weight: bold; color: #f0e8d6; display: flex; align-items: center; gap: 6px; }
        .we-card-tools { display: flex; gap: 4px; opacity: 0.6; transition: opacity 0.15s; }
        .we-item-card:hover .we-card-tools { opacity: 1; }
        .we-card-words { display: flex; gap: 4px; align-items: center; font-size: 11px; color: #8e9e8f; }
        .we-word-badge { background: #131914; border: 1px solid #3b4d3e; color: #e5dabf; padding: 1px 5px; border-radius: 3px; font-family: serif; }
        .we-card-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; color: #869688; }
        .we-elem-badge { padding: 1px 6px; border-radius: 3px; font-size: 10px; }
        .we-elem-wood { background: #1f3d26; color: #78e096; }
        .we-elem-fire { background: #471d18; color: #f97d6d; }
        .we-elem-metal { background: #403613; color: #f5d862; }
        .we-elem-earth { background: #3b2c1b; color: #dab484; }
        .we-elem-water { background: #173740; color: #62d6f5; }
        .we-elem-none { background: #252d27; color: #b7c5b9; }

        /* Center Form */
        .we-section { background: #1b231d; border: 1px solid #2e3e31; border-radius: 6px; padding: 16px 20px; margin-bottom: 18px; }
        .we-section-title { font-size: 15px; font-weight: bold; color: #e9dec6; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #273429; padding-bottom: 8px; }
        .we-form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
        .we-form-field { display: flex; flex-direction: column; gap: 6px; }
        .we-label { font-size: 12px; color: #a4b3a5; font-weight: 500; }
        .we-label span { color: #f87171; }
        .we-select {
          background: #111512; border: 1px solid #334336; color: #e2ddd0; padding: 7px 10px; border-radius: 4px;
          font-size: 13px; font-family: inherit; outline: none;
        }
        .we-select:focus { border-color: #c9aa59; }
        .we-textarea {
          background: #111512; border: 1px solid #334336; color: #e2ddd0; padding: 8px 10px; border-radius: 4px;
          font-size: 13px; font-family: inherit; outline: none; resize: vertical; min-height: 52px;
        }
        .we-textarea:focus { border-color: #c9aa59; }
        .we-words-preview { display: flex; gap: 6px; margin-top: 6px; align-items: center; }
        .we-preview-char { background: #253327; border: 1px solid #c9aa59; color: #fbf5e6; font-size: 18px; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }

        /* Traits Section */
        .we-trait-pool { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; background: #141b15; padding: 12px; border-radius: 6px; border: 1px dashed #344837; }
        .we-trait-btn {
          cursor: pointer; background: #212c23; border: 1px solid #384d3b; color: #cfded0; font-size: 12px;
          padding: 6px 10px; border-radius: 4px; display: flex; align-items: center; gap: 6px; transition: all 0.15s;
        }
        .we-trait-btn:hover { background: #2e3e30; border-color: #5d7e63; color: #ffffff; transform: translateY(-1px); }
        .we-mounted-traits { display: flex; flex-direction: column; gap: 10px; }
        .we-trait-card {
          background: #202a22; border: 1px solid #3b4e3f; border-left: 4px solid #c0a153; border-radius: 5px;
          padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;
        }
        .we-trait-top { display: flex; align-items: center; justify-content: space-between; }
        .we-trait-info { display: flex; align-items: center; gap: 8px; }
        .we-trait-name { font-size: 14px; font-weight: bold; color: #f3edd9; }
        .we-trait-desc { font-size: 11px; color: #8e9e8f; }
        .we-trait-params { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; background: #161e18; padding: 10px 12px; border-radius: 4px; }
        .we-param-item { display: flex; flex-direction: column; gap: 4px; }
        .we-param-label { font-size: 11px; color: #a2b0a3; display: flex; justify-content: space-between; }
        .we-param-unit { color: #6f8070; font-size: 10px; }

        /* Col 3: Right JSON */
        .we-json-header {
          padding: 10px 14px; border-bottom: 1px solid #273429; display: flex; align-items: center;
          justify-content: space-between; background: #171d18;
        }
        .we-json-tabs { display: flex; gap: 6px; }
        .we-tab-btn {
          cursor: pointer; background: transparent; border: none; font-size: 12px; color: #8b998c;
          padding: 5px 8px; border-radius: 3px; font-family: inherit;
        }
        .we-tab-btn.active { background: #263329; color: #e9e4d6; font-weight: 600; }
        .we-json-actions { display: flex; gap: 6px; }
        .we-json-viewer-box {
          flex: 1; overflow: auto; padding: 12px; background: #0e120f; font-family: "Consolas", "Courier New", monospace;
          font-size: 12px; line-height: 1.5; color: #8cd99f;
        }
        .we-json-viewer-box pre { margin: 0; white-space: pre-wrap; word-break: break-all; }
        .we-json-footer { padding: 10px 14px; border-top: 1px solid #232f25; background: #141a15; }
        .we-tip { font-size: 11px; color: #7f9181; }

        /* Toast */
        .we-toast {
          position: fixed; bottom: 24px; right: 24px; background: #2a392d; border: 1px solid #c9aa59;
          color: #f7eed8; padding: 10px 18px; border-radius: 5px; font-size: 13px; box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          opacity: 0; pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; transform: translateY(10px); z-index: 9999;
        }
        .we-toast.show { opacity: 1; transform: translateY(0); }

        /* Scrollbars */
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #131714; }
        ::-webkit-scrollbar-thumb { background: #2d3b30; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #445848; }
      </style>
    `;

    this.bindGlobalEvents();
    this.updateLeftList();
    this.renderSelectedForm();
    this.updateJsonViewer();
    this.updateStats();
  }

  private showToast(msg: string): void {
    const toast = document.getElementById('we-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2400);
  }

  private updateStats(): void {
    const total = this.equipmentList.length;
    const weapon = this.equipmentList.filter((e) => e.category === 'weapon').length;
    const armor = this.equipmentList.filter((e) => e.category === 'armor').length;

    const elTotal = document.getElementById('stat-total');
    const elWeapon = document.getElementById('stat-weapon');
    const elArmor = document.getElementById('stat-armor');

    if (elTotal) elTotal.textContent = String(total);
    if (elWeapon) elWeapon.textContent = String(weapon);
    if (elArmor) elArmor.textContent = String(armor);
  }

  private getSelectedEquipment(): CompoundEquipment | undefined {
    return this.equipmentList.find((e) => e.id === this.selectedId) || this.equipmentList[0];
  }

  private bindGlobalEvents(): void {
    // Search input
    const searchInput = document.getElementById('input-search') as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = (e.target as HTMLInputElement).value.trim().toLowerCase();
        this.updateLeftList();
      });
    }

    // Filter chips
    const chips = this.container.querySelectorAll('.we-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', () => {
        chips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.getAttribute('data-filter') as any;
        this.updateLeftList();
      });
    });

    // Add weapon / armor
    document.getElementById('btn-add-weapon')?.addEventListener('click', () => this.addNewEquipment('weapon'));
    document.getElementById('btn-add-armor')?.addEventListener('click', () => this.addNewEquipment('armor'));

    // Reset default presets
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (confirm('确定要恢复为游戏初始默认预设吗？当前未导出的修改将被覆盖。')) {
        this.equipmentList = JSON.parse(JSON.stringify(DEFAULT_EQUIPMENT_PRESETS));
        this.selectedId = this.equipmentList[0].id;
        this.saveData();
        this.updateLeftList();
        this.renderSelectedForm();
        this.updateJsonViewer();
        this.updateStats();
        this.showToast('已重置恢复至初始默认预设！');
      }
    });

    // Back to game
    document.getElementById('btn-back-game')?.addEventListener('click', () => {
      window.location.href = window.location.pathname;
    });

    // JSON tabs
    const tabSelected = document.getElementById('tab-json-selected');
    const tabAll = document.getElementById('tab-json-all');
    tabSelected?.addEventListener('click', () => {
      this.jsonViewMode = 'selected';
      tabSelected.classList.add('active');
      tabAll?.classList.remove('active');
      this.updateJsonViewer();
    });
    tabAll?.addEventListener('click', () => {
      this.jsonViewMode = 'all';
      tabAll.classList.add('active');
      tabSelected?.classList.remove('active');
      this.updateJsonViewer();
    });

    // Copy JSON
    document.getElementById('btn-copy-json')?.addEventListener('click', () => {
      const codeEl = document.getElementById('json-code');
      if (codeEl) {
        navigator.clipboard.writeText(codeEl.textContent || '').then(() => {
          this.showToast('✓ JSON 已复制到剪贴板！');
        });
      }
    });

    // Download JSON
    document.getElementById('btn-download-json')?.addEventListener('click', () => {
      const jsonStr = JSON.stringify(this.equipmentList, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'weapons-config.json';
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('✓ 已下载 weapons-config.json');
    });

    // Import JSON
    const fileInput = document.getElementById('file-import-input') as HTMLInputElement;
    document.getElementById('btn-import-json')?.addEventListener('click', () => {
      fileInput?.click();
    });

    fileInput?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.equipmentList = parsed;
            this.selectedId = this.equipmentList[0].id;
            this.saveData();
            this.updateLeftList();
            this.renderSelectedForm();
            this.updateJsonViewer();
            this.updateStats();
            this.showToast(`✓ 成功导入 ${parsed.length} 件装备配置！`);
          } else {
            alert('导入失败：JSON 格式不是合法的装备列表数组。');
          }
        } catch (err: any) {
          alert('解析 JSON 失败：' + err.message);
        }
      };
      reader.readAsText(file);
      fileInput.value = '';
    });
  }

  private addNewEquipment(category: EquipmentCategory): void {
    const isWeapon = category === 'weapon';
    const index = this.equipmentList.length + 1;
    const newId = isWeapon ? `新武器_${index}` : `新防具_${index}`;
    const newEq: CompoundEquipment = {
      id: newId,
      name: isWeapon ? `玄铁利刃_${index}` : `护体玄甲_${index}`,
      category,
      words: isWeapon ? ['刀'] : ['盾'],
      type: isWeapon ? 'melee' : 'defense',
      shape: isWeapon ? '刀' : '盾',
      element: 'none',
      description: '新凝结铸造的神秘兵器，蓄势待发。',
      summary: isWeapon ? '基础斩击，伤害 15，击退 120。' : '抵御伤害，减伤 25%。',
      baseStats: isWeapon
        ? { damage: 15, attackSpeed: 1.0, range: 110, knockback: 120 }
        : { damageReduction: 0.25, bonusHp: 30, knockback: 150 },
      traits: isWeapon
        ? [
            {
              traitId: 'knockback',
              name: '击退震荡',
              params: { force: 140, stunMs: 50 },
            },
          ]
        : [
            {
              traitId: 'thorns',
              name: '荆棘反噬',
              params: { reflectRatio: 30 },
            },
          ],
    };

    this.equipmentList.unshift(newEq);
    this.selectedId = newEq.id;
    this.saveData();
    this.updateLeftList();
    this.renderSelectedForm();
    this.updateJsonViewer();
    this.updateStats();
    this.showToast(`已创建${isWeapon ? '新武器' : '新防具'}【${newEq.name}】！`);
  }

  private cloneEquipment(eq: CompoundEquipment): void {
    const cloned: CompoundEquipment = JSON.parse(JSON.stringify(eq));
    cloned.id = `${eq.id}_副本`;
    cloned.name = `${eq.name} (复制)`;
    this.equipmentList.splice(this.equipmentList.indexOf(eq) + 1, 0, cloned);
    this.selectedId = cloned.id;
    this.saveData();
    this.updateLeftList();
    this.renderSelectedForm();
    this.updateJsonViewer();
    this.updateStats();
    this.showToast(`已克隆生成【${cloned.name}】！`);
  }

  private deleteEquipment(eq: CompoundEquipment): void {
    if (this.equipmentList.length <= 1) {
      alert('至少需要保留一件装备配置！');
      return;
    }
    if (confirm(`确定要删除装备【${eq.name}】(${eq.id}) 吗？`)) {
      const idx = this.equipmentList.indexOf(eq);
      this.equipmentList.splice(idx, 1);
      this.selectedId = this.equipmentList[Math.max(0, idx - 1)].id;
      this.saveData();
      this.updateLeftList();
      this.renderSelectedForm();
      this.updateJsonViewer();
      this.updateStats();
      this.showToast(`已删除【${eq.name}】！`);
    }
  }

  private updateLeftList(): void {
    const container = document.getElementById('item-list-container');
    if (!container) return;

    let filtered = this.equipmentList;
    if (this.currentFilter !== 'all') {
      filtered = filtered.filter((e) => e.category === this.currentFilter);
    }
    if (this.searchQuery) {
      filtered = filtered.filter(
        (e) =>
          e.name.toLowerCase().includes(this.searchQuery) ||
          e.id.toLowerCase().includes(this.searchQuery) ||
          e.words.some((w) => w.includes(this.searchQuery))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px 10px; color: #6a7d6d; font-size: 12px; font-style: italic;">
          未检索到符合条件的装备
        </div>
      `;
      return;
    }

    const elemMap: Record<ElementType, { name: string; cls: string }> = {
      none: { name: '无属性', cls: 'we-elem-none' },
      wood: { name: '木属性', cls: 'we-elem-wood' },
      fire: { name: '火属性', cls: 'we-elem-fire' },
      metal: { name: '金属性', cls: 'we-elem-metal' },
      earth: { name: '土属性', cls: 'we-elem-earth' },
      water: { name: '水属性', cls: 'we-elem-water' },
    };

    container.innerHTML = filtered
      .map((item) => {
        const isActive = item.id === this.selectedId;
        const elem = elemMap[item.element] || elemMap.none;
        const icon = item.category === 'weapon' ? '⚔️' : item.category === 'armor' ? '🛡️' : '📿';
        const traitsCount = item.traits?.length || 0;

        return `
          <div class="we-item-card ${isActive ? 'active' : ''}" data-id="${item.id}">
            <div class="we-card-top">
              <span class="we-card-name">${icon} ${item.name}</span>
              <div class="we-card-tools">
                <button class="we-btn we-btn-xs we-btn-outline btn-clone" data-id="${item.id}" title="复制此装备">📑</button>
                <button class="we-btn we-btn-xs we-btn-danger btn-delete" data-id="${item.id}" title="删除此装备">🗑️</button>
              </div>
            </div>
            <div class="we-card-words">
              <span>配方:</span>
              ${item.words.map((w) => `<span class="we-word-badge">${w}</span>`).join('')}
              <span style="color:#57695a; margin-left:auto;">${item.shape || '刀'}</span>
            </div>
            <div class="we-card-meta">
              <span class="we-elem-badge ${elem.cls}">${elem.name}</span>
              <span style="color:#a8bca9;">特性: <b style="color:${traitsCount > 0 ? '#d0b466' : '#697a6b'}">${traitsCount}个</b></span>
            </div>
          </div>
        `;
      })
      .join('');

    // Attach click events
    container.querySelectorAll('.we-item-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        // avoid trigger if click inside tools
        if ((e.target as HTMLElement).closest('.we-card-tools')) return;
        const id = card.getAttribute('data-id');
        if (id) {
          this.selectedId = id;
          this.updateLeftList();
          this.renderSelectedForm();
          this.updateJsonViewer();
        }
      });
    });

    container.querySelectorAll('.btn-clone').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const eq = this.equipmentList.find((x) => x.id === id);
        if (eq) this.cloneEquipment(eq);
      });
    });

    container.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const eq = this.equipmentList.find((x) => x.id === id);
        if (eq) this.deleteEquipment(eq);
      });
    });
  }

  private renderSelectedForm(): void {
    const form = document.getElementById('form-container');
    if (!form) return;

    const eq = this.getSelectedEquipment();
    if (!eq) {
      form.innerHTML = '<div style="padding: 40px; color: #7f9181;">未选中装备</div>';
      return;
    }

    const isWeapon = eq.category === 'weapon';

    form.innerHTML = `
      <!-- 1. 基础信息 Section -->
      <section class="we-section">
        <div class="we-section-title">
          <span>📜 基础信息与配方</span>
        </div>
        <div class="we-form-grid">
          <div class="we-form-field">
            <label class="we-label">唯一标识 ID <span>*</span></label>
            <input type="text" id="eq-id" class="we-input" value="${eq.id}" />
          </div>
          <div class="we-form-field">
            <label class="we-label">显示名称 Name <span>*</span></label>
            <input type="text" id="eq-name" class="we-input" value="${eq.name}" />
          </div>
          <div class="we-form-field">
            <label class="we-label">装备大类 Category</label>
            <select id="eq-category" class="we-select">
              <option value="weapon" ${eq.category === 'weapon' ? 'selected' : ''}>⚔️ 武器 (Weapon)</option>
              <option value="armor" ${eq.category === 'armor' ? 'selected' : ''}>🛡️ 防具 (Armor)</option>
              <option value="talisman" ${eq.category === 'talisman' ? 'selected' : ''}>📿 宝具/法器 (Talisman)</option>
            </select>
          </div>
          <div class="we-form-field">
            <label class="we-label">组成字配方 (手动输入汉字，逗号或空格隔开) <span>*</span></label>
            <input type="text" id="eq-words" class="we-input" value="${eq.words.join(', ')}" placeholder="如：木, 刀" />
            <div class="we-words-preview" id="words-preview-box">
              ${eq.words.map((w) => `<div class="we-preview-char">${w}</div>`).join('')}
            </div>
          </div>
        </div>
        <div class="we-form-grid" style="margin-top: 14px;">
          <div class="we-form-field" style="grid-column: 1 / -1;">
            <label class="we-label">简要战力描述 Summary (卡片概要)</label>
            <input type="text" id="eq-summary" class="we-input" value="${eq.summary || ''}" />
          </div>
          <div class="we-form-field" style="grid-column: 1 / -1;">
            <label class="we-label">背景古籍典故 Description</label>
            <textarea id="eq-description" class="we-textarea">${eq.description || ''}</textarea>
          </div>
        </div>
      </section>

      <!-- 2. 视觉形态与动作模组 Section -->
      <section class="we-section">
        <div class="we-section-title">
          <span>🎨 视觉形态与战斗模组</span>
        </div>
        <div class="we-form-grid">
          <div class="we-form-field">
            <label class="we-label">攻击方式 Action Type</label>
            <select id="eq-type" class="we-select">
              <option value="melee" ${eq.type === 'melee' ? 'selected' : ''}>近战突进/挥斩 (Melee)</option>
              <option value="ranged" ${eq.type === 'ranged' ? 'selected' : ''}>远程弹道射击 (Ranged)</option>
              <option value="defense" ${eq.type === 'defense' ? 'selected' : ''}>防御抵挡反冲 (Defense)</option>
            </select>
          </div>
          <div class="we-form-field">
            <label class="we-label">水墨兵刃形态 Shape</label>
            <select id="eq-shape" class="we-select">
              <option value="刀" ${eq.shape === '刀' ? 'selected' : ''}>刀 (刀光弧月连斩)</option>
              <option value="弓" ${eq.shape === '弓' ? 'selected' : ''}>弓 (张弦飞矢射击)</option>
              <option value="枪" ${eq.shape === '枪' ? 'selected' : ''}>枪 (远距破阵突刺)</option>
              <option value="斧" ${eq.shape === '斧' ? 'selected' : ''}>斧 (重劈撼地震波)</option>
              <option value="盾" ${eq.shape === '盾' ? 'selected' : ''}>盾 (坚固格挡冲锋)</option>
            </select>
          </div>
          <div class="we-form-field">
            <label class="we-label">五行属性 Element</label>
            <select id="eq-element" class="we-select">
              <option value="none" ${eq.element === 'none' ? 'selected' : ''}>无属性 (墨色)</option>
              <option value="wood" ${eq.element === 'wood' ? 'selected' : ''}>木属性 (翠墨 · 迅捷穿透)</option>
              <option value="fire" ${eq.element === 'fire' ? 'selected' : ''}>火属性 (赤焰 · 爆燃灼烧)</option>
              <option value="metal" ${eq.element === 'metal' ? 'selected' : ''}>金属性 (金芒 · 破甲锋锐)</option>
              <option value="earth" ${eq.element === 'earth' ? 'selected' : ''}>土属性 (岩黄 · 崩山厚重)</option>
              <option value="water" ${eq.element === 'water' ? 'selected' : ''}>水属性 (幽碧 · 润物绵长)</option>
            </select>
          </div>
        </div>
      </section>

      <!-- 3. 基础属性数值 Section -->
      <section class="we-section">
        <div class="we-section-title">
          <span>⚖️ 基础属性数值 (Base Stats)</span>
        </div>
        <div class="we-form-grid" id="stats-grid">
          ${
            isWeapon
              ? `
            <div class="we-form-field">
              <label class="we-label">基础伤害 Damage</label>
              <input type="number" id="stat-damage" class="we-input" value="${eq.baseStats?.damage ?? 15}" min="1" max="999" />
            </div>
            <div class="we-form-field">
              <label class="we-label">攻击速度倍率 AttackSpeed</label>
              <input type="number" id="stat-speed" class="we-input" step="0.05" value="${eq.baseStats?.attackSpeed ?? 1.0}" min="0.2" max="3.0" />
            </div>
            <div class="we-form-field">
              <label class="we-label">攻击距离 Range (px)</label>
              <input type="number" id="stat-range" class="we-input" value="${eq.baseStats?.range ?? 120}" min="30" max="1000" />
            </div>
            <div class="we-form-field">
              <label class="we-label">基础击退 Knockback</label>
              <input type="number" id="stat-knockback" class="we-input" value="${eq.baseStats?.knockback ?? 120}" min="0" max="600" />
            </div>
            <div class="we-form-field" id="field-proj-speed" style="${eq.type === 'ranged' ? '' : 'display:none;'}">
              <label class="we-label">弹道飞行速度 ProjectileSpeed</label>
              <input type="number" id="stat-projspeed" class="we-input" value="${eq.baseStats?.projectileSpeed ?? 580}" min="100" max="2000" />
            </div>
          `
              : `
            <div class="we-form-field">
              <label class="we-label">受创减伤率 DamageReduction (%)</label>
              <input type="number" id="stat-reduction" class="we-input" value="${Math.round((eq.baseStats?.damageReduction ?? 0.3) * 100)}" min="0" max="90" />
            </div>
            <div class="we-form-field">
              <label class="we-label">额外生命上限 Bonus HP</label>
              <input type="number" id="stat-bonushp" class="we-input" value="${eq.baseStats?.bonusHp ?? 30}" min="0" max="500" />
            </div>
            <div class="we-form-field">
              <label class="we-label">反弹冲击 Knockback</label>
              <input type="number" id="stat-knockback" class="we-input" value="${eq.baseStats?.knockback ?? 180}" min="0" max="600" />
            </div>
          `
          }
        </div>
      </section>

      <!-- 4. 特性装配系统 Section -->
      <section class="we-section">
        <div class="we-section-title">
          <span>✨ 法则特性装配 (Traits System)</span>
          <span style="font-size: 11px; font-weight: normal; color: #8e9e8f; margin-left: auto;">
            点击下方特性卡片即可装配，装配后可自定义每项特性的具体强度数值
          </span>
        </div>

        <!-- Available Traits Pool -->
        <label class="we-label" style="margin-bottom: 8px; display:block;">【待选法则特性库】（点击添加至当前装备）:</label>
        <div class="we-trait-pool" id="trait-pool">
          ${Object.values(TRAIT_REGISTRY)
            .map((t) => {
              return `
                <button class="we-trait-btn" data-trait-id="${t.id}" title="${t.summary}">
                  <span>${t.icon}</span>
                  <span>${t.name}</span>
                  <span style="color:#d0b466; font-size:11px;">+</span>
                </button>
              `;
            })
            .join('')}
        </div>

        <!-- Mounted Traits List -->
        <label class="we-label" style="margin-bottom: 8px; display:block;">【已装配特性与强度参数】:</label>
        <div class="we-mounted-traits" id="mounted-traits-box">
          ${
            eq.traits && eq.traits.length > 0
              ? eq.traits
                  .map((tInst, index) => {
                    const meta = TRAIT_REGISTRY[tInst.traitId];
                    if (!meta) return '';
                    return `
                  <div class="we-trait-card" data-index="${index}">
                    <div class="we-trait-top">
                      <div class="we-trait-info">
                        <span style="font-size: 18px;">${meta.icon}</span>
                        <div>
                          <span class="we-trait-name">${meta.name}</span>
                          <span class="we-trait-desc"> - ${meta.summary}</span>
                        </div>
                      </div>
                      <button class="we-btn we-btn-xs we-btn-danger btn-remove-trait" data-index="${index}">✕ 卸下特性</button>
                    </div>
                    <div class="we-trait-params">
                      ${meta.params
                        .map((p) => {
                          const val = tInst.params[p.key] !== undefined ? tInst.params[p.key] : p.defaultValue;
                          return `
                          <div class="we-param-item">
                            <label class="we-param-label">
                              <span>${p.label}</span>
                              <span class="we-param-unit">${p.unit || ''}</span>
                            </label>
                            <input
                              type="${p.type === 'number' ? 'number' : 'text'}"
                              class="we-input we-param-input"
                              data-index="${index}"
                              data-key="${p.key}"
                              data-type="${p.type}"
                              value="${val}"
                              ${p.min !== undefined ? `min="${p.min}"` : ''}
                              ${p.max !== undefined ? `max="${p.max}"` : ''}
                              ${p.step !== undefined ? `step="${p.step}"` : ''}
                              title="${p.description}"
                            />
                          </div>
                        `;
                        })
                        .join('')}
                    </div>
                  </div>
                `;
                  })
                  .join('')
              : `
              <div style="padding: 24px; text-align: center; color: #6d806f; background: #131814; border: 1px dashed #2f3e32; border-radius: 4px; font-size: 13px;">
                当前尚未装配任何法则特性，请在上方特性库中点击选择添加。
              </div>
            `
          }
        </div>
      </section>
    `;

    this.bindFormEvents(eq);
  }

  private bindFormEvents(eq: CompoundEquipment): void {
    const isWeapon = eq.category === 'weapon';

    // ID
    const idInput = document.getElementById('eq-id') as HTMLInputElement;
    idInput?.addEventListener('change', () => {
      const oldId = eq.id;
      const newId = idInput.value.trim();
      if (!newId) return;
      eq.id = newId;
      this.selectedId = newId;
      this.saveData();
      this.updateLeftList();
      this.updateJsonViewer();
    });

    // Name
    const nameInput = document.getElementById('eq-name') as HTMLInputElement;
    nameInput?.addEventListener('input', () => {
      eq.name = nameInput.value.trim() || '未命名装备';
      this.saveData();
      this.updateLeftList();
      this.updateJsonViewer();
    });

    // Category
    const catSelect = document.getElementById('eq-category') as HTMLSelectElement;
    catSelect?.addEventListener('change', () => {
      eq.category = catSelect.value as EquipmentCategory;
      this.saveData();
      this.renderSelectedForm();
      this.updateLeftList();
      this.updateJsonViewer();
      this.updateStats();
    });

    // Words
    const wordsInput = document.getElementById('eq-words') as HTMLInputElement;
    const wordsPreviewBox = document.getElementById('words-preview-box');
    wordsInput?.addEventListener('input', () => {
      const raw = wordsInput.value;
      const parsed = raw
        .split(/[,，\s+]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      eq.words = parsed.length > 0 ? parsed : ['刀'];
      if (wordsPreviewBox) {
        wordsPreviewBox.innerHTML = eq.words
          .map((w) => `<div class="we-preview-char">${w}</div>`)
          .join('');
      }
      this.saveData();
      this.updateLeftList();
      this.updateJsonViewer();
    });

    // Summary & Description
    const sumInput = document.getElementById('eq-summary') as HTMLInputElement;
    sumInput?.addEventListener('input', () => {
      eq.summary = sumInput.value;
      this.saveData();
      this.updateJsonViewer();
    });

    const descInput = document.getElementById('eq-description') as HTMLTextAreaElement;
    descInput?.addEventListener('input', () => {
      eq.description = descInput.value;
      this.saveData();
      this.updateJsonViewer();
    });

    // Visual & Action
    const typeSelect = document.getElementById('eq-type') as HTMLSelectElement;
    typeSelect?.addEventListener('change', () => {
      eq.type = typeSelect.value as WeaponActionType;
      const projSpeedField = document.getElementById('field-proj-speed');
      if (projSpeedField) {
        projSpeedField.style.display = eq.type === 'ranged' ? '' : 'none';
      }
      this.saveData();
      this.updateJsonViewer();
    });

    const shapeSelect = document.getElementById('eq-shape') as HTMLSelectElement;
    shapeSelect?.addEventListener('change', () => {
      eq.shape = shapeSelect.value as WeaponShape;
      this.saveData();
      this.updateLeftList();
      this.updateJsonViewer();
    });

    const elemSelect = document.getElementById('eq-element') as HTMLSelectElement;
    elemSelect?.addEventListener('change', () => {
      eq.element = elemSelect.value as ElementType;
      this.saveData();
      this.updateLeftList();
      this.updateJsonViewer();
    });

    // Stats
    if (isWeapon) {
      const dmg = document.getElementById('stat-damage') as HTMLInputElement;
      dmg?.addEventListener('input', () => {
        eq.baseStats.damage = Number(dmg.value) || 0;
        this.saveData();
        this.updateJsonViewer();
      });

      const spd = document.getElementById('stat-speed') as HTMLInputElement;
      spd?.addEventListener('input', () => {
        eq.baseStats.attackSpeed = Number(spd.value) || 1.0;
        this.saveData();
        this.updateJsonViewer();
      });

      const rng = document.getElementById('stat-range') as HTMLInputElement;
      rng?.addEventListener('input', () => {
        eq.baseStats.range = Number(rng.value) || 100;
        this.saveData();
        this.updateJsonViewer();
      });

      const kb = document.getElementById('stat-knockback') as HTMLInputElement;
      kb?.addEventListener('input', () => {
        eq.baseStats.knockback = Number(kb.value) || 100;
        this.saveData();
        this.updateJsonViewer();
      });

      const ps = document.getElementById('stat-projspeed') as HTMLInputElement;
      ps?.addEventListener('input', () => {
        eq.baseStats.projectileSpeed = Number(ps.value) || 500;
        this.saveData();
        this.updateJsonViewer();
      });
    } else {
      const red = document.getElementById('stat-reduction') as HTMLInputElement;
      red?.addEventListener('input', () => {
        eq.baseStats.damageReduction = Math.min(0.9, Math.max(0, (Number(red.value) || 0) / 100));
        this.saveData();
        this.updateJsonViewer();
      });

      const hp = document.getElementById('stat-bonushp') as HTMLInputElement;
      hp?.addEventListener('input', () => {
        eq.baseStats.bonusHp = Number(hp.value) || 0;
        this.saveData();
        this.updateJsonViewer();
      });

      const kb = document.getElementById('stat-knockback') as HTMLInputElement;
      kb?.addEventListener('input', () => {
        eq.baseStats.knockback = Number(kb.value) || 100;
        this.saveData();
        this.updateJsonViewer();
      });
    }

    // Add trait from pool
    document.querySelectorAll('.we-trait-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const tId = btn.getAttribute('data-trait-id') as TraitId;
        const meta = TRAIT_REGISTRY[tId];
        if (!meta) return;

        // initialize default params
        const defaultParams: Record<string, any> = {};
        for (const p of meta.params) {
          defaultParams[p.key] = p.defaultValue;
        }

        if (!eq.traits) eq.traits = [];
        eq.traits.push({
          traitId: tId,
          name: meta.name,
          params: defaultParams,
        });

        this.saveData();
        this.renderSelectedForm();
        this.updateLeftList();
        this.updateJsonViewer();
        this.showToast(`已装配特性【${meta.name}】！`);
      });
    });

    // Remove trait
    document.querySelectorAll('.btn-remove-trait').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        if (!isNaN(idx) && eq.traits[idx]) {
          const removed = eq.traits.splice(idx, 1);
          this.saveData();
          this.renderSelectedForm();
          this.updateLeftList();
          this.updateJsonViewer();
          this.showToast(`已卸下特性【${removed[0]?.name || ''}】`);
        }
      });
    });

    // Change trait parameters
    document.querySelectorAll('.we-param-input').forEach((input) => {
      input.addEventListener('input', () => {
        const idx = Number(input.getAttribute('data-index'));
        const key = input.getAttribute('data-key');
        const type = input.getAttribute('data-type');
        if (isNaN(idx) || !key || !eq.traits[idx]) return;

        const val = (input as HTMLInputElement).value;
        if (type === 'number') {
          eq.traits[idx].params[key] = Number(val);
        } else if (type === 'boolean') {
          eq.traits[idx].params[key] = (input as HTMLInputElement).checked;
        } else {
          eq.traits[idx].params[key] = val;
        }

        this.saveData();
        this.updateJsonViewer();
      });
    });
  }

  private updateJsonViewer(): void {
    const codeEl = document.getElementById('json-code');
    if (!codeEl) return;

    if (this.jsonViewMode === 'selected') {
      const eq = this.getSelectedEquipment();
      codeEl.textContent = eq ? JSON.stringify(eq, null, 2) : '{}';
    } else {
      codeEl.textContent = JSON.stringify(this.equipmentList, null, 2);
    }
  }
}

export function mountWeaponEditor(container: HTMLElement): WeaponEditorApp {
  const app = new WeaponEditorApp(container);
  app.render();
  return app;
}
