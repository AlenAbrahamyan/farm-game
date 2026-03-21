import { state, PRICES, saveGame } from '../state.js';

export class ShopPanel {
  constructor(animalPen, farmGrid) {
    this._pen = animalPen;
    this._grid = farmGrid;

    this._panel = document.getElementById('shop-panel');
    this._fab = document.getElementById('shop-fab');
    this._closeBtn = document.getElementById('shop-close');
    this._expandBtn = document.getElementById('btn-expand');
    this._expandDesc = document.getElementById('expand-desc');

    this._setupTabs();
    this._setupButtons();
    this._pendingCrop = null;
    this._pendingPlotState = null;
  }

  _setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(`tab-${tab.dataset.tab}`)?.classList.remove('hidden');
      });
    });
  }

  _setupButtons() {
    this._fab.addEventListener('click', () => this.open());
    this._closeBtn.addEventListener('click', () => this.close());

    document.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.buy;
        const cost = parseInt(btn.dataset.cost, 10);
        this._handleBuy(type, cost, btn);
      });
    });

    this._expandBtn?.addEventListener('click', () => this._handleExpand());

    this._updateExpandUI();
  }

  _handleBuy(type, cost, btn) {
    if (state.coins < cost) {
      window._hud?.toast(`Need ${cost} 🪙 to buy ${type}!`, 'error');
      return;
    }

    if (type === 'chicken' || type === 'cow') {
      state.coins -= cost;
      this._pen.addAnimal(type);
      window._hud?.toast(`Bought a ${type}! 🐾`);
      window._hud?.refresh();
      saveGame();
    } else {
      window._hud?.toast(`Select a plot to plant ${type}!`, 'warn');
      this.close();
    }
  }

  _handleExpand() {
    const size = state.gridSize;
    const cost = size === 3 ? PRICES.expand_4 : size === 4 ? PRICES.expand_5 : 0;
    if (cost === 0) {
      window._hud?.toast('Farm is already at maximum size!', 'warn');
      return;
    }
    if (state.coins < cost) {
      window._hud?.toast(`Need ${cost} 🪙 to expand!`, 'error');
      return;
    }
    state.coins -= cost;
    this._grid.expandGrid();
    window._hud?.toast(`Farm expanded to ${state.gridSize}×${state.gridSize}!`);
    window._hud?.refresh();
    this._updateExpandUI();
  }

  _updateExpandUI() {
    const size = state.gridSize;
    if (size >= 5) {
      this._expandDesc.textContent = 'Farm is at maximum size!';
      if (this._expandBtn) {
        this._expandBtn.textContent = 'Max size';
        this._expandBtn.disabled = true;
      }
    } else {
      const nextSize = size + 1;
      const cost = size === 3 ? PRICES.expand_4 : PRICES.expand_5;
      this._expandDesc.textContent = `Grow to ${nextSize}×${nextSize} grid`;
      if (this._expandBtn) {
        this._expandBtn.textContent = `${cost} 🪙`;
        this._expandBtn.dataset.cost = cost;
        this._expandBtn.disabled = false;
      }
    }
  }

  open(tab = 'animals') {
    this._panel.classList.remove('hidden');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelector(`.tab[data-tab="${tab}"]`)?.classList.add('active');
    document.getElementById(`tab-${tab}`)?.classList.remove('hidden');
    this._updateExpandUI();
  }

  close() {
    this._panel.classList.add('hidden');
  }

  isOpen() {
    return !this._panel.classList.contains('hidden');
  }
}
