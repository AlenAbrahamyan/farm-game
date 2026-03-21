import { state, PRODUCE_ICONS, SELL_PRICES, saveGame } from '../state.js';

const ALL_ITEMS = ['egg', 'milk', 'carrot', 'corn', 'strawberry'];

export class InventoryPanel {
  constructor(marketStall) {
    this._market = marketStall;
    this._itemsEl = document.getElementById('inventory-items');
    this._marketBtn = document.getElementById('market-btn');
    this._marketModal = document.getElementById('market-modal');
    this._marketItemsEl = document.getElementById('market-items');
    this._marketClose = document.getElementById('market-close');

    this._marketBtn.addEventListener('click', () => this._openMarket());
    this._marketClose.addEventListener('click', () => this._closeMarket());

    this._marketModal.addEventListener('click', (e) => {
      if (e.target === this._marketModal) this._closeMarket();
    });

    this.refresh();
  }

  refresh() {
    this._renderInventoryStrip();
  }

  _renderInventoryStrip() {
    this._itemsEl.innerHTML = '';
    for (const item of ALL_ITEMS) {
      const count = (state.inventory[item] || 0) + (state.market.available[item] || 0);
      if (count === 0) continue;

      const slot = document.createElement('div');
      slot.className = `inv-slot${count > 0 ? ' has-items' : ''}`;
      slot.innerHTML = `<span class="inv-icon">${PRODUCE_ICONS[item]}</span><span>${count}</span>`;

      const invCount = state.inventory[item] || 0;
      const listedCount = state.market.available[item] || 0;
      slot.title = `${item}: ${invCount} in storage, ${listedCount} listed for sale`;

      this._itemsEl.appendChild(slot);
    }
  }

  _openMarket() {
    this._renderMarketModal();
    this._marketModal.classList.remove('hidden');
  }

  _closeMarket() {
    this._marketModal.classList.add('hidden');
  }

  _renderMarketModal() {
    this._marketItemsEl.innerHTML = '';

    for (const item of ALL_ITEMS) {
      const invCount = state.inventory[item] || 0;
      const listedCount = state.market.available[item] || 0;
      const totalCount = invCount + listedCount;

      if (totalCount === 0) continue;

      const row = document.createElement('div');
      row.className = 'market-row';

      const price = SELL_PRICES[item] || 5;
      row.innerHTML = `
        <span class="m-icon">${PRODUCE_ICONS[item]}</span>
        <div>
          <div class="m-name">${this._capitalize(item)}</div>
          <div style="color:rgba(255,255,255,0.4);font-size:11px">Sells for ${price} 🪙 each</div>
        </div>
        <span class="m-count">×${invCount} in storage</span>
        ${listedCount > 0
          ? `<span class="listed-badge">✓ ${listedCount} listed</span>`
          : `<button class="btn-list" data-item="${item}" ${invCount === 0 ? 'disabled' : ''}>List All</button>`
        }
      `;

      const btn = row.querySelector('.btn-list');
      if (btn) {
        btn.addEventListener('click', () => {
          if (invCount > 0) {
            this._market.listForSale(item, invCount);
            window._hud?.toast(`Listed ${invCount}× ${PRODUCE_ICONS[item]} for sale!`);
            window._hud?.refresh();
            this._renderMarketModal();
            this.refresh();
          }
        });
      }

      this._marketItemsEl.appendChild(row);
    }

    if (this._marketItemsEl.children.length === 0) {
      this._marketItemsEl.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">No items to sell yet.<br>Grow crops or collect animal produce first!</p>';
    }
  }

  _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  update() {
    this.refresh();
  }
}
