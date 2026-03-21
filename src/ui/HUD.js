import { state } from '../state.js';

export class HUD {
  constructor() {
    this._coinEl = document.getElementById('coin-count');
    this._timeEl = document.getElementById('time-count');
    this._toastContainer = document.getElementById('toast-container');
    this.refresh();
  }

  refresh() {
    this._coinEl.textContent = state.coins;
    this._timeEl.textContent = `Day ${state.day}`;

    this._coinEl.classList.remove('coin-bounce');
    void this._coinEl.offsetWidth;
    this._coinEl.classList.add('coin-bounce');
  }

  toast(message, type = 'info') {
    const div = document.createElement('div');
    div.className = `toast${type !== 'info' ? ' ' + type : ''}`;
    div.textContent = message;
    this._toastContainer.appendChild(div);

    setTimeout(() => {
      div.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => div.remove(), 300);
    }, 2500);

    const toasts = this._toastContainer.querySelectorAll('.toast');
    if (toasts.length > 4) toasts[0].remove();
  }

  update() {
  }
}
