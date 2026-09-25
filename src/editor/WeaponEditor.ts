import {
  CompoundEquipment,
  DEFAULT_EQUIPMENT_PRESETS,
  EquipmentCategory,
  EquipmentVisual,
  ElementType,
  TRAIT_REGISTRY,
  TraitId,
  TraitInstance,
  WeaponActionType,
  WeaponShape,
  extractEquipmentStats,
  getEquipmentActionType,
  getEquipmentElement,
} from '../data/equipmentTypes';
import { equipmentRepository } from '../data/EquipmentRepository';

export class WeaponEditorApp {
  private container: HTMLElement;
  private equipmentList: CompoundEquipment[] = [];
  private selectedId: string = '';
  private currentFilter: 'all' | EquipmentCategory = 'all';
  private searchQuery: string = '';
  private jsonViewMode: 'selected' | 'all' = 'selected';
  private activeAnchorMode: 'grip' | 'tip' = 'grip';
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this.equipmentList = equipmentRepository.getAll();
    this.equipmentList.forEach((eq) => {
      eq.type = getEquipmentActionType(eq.shape || '刀');
      eq.element = getEquipmentElement(eq);
    });
    this.selectedId = this.equipmentList[0]?.id || '';
  }

  private saveData(showToastFeedback = false): void {
    this.equipmentList.forEach((eq) => {
      eq.type = getEquipmentActionType(eq.shape || '刀');
      eq.element = getEquipmentElement(eq);
    });
    equipmentRepository.saveAll(this.equipmentList);
    if (showToastFeedback) {
      this.showToast('💾 武器数据库已保存！游戏内数值、连击与拓片锚点已实时同步生效。');
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
              <p class="we-subtitle">统一特性模型、六大兵刃连击及外形拓片双锚点配置系统</p>
            </div>
          </div>
          <div class="we-header-stats">
            <span class="we-badge">总数: <b id="stat-total">0</b></span>
            <span class="we-badge">武器: <b id="stat-weapon">0</b></span>
            <span class="we-badge">防具: <b id="stat-armor">0</b></span>
          </div>
          <div class="we-header-actions">
            <button class="we-btn we-btn-gold" id="btn-save-all" style="font-weight:bold; font-size:14px; padding: 7px 18px;">💾 保存生效</button>
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
                <input type="file" id="file-import-input" accept=".json" style="display:none;" />
              </div>
            </div>
            <div class="we-json-viewer-box" id="json-viewer-box">
              <pre><code id="json-code"></code></pre>
            </div>
            <div class="we-json-footer">
              <span class="we-tip">💡 提示：本数据完全本地化持久存储，配置实时生效。</span>
            </div>
          </aside>
        </div>

        <div class="we-toast" id="we-toast"></div>
      </div>

      <style>
        .we-app {
          display: flex; flex-direction: column; width: 100vw; height: 100vh;
          background: #111512; color: #ede3ce; font-family: "Noto Serif SC", "PingFang SC", "Microsoft YaHei", serif;
          overflow: hidden; user-select: none;
        }
        .we-header {
          height: 60px; background: #18221a; border-bottom: 1px solid #2e3e31;
          display: flex; align-items: center; justify-content: space-between; padding: 0 24px;
        }
        .we-header-title { display: flex; align-items: center; gap: 12px; }
        .we-header-title h1 { margin: 0; font-size: 18px; font-weight: bold; color: #fdf5e6; letter-spacing: 1px; }
        .we-header-title .we-subtitle { margin: 0; font-size: 11px; color: #8e9e8f; }
        .we-logo { font-size: 24px; }
        .we-header-stats { display: flex; gap: 12px; }
        .we-badge { background: #222d24; border: 1px solid #37493a; padding: 4px 10px; border-radius: 4px; font-size: 12px; color: #a4b3a5; }
        .we-badge b { color: #d0b466; margin-left: 4px; }
        .we-header-actions { display: flex; gap: 10px; }

        .we-btn {
          cursor: pointer; border-radius: 4px; border: 1px solid transparent; font-family: inherit;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.15s;
        }
        .we-btn-gold { background: linear-gradient(180deg, #d8bc70 0%, #aa8b38 100%); color: #181c15; border-color: #eed694; font-weight: bold; }
        .we-btn-gold:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .we-btn-primary { background: #2b3a2e; color: #e9dec6; border-color: #405544; padding: 6px 14px; font-size: 13px; }
        .we-btn-primary:hover { background: #354738; color: #ffffff; }
        .we-btn-secondary { background: #212923; color: #9ab09d; border-color: #324034; padding: 6px 12px; font-size: 13px; }
        .we-btn-secondary:hover { background: #2c382f; color: #dde8df; }
        .we-btn-outline { background: transparent; color: #c4b89e; border-color: #3f5242; padding: 4px 10px; font-size: 12px; }
        .we-btn-outline:hover { background: #232d25; border-color: #637f68; color: #f5eedf; }
        .we-btn-danger { background: #4a211f; color: #fca5a5; border-color: #7f1d1d; }
        .we-btn-danger:hover { background: #632927; color: #fee2e2; }
        .we-btn-sm { padding: 5px 12px; font-size: 12px; }
        .we-btn-xs { padding: 3px 8px; font-size: 11px; }

        .we-body { display: flex; flex: 1; overflow: hidden; }
        .we-col { display: flex; flex-direction: column; height: 100%; }
        .we-col-list { width: 310px; border-right: 1px solid #273429; background: #141b16; }
        .we-col-form { flex: 1; overflow-y: auto; padding: 24px 32px; background: #131814; }
        .we-col-json { width: 360px; border-left: 1px solid #273429; background: #151c17; }

        .we-list-header { padding: 14px; border-bottom: 1px solid #263328; display: flex; flex-direction: column; gap: 10px; }
        .we-input {
          background: #19221b; border: 1px solid #304133; color: #ede3ce; padding: 7px 10px; border-radius: 4px;
          font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.15s;
        }
        .we-input:focus { border-color: #c9aa59; box-shadow: 0 0 0 1px #c9aa59; }
        .we-search { width: 100%; box-sizing: border-box; }
        .we-filter-bar { display: flex; gap: 4px; }
        .we-chip {
          cursor: pointer; background: #1d261f; border: 1px solid #2c392e; color: #8e9e8f; padding: 4px 8px;
          font-size: 11px; border-radius: 12px; transition: all 0.15s;
        }
        .we-chip:hover { color: #d7e4d8; border-color: #465b4a; }
        .we-chip.active { background: #2f4032; color: #fbf5e6; border-color: #c0a153; font-weight: bold; }
        .we-list-actions { display: flex; gap: 8px; }

        .we-item-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 6px; }
        .we-item-card {
          cursor: pointer; background: #19221b; border: 1px solid #2a372c; border-radius: 5px; padding: 10px 12px;
          display: flex; flex-direction: column; gap: 6px; transition: all 0.12s;
        }
        .we-item-card:hover { background: #202b23; border-color: #495e4e; }
        .we-item-card.active { background: #263329; border-color: #c9aa59; box-shadow: 0 0 8px rgba(201, 170, 89, 0.2); }
        .we-card-top { display: flex; justify-content: space-between; align-items: center; }
        .we-card-name { font-size: 14px; font-weight: bold; color: #fdf5e6; }
        .we-card-tools { display: flex; gap: 4px; opacity: 0.6; }
        .we-item-card:hover .we-card-tools { opacity: 1; }
        .we-card-words { display: flex; gap: 4px; font-size: 11px; color: #8b998c; align-items: center; }
        .we-word-badge { background: #2a392d; border: 1px solid #3d5040; color: #f0eae1; font-weight: bold; padding: 1px 5px; border-radius: 3px; }
        .we-card-meta { display: flex; align-items: center; justify-content: space-between; font-size: 11px; margin-top: 2px; }
        .we-elem-badge { padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 500; }
        .we-elem-none { background: #222923; color: #9aa99c; }
        .we-elem-wood { background: #1b3823; color: #72e08e; border: 1px solid #2f5f3c; }
        .we-elem-fire { background: #3d1c16; color: #ff8266; border: 1px solid #6b2f24; }
        .we-elem-metal { background: #383416; color: #ffd866; border: 1px solid #635c24; }
        .we-elem-earth { background: #2d2319; color: #deb583; border: 1px solid #52402e; }
        .we-elem-water { background: #132a33; color: #6be3ff; border: 1px solid #234c5c; }

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

        .we-toast {
          position: fixed; bottom: 24px; right: 24px; background: #2a392d; border: 1px solid #c9aa59;
          color: #f7eed8; padding: 10px 18px; border-radius: 5px; font-size: 13px; box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          opacity: 0; pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease; transform: translateY(10px); z-index: 9999;
        }
        .we-toast.show { opacity: 1; transform: translateY(0); }

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
    return this.equipmentList.find((e) => e.id === this.selectedId);
  }

  private bindGlobalEvents(): void {
    // Search
    const searchInput = document.getElementById('input-search') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim().toLowerCase();
      this.updateLeftList();
    });

    // Category filter chips
    document.querySelectorAll('.we-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.we-chip').forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.getAttribute('data-filter') as any;
        this.updateLeftList();
      });
    });

    // Add buttons
    document.getElementById('btn-add-weapon')?.addEventListener('click', () => {
      this.addNewEquipment('weapon');
    });
    document.getElementById('btn-add-armor')?.addEventListener('click', () => {
      this.addNewEquipment('armor');
    });

    // Save all button
    document.getElementById('btn-save-all')?.addEventListener('click', () => {
      this.saveData(true);
    });

    // Reset button
    document.getElementById('btn-reset')?.addEventListener('click', () => {
      if (confirm('确认恢复初始默认预设吗？当前所有未导出的改动将被覆盖重置。')) {
        equipmentRepository.resetToDefaults();
        this.equipmentList = equipmentRepository.getAll();
        this.selectedId = this.equipmentList[0]?.id || '';
        this.updateLeftList();
        this.renderSelectedForm();
        this.updateJsonViewer();
        this.updateStats();
        this.showToast('🔄 已重置恢复至初始默认预设！');
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
      const jsonStr = equipmentRepository.exportJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'zaozi-weapons-config.json';
      a.click();
      URL.revokeObjectURL(url);
      this.showToast('✓ 已下载 zaozi-weapons-config.json');
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
          const res = equipmentRepository.importJson(content);
          if (res.success) {
            this.equipmentList = equipmentRepository.getAll();
            this.selectedId = this.equipmentList[0]?.id || '';
            this.updateLeftList();
            this.renderSelectedForm();
            this.updateJsonViewer();
            this.updateStats();
            this.showToast(`✓ 成功导入 ${res.count} 件装备配置并实时生效！`);
          } else {
            alert('导入失败：' + res.error);
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
      summary: isWeapon ? '基础挥砍，伤害 15，击退 120。' : '抵御伤害，减伤 25%。',
      baseStats: isWeapon
        ? { damage: 15, attackSpeed: 1.0, range: 110, knockback: 120 }
        : { damageReduction: 0.25, bonusHp: 30, knockback: 150 },
      traits: isWeapon
        ? [
            { traitId: 'damage', name: '伤害', params: { value: 15 } },
            { traitId: 'attackSpeed', name: '攻速', params: { value: 1.0 } },
            { traitId: 'range', name: '范围', params: { value: 110 } },
            { traitId: 'knockback', name: '击退', params: { force: 120, stunMs: 50 } },
          ]
        : [
            { traitId: 'damageReduction', name: '减伤', params: { value: 25 } },
            { traitId: 'bonusHp', name: '生命', params: { value: 30 } },
            { traitId: 'thorns', name: '反伤', params: { reflectRatio: 30 } },
          ],
      visual: {
        gripAnchor: { x: 0.2, y: 0.5 },
        tipAnchor: { x: 0.95, y: 0.5 },
        rotationOffsetDeg: 0,
        scale: 1.0,
      },
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
        const derivedElem = getEquipmentElement(item);
        const elem = elemMap[derivedElem] || elemMap.none;
        const icon = item.category === 'weapon' ? '⚔️' : item.category === 'armor' ? '🛡️' : '📿';
        const traitsCount = item.traits?.length || 0;
        const hasRubbing = item.visual?.imageDataUrl ? '🖼️' : '';

        return `
          <div class="we-item-card ${isActive ? 'active' : ''}" data-id="${item.id}">
            <div class="we-card-top">
              <span class="we-card-name">${icon} ${item.name} ${hasRubbing}</span>
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

    container.querySelectorAll('.we-item-card').forEach((card) => {
      card.addEventListener('click', (e) => {
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
    const stats = extractEquipmentStats(eq);

    // Group traits into categories
    const mechanicsTraits = Object.values(TRAIT_REGISTRY).filter((t) => t.category === 'mechanic');
    const statTraits = Object.values(TRAIT_REGISTRY).filter((t) => t.category === 'stat');
    const elementTraits = Object.values(TRAIT_REGISTRY).filter((t) => t.category === 'element');

    const derivedElem = getEquipmentElement(eq);
    const elemMap: Record<ElementType, { name: string; cls: string }> = {
      none: { name: '无属性 (墨色)', cls: 'we-elem-none' },
      wood: { name: '木属性 (翠墨 · 迅捷穿透)', cls: 'we-elem-wood' },
      fire: { name: '火属性 (赤焰 · 爆燃灼烧)', cls: 'we-elem-fire' },
      metal: { name: '金属性 (金芒 · 破甲锋锐)', cls: 'we-elem-metal' },
      earth: { name: '土属性 (岩黄 · 崩山厚重)', cls: 'we-elem-earth' },
      water: { name: '水属性 (幽碧 · 润物绵长)', cls: 'we-elem-water' },
    };
    const currentElemInfo = elemMap[derivedElem] || elemMap.none;

    form.innerHTML = `
      <!-- 1. 基础信息 Section -->
      <section class="we-section">
        <div class="we-section-title">
          <span>📜 基础信息与构字配方</span>
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
            <label class="we-label">组成字配方 (手动输入汉字，逗号隔开) <span>*</span></label>
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

      <!-- 2. 视觉形态、六大连招与外形拓片打点 Section -->
      <section class="we-section">
        <div class="we-section-title">
          <span>🎨 视觉形态、连招模组与兵刃拓片 (Sprite & Anchors)</span>
        </div>
        <div class="we-form-grid" style="grid-template-columns: 1.2fr 1fr;">
          <div class="we-form-field">
            <label class="we-label">兵刃形态 Shape (决定连招模组与动作特性)</label>
            <select id="eq-shape" class="we-select">
              <option value="刀" ${eq.shape === '刀' ? 'selected' : ''}>刀 (3 连击 · 均衡劈撩)</option>
              <option value="枪" ${eq.shape === '枪' ? 'selected' : ''}>枪 (4 连击 · 远距疾刺)</option>
              <option value="剑" ${eq.shape === '剑' ? 'selected' : ''}>剑 (5 连击 · 灵动连绵)</option>
              <option value="戟" ${eq.shape === '戟' ? 'selected' : ''}>戟 (3 连击 · 长柄横扫)</option>
              <option value="斧" ${eq.shape === '斧' ? 'selected' : ''}>斧 (2 连击 · 重型破阵)</option>
              <option value="弓" ${eq.shape === '弓' ? 'selected' : ''}>弓 (3 连射 · 远程贯通)</option>
              <option value="盾" ${eq.shape === '盾' ? 'selected' : ''}>盾 (坚固格挡 · 防御反震)</option>
            </select>
          </div>
          <div class="we-form-field">
            <label class="we-label">行属灵威 Element (由装配特性自动推导)</label>
            <div style="height: 38px; display: flex; align-items: center; padding: 0 12px; background: #121913; border: 1px solid #28372b; border-radius: 4px;">
              <span class="we-elem-badge ${currentElemInfo.cls}" style="font-size: 13px;">${currentElemInfo.name}</span>
              <span style="font-size: 12px; color: #849887; margin-left: 8px;">（添加五行特性即生效）</span>
            </div>
          </div>
        </div>

        <!-- Custom Sprite Upload & Interactive Anchors Editor -->
        <div style="margin-top: 16px; background: #151b16; border: 1px dashed #304033; border-radius: 6px; padding: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
            <span style="font-size: 13px; font-weight: bold; color: #dfc068;">🖼️ 自定义兵刃拓片与双锚点校准</span>
            <div style="display: flex; gap: 8px;">
              <input type="file" id="input-rubbing-file" accept="image/*" style="display:none;" />
              <button class="we-btn we-btn-sm we-btn-gold" id="btn-upload-rubbing">📤 上传外形图片</button>
              ${eq.visual?.imageDataUrl ? `<button class="we-btn we-btn-sm we-btn-danger" id="btn-remove-rubbing">✕ 清除贴图 (恢复水墨)</button>` : ''}
            </div>
          </div>

          ${eq.visual?.imageDataUrl ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px;">
              <!-- Interactive Pin Canvas -->
              <div>
                <div style="font-size: 11px; color: #a0b2a2; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                  <span>画板点选模式：</span>
                  <div style="display: flex; gap: 4px;">
                    <button class="we-btn we-btn-xs ${this.activeAnchorMode === 'grip' ? 'we-btn-gold' : 'we-btn-outline'}" id="btn-mode-grip">
                      🟢 握持点 [${Math.round((eq.visual?.gripAnchor?.x ?? 0.2) * 100)}%, ${Math.round((eq.visual?.gripAnchor?.y ?? 0.5) * 100)}%]
                    </button>
                    <button class="we-btn we-btn-xs ${this.activeAnchorMode === 'tip' ? 'we-btn-gold' : 'we-btn-outline'}" id="btn-mode-tip">
                      🔴 刃尖点 [${Math.round((eq.visual?.tipAnchor?.x ?? 0.95) * 100)}%, ${Math.round((eq.visual?.tipAnchor?.y ?? 0.5) * 100)}%]
                    </button>
                  </div>
                </div>
                <div style="background: #0d120e; border: 1px solid #28372b; border-radius: 4px; height: 160px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; cursor: crosshair;">
                  <canvas id="canvas-anchor-editor" width="300" height="150" style="width: 100%; height: 100%; object-fit: contain;"></canvas>
                </div>
                <div style="font-size: 10px; color: #728474; margin-top: 4px;">
                  提示：切换上方按钮后在图片上直接点击定位。绿色为手握持手柄点，红色为刀尖/发射点。
                </div>
              </div>

              <!-- Offset controls & Handheld preview -->
              <div>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                  <div class="we-form-field">
                    <label class="we-label">朝向旋转校准角: <b id="val-rot-deg" style="color:#dfc068;">${eq.visual?.rotationOffsetDeg ?? 0}°</b></label>
                    <div style="display: flex; gap: 6px; align-items: center;">
                      <input type="range" id="input-rot-deg" min="-180" max="180" step="5" value="${eq.visual?.rotationOffsetDeg ?? 0}" style="flex:1;" />
                      <button class="we-btn we-btn-xs we-btn-outline" id="btn-rot-0">0°</button>
                      <button class="we-btn we-btn-xs we-btn-outline" id="btn-rot-45">45°</button>
                      <button class="we-btn we-btn-xs we-btn-outline" id="btn-rot-90">90°</button>
                    </div>
                  </div>
                  <div class="we-form-field">
                    <label class="we-label">缩放倍率 Scale: <b id="val-scale" style="color:#dfc068;">${eq.visual?.scale ?? 1.0}x</b></label>
                    <input type="range" id="input-scale" min="0.4" max="2.5" step="0.1" value="${eq.visual?.scale ?? 1.0}" />
                  </div>
                  <!-- Character live holding preview -->
                  <div style="background: #101612; border: 1px solid #28372b; border-radius: 4px; height: 80px; display: flex; align-items: center; justify-content: center; position: relative;">
                    <span style="position: absolute; top: 4px; left: 8px; font-size: 10px; color: #627564;">角色手持姿势预览</span>
                    <canvas id="canvas-character-preview" width="240" height="76"></canvas>
                  </div>
                </div>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 20px; color: #728474; font-size: 12px;">
              当前使用<strong>程序化水墨矢量</strong>表现。点击右上角【上传外形图片】可上传自定义拓片并可视化设置握持与刃尖锚点。
            </div>
          `}
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
              <input type="number" id="stat-damage" class="we-input" value="${stats.damage ?? 15}" min="1" max="999" />
            </div>
            <div class="we-form-field">
              <label class="we-label">攻击速度倍率 AttackSpeed</label>
              <input type="number" id="stat-speed" class="we-input" step="0.05" value="${stats.attackSpeed ?? 1.0}" min="0.2" max="3.0" />
            </div>
            <div class="we-form-field">
              <label class="we-label">攻击距离 Range (px)</label>
              <input type="number" id="stat-range" class="we-input" value="${stats.range ?? 120}" min="30" max="1000" />
            </div>
            <div class="we-form-field">
              <label class="we-label">基础击退 Knockback</label>
              <input type="number" id="stat-knockback" class="we-input" value="${stats.knockback ?? 120}" min="0" max="600" />
            </div>
            <div class="we-form-field" id="field-proj-speed" style="${eq.shape === '弓' || eq.type === 'ranged' ? '' : 'display:none;'}">
              <label class="we-label">弹道飞行速度 ProjectileSpeed</label>
              <input type="number" id="stat-projspeed" class="we-input" value="${stats.projectileSpeed ?? 580}" min="100" max="2000" />
            </div>
          `
              : `
            <div class="we-form-field">
              <label class="we-label">受创减伤率 DamageReduction (%)</label>
              <input type="number" id="stat-reduction" class="we-input" value="${Math.round((stats.damageReduction ?? 0.3) * 100)}" min="0" max="90" />
            </div>
            <div class="we-form-field">
              <label class="we-label">额外生命上限 Bonus HP</label>
              <input type="number" id="stat-bonushp" class="we-input" value="${stats.bonusHp ?? 30}" min="0" max="500" />
            </div>
            <div class="we-form-field">
              <label class="we-label">反弹冲击 Knockback</label>
              <input type="number" id="stat-knockback" class="we-input" value="${stats.knockback ?? 180}" min="0" max="600" />
            </div>
          `
          }
        </div>
      </section>

      <!-- 4. 一切皆特性：法则特性装配 Section -->
      <section class="we-section">
        <div class="we-section-title">
          <span>✨ 统一特性装配 (Everything is a Trait)</span>
          <span style="font-size: 11px; font-weight: normal; color: #8e9e8f; margin-left: auto;">
            所有机制、数值与五行行属均作为特性统一装配与调节
          </span>
        </div>

        <!-- Available Traits Pool (Categorized) -->
        <div style="margin-bottom: 12px;">
          <div style="font-size: 12px; color: #dfc068; margin-bottom: 6px; font-weight: bold;">⚡ 机制特性 (点击装配):</div>
          <div class="we-trait-pool" id="trait-pool-mechanic">
            ${mechanicsTraits.map((t) => `
              <button class="we-trait-btn" data-trait-id="${t.id}" title="${t.summary}">
                <span>${t.icon}</span>
                <span>${t.name}</span>
                <span style="color:#d0b466; font-size:11px;">+</span>
              </button>
            `).join('')}
          </div>

          <div style="font-size: 12px; color: #6be3ff; margin-bottom: 6px; font-weight: bold;">🗡️ 数值特性 (点击装配):</div>
          <div class="we-trait-pool" id="trait-pool-stat">
            ${statTraits.map((t) => `
              <button class="we-trait-btn" data-trait-id="${t.id}" title="${t.summary}">
                <span>${t.icon}</span>
                <span>${t.name}</span>
                <span style="color:#6be3ff; font-size:11px;">+</span>
              </button>
            `).join('')}
          </div>

          <div style="font-size: 12px; color: #72e08e; margin-bottom: 6px; font-weight: bold;">🌿 五行属性特性 (点击装配):</div>
          <div class="we-trait-pool" id="trait-pool-element">
            ${elementTraits.map((t) => `
              <button class="we-trait-btn" data-trait-id="${t.id}" title="${t.summary}">
                <span>${t.icon}</span>
                <span>${t.name}</span>
                <span style="color:#72e08e; font-size:11px;">+</span>
              </button>
            `).join('')}
          </div>
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
                当前尚未装配任何特性，请在上方特性库中点击选择添加。
              </div>
            `
          }
        </div>
      </section>
    `;

    this.bindFormEvents(eq);
    if (eq.visual?.imageDataUrl) {
      this.initVisualCanvases(eq);
    }
  }

  private initVisualCanvases(eq: CompoundEquipment): void {
    const dataUrl = eq.visual?.imageDataUrl;
    if (!dataUrl) return;

    let img = this.imageCache.get(dataUrl);
    if (!img) {
      img = new Image();
      img.onload = () => {
        this.imageCache.set(dataUrl, img!);
        this.drawAnchorCanvas(eq);
        this.drawCharacterPreview(eq);
      };
      img.src = dataUrl;
    } else {
      this.drawAnchorCanvas(eq);
      this.drawCharacterPreview(eq);
    }
  }

  private drawAnchorCanvas(eq: CompoundEquipment): void {
    const canvas = document.getElementById('canvas-anchor-editor') as HTMLCanvasElement;
    if (!canvas || !eq.visual?.imageDataUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = this.imageCache.get(eq.visual.imageDataUrl);
    if (!img || !img.complete) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Draw dark grid background
    ctx.fillStyle = '#0a0e0b';
    ctx.fillRect(0, 0, cw, ch);
    ctx.strokeStyle = '#18241b';
    ctx.lineWidth = 1;
    for (let x = 0; x < cw; x += 15) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ch);
      ctx.stroke();
    }
    for (let y = 0; y < ch; y += 15) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cw, y);
      ctx.stroke();
    }

    // Fit image inside canvas with padding
    const pad = 20;
    const maxW = cw - pad * 2;
    const maxH = ch - pad * 2;
    const scale = Math.min(maxW / img.width, maxH / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const drawX = (cw - drawW) / 2;
    const drawY = (ch - drawH) / 2;

    // Draw sprite image
    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // Draw image border
    ctx.strokeStyle = '#354838';
    ctx.strokeRect(drawX, drawY, drawW, drawH);

    // Draw Grip Point (🟢 Green)
    const grip = eq.visual.gripAnchor || { x: 0.2, y: 0.5 };
    const gx = drawX + grip.x * drawW;
    const gy = drawY + grip.y * drawH;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx, gy, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(gx, gy, 3, 0, Math.PI * 2);
    ctx.fill();
    // Crosshair
    ctx.beginPath();
    ctx.moveTo(gx - 12, gy); ctx.lineTo(gx + 12, gy);
    ctx.moveTo(gx, gy - 12); ctx.lineTo(gx, gy + 12);
    ctx.stroke();

    // Draw Tip Point (🔴 Red)
    const tip = eq.visual.tipAnchor || { x: 0.95, y: 0.5 };
    const tx = drawX + tip.x * drawW;
    const ty = drawY + tip.y * drawH;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(tx, ty, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(tx, ty, 3, 0, Math.PI * 2);
    ctx.fill();
    // Crosshair
    ctx.beginPath();
    ctx.moveTo(tx - 12, ty); ctx.lineTo(tx + 12, ty);
    ctx.moveTo(tx, ty - 12); ctx.lineTo(tx, ty + 12);
    ctx.stroke();

    // Connecting line
    ctx.strokeStyle = 'rgba(217, 192, 104, 0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(gx, gy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawCharacterPreview(eq: CompoundEquipment): void {
    const canvas = document.getElementById('canvas-character-preview') as HTMLCanvasElement;
    if (!canvas || !eq.visual?.imageDataUrl) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = this.imageCache.get(eq.visual.imageDataUrl);
    if (!img || !img.complete) return;

    const cw = canvas.width;
    const ch = canvas.height;
    ctx.clearRect(0, 0, cw, ch);

    // Dark background
    ctx.fillStyle = '#101612';
    ctx.fillRect(0, 0, cw, ch);

    const charX = 70;
    const charY = ch / 2;

    // Draw shadow
    ctx.fillStyle = 'rgba(10, 14, 11, 0.5)';
    ctx.beginPath();
    ctx.ellipse(charX, charY + 16, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw character body circle
    ctx.fillStyle = '#243226';
    ctx.strokeStyle = '#d2c6ab';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(charX, charY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Facing red dot
    ctx.fillStyle = '#e26a54';
    ctx.beginPath();
    ctx.arc(charX + 11, charY - 3, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // '人' Text
    ctx.fillStyle = '#ede3ce';
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('人', charX, charY);

    // Hand position relative to character
    const handX = charX + 14;
    const handY = charY + 2;

    // Draw weapon sprite attached at hand
    ctx.save();
    ctx.translate(handX, handY);

    // Base resting angle + user rotation offset
    const userRotDeg = eq.visual.rotationOffsetDeg || 0;
    const restAngle = (-25 + userRotDeg) * (Math.PI / 180);
    ctx.rotate(restAngle);

    const scale = (eq.visual.scale || 1.0) * 0.45; // scale down for preview
    const grip = eq.visual.gripAnchor || { x: 0.2, y: 0.5 };
    const w = img.width * scale;
    const h = img.height * scale;

    ctx.drawImage(img, -grip.x * w, -grip.y * h, w, h);
    ctx.restore();
  }

  private bindFormEvents(eq: CompoundEquipment): void {
    const isWeapon = eq.category === 'weapon';

    // ID
    const idInput = document.getElementById('eq-id') as HTMLInputElement;
    idInput?.addEventListener('change', () => {
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

    // Weapon Shape (determines combo module and action type)
    const shapeSelect = document.getElementById('eq-shape') as HTMLSelectElement;
    shapeSelect?.addEventListener('change', () => {
      eq.shape = shapeSelect.value as WeaponShape;
      eq.type = getEquipmentActionType(eq.shape);
      const projSpeedField = document.getElementById('field-proj-speed');
      if (projSpeedField) {
        projSpeedField.style.display = eq.shape === '弓' ? '' : 'none';
      }
      this.saveData();
      this.updateLeftList();
      this.updateJsonViewer();
    });

    // --- Image Upload & Anchor Events ---
    const btnUpload = document.getElementById('btn-upload-rubbing');
    const inputRubbingFile = document.getElementById('input-rubbing-file') as HTMLInputElement;
    btnUpload?.addEventListener('click', () => {
      inputRubbingFile?.click();
    });

    inputRubbingFile?.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (!eq.visual) {
          eq.visual = {
            gripAnchor: { x: 0.2, y: 0.5 },
            tipAnchor: { x: 0.95, y: 0.5 },
            rotationOffsetDeg: 0,
            scale: 1.0,
          };
        }
        eq.visual.imageDataUrl = dataUrl;
        this.saveData();
        this.renderSelectedForm();
        this.updateJsonViewer();
        this.showToast('✓ 兵刃拓片上传成功！已开启双锚点定位。');
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-remove-rubbing')?.addEventListener('click', () => {
      if (confirm('确认清除当前外形拓片并恢复程序化水墨表现吗？')) {
        eq.visual = undefined;
        this.saveData();
        this.renderSelectedForm();
        this.updateJsonViewer();
        this.showToast('已恢复程序化矢量水墨渲染。');
      }
    });

    // Anchor mode toggle
    const btnGrip = document.getElementById('btn-mode-grip');
    const btnTip = document.getElementById('btn-mode-tip');
    btnGrip?.addEventListener('click', () => {
      this.activeAnchorMode = 'grip';
      btnGrip.className = 'we-btn we-btn-xs we-btn-gold';
      if (btnTip) btnTip.className = 'we-btn we-btn-xs we-btn-outline';
    });
    btnTip?.addEventListener('click', () => {
      this.activeAnchorMode = 'tip';
      btnTip.className = 'we-btn we-btn-xs we-btn-gold';
      if (btnGrip) btnGrip.className = 'we-btn we-btn-xs we-btn-outline';
    });

    // Anchor canvas click to set point
    const canvasEditor = document.getElementById('canvas-anchor-editor') as HTMLCanvasElement;
    canvasEditor?.addEventListener('click', (e) => {
      if (!eq.visual?.imageDataUrl) return;
      const img = this.imageCache.get(eq.visual.imageDataUrl);
      if (!img || !img.complete) return;

      const rect = canvasEditor.getBoundingClientRect();
      const scaleX = canvasEditor.width / rect.width;
      const scaleY = canvasEditor.height / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX;
      const clickY = (e.clientY - rect.top) * scaleY;

      const pad = 20;
      const maxW = canvasEditor.width - pad * 2;
      const maxH = canvasEditor.height - pad * 2;
      const scale = Math.min(maxW / img.width, maxH / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const drawX = (canvasEditor.width - drawW) / 2;
      const drawY = (canvasEditor.height - drawH) / 2;

      // Calculate normalized relative coords [0.0 ~ 1.0]
      const relX = Math.max(0, Math.min(1, (clickX - drawX) / drawW));
      const relY = Math.max(0, Math.min(1, (clickY - drawY) / drawH));

      if (this.activeAnchorMode === 'grip') {
        eq.visual.gripAnchor = { x: Math.round(relX * 100) / 100, y: Math.round(relY * 100) / 100 };
      } else {
        eq.visual.tipAnchor = { x: Math.round(relX * 100) / 100, y: Math.round(relY * 100) / 100 };
      }

      this.saveData();
      this.renderSelectedForm();
      this.updateJsonViewer();
    });

    // Rotation Offset slider and preset buttons
    const rotInput = document.getElementById('input-rot-deg') as HTMLInputElement;
    const rotValEl = document.getElementById('val-rot-deg');
    rotInput?.addEventListener('input', () => {
      if (!eq.visual) return;
      const deg = Number(rotInput.value);
      eq.visual.rotationOffsetDeg = deg;
      if (rotValEl) rotValEl.textContent = `${deg}°`;
      this.drawCharacterPreview(eq);
      this.saveData();
      this.updateJsonViewer();
    });

    document.getElementById('btn-rot-0')?.addEventListener('click', () => {
      if (!eq.visual) return;
      eq.visual.rotationOffsetDeg = 0;
      if (rotInput) rotInput.value = '0';
      if (rotValEl) rotValEl.textContent = '0°';
      this.drawCharacterPreview(eq);
      this.saveData();
      this.updateJsonViewer();
    });
    document.getElementById('btn-rot-45')?.addEventListener('click', () => {
      if (!eq.visual) return;
      eq.visual.rotationOffsetDeg = 45;
      if (rotInput) rotInput.value = '45';
      if (rotValEl) rotValEl.textContent = '45°';
      this.drawCharacterPreview(eq);
      this.saveData();
      this.updateJsonViewer();
    });
    document.getElementById('btn-rot-90')?.addEventListener('click', () => {
      if (!eq.visual) return;
      eq.visual.rotationOffsetDeg = 90;
      if (rotInput) rotInput.value = '90';
      if (rotValEl) rotValEl.textContent = '90°';
      this.drawCharacterPreview(eq);
      this.saveData();
      this.updateJsonViewer();
    });

    // Scale slider
    const scaleInput = document.getElementById('input-scale') as HTMLInputElement;
    const scaleValEl = document.getElementById('val-scale');
    scaleInput?.addEventListener('input', () => {
      if (!eq.visual) return;
      const s = Number(scaleInput.value);
      eq.visual.scale = s;
      if (scaleValEl) scaleValEl.textContent = `${s}x`;
      this.drawCharacterPreview(eq);
      this.saveData();
      this.updateJsonViewer();
    });

    // --- Base Stats sync with Traits ---
    if (!eq.baseStats) eq.baseStats = {};
    if (isWeapon) {
      const dmg = document.getElementById('stat-damage') as HTMLInputElement;
      dmg?.addEventListener('input', () => {
        const val = Number(dmg.value) || 0;
        eq.baseStats!.damage = val;
        this.syncTraitParam(eq, 'damage', 'value', val);
        this.saveData();
        this.updateJsonViewer();
      });

      const spd = document.getElementById('stat-speed') as HTMLInputElement;
      spd?.addEventListener('input', () => {
        const val = Number(spd.value) || 1.0;
        eq.baseStats!.attackSpeed = val;
        this.syncTraitParam(eq, 'attackSpeed', 'value', val);
        this.saveData();
        this.updateJsonViewer();
      });

      const rng = document.getElementById('stat-range') as HTMLInputElement;
      rng?.addEventListener('input', () => {
        const val = Number(rng.value) || 120;
        eq.baseStats!.range = val;
        this.syncTraitParam(eq, 'range', 'value', val);
        this.saveData();
        this.updateJsonViewer();
      });

      const kb = document.getElementById('stat-knockback') as HTMLInputElement;
      kb?.addEventListener('input', () => {
        const val = Number(kb.value) || 100;
        eq.baseStats!.knockback = val;
        this.syncTraitParam(eq, 'knockback', 'force', val);
        this.saveData();
        this.updateJsonViewer();
      });

      const ps = document.getElementById('stat-projspeed') as HTMLInputElement;
      ps?.addEventListener('input', () => {
        const val = Number(ps.value) || 580;
        eq.baseStats!.projectileSpeed = val;
        this.syncTraitParam(eq, 'projectileSpeed', 'value', val);
        this.saveData();
        this.updateJsonViewer();
      });
    } else {
      const red = document.getElementById('stat-reduction') as HTMLInputElement;
      red?.addEventListener('input', () => {
        const val = Number(red.value) || 0;
        eq.baseStats!.damageReduction = val / 100;
        this.syncTraitParam(eq, 'damageReduction', 'value', val);
        this.saveData();
        this.updateJsonViewer();
      });

      const hp = document.getElementById('stat-bonushp') as HTMLInputElement;
      hp?.addEventListener('input', () => {
        const val = Number(hp.value) || 0;
        eq.baseStats!.bonusHp = val;
        this.syncTraitParam(eq, 'bonusHp', 'value', val);
        this.saveData();
        this.updateJsonViewer();
      });

      const kb = document.getElementById('stat-knockback') as HTMLInputElement;
      kb?.addEventListener('input', () => {
        const val = Number(kb.value) || 100;
        eq.baseStats!.knockback = val;
        this.syncTraitParam(eq, 'knockback', 'force', val);
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

  private syncTraitParam(eq: CompoundEquipment, traitId: TraitId, key: string, val: number): void {
    if (!eq.traits) eq.traits = [];
    const trait = eq.traits.find((t) => t.traitId === traitId);
    if (trait) {
      trait.params[key] = val;
    } else {
      const meta = TRAIT_REGISTRY[traitId];
      if (meta) {
        eq.traits.push({
          traitId,
          name: meta.name,
          params: { [key]: val },
        });
      }
    }
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
