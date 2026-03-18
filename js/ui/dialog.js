import { eventBus } from '../core/events.js';
import { getState, setDialog } from '../core/state.js';
import { escapeHtml } from '../core/format.js';

export class Dialog {
  constructor() {
    this.overlay = document.getElementById('dialog-overlay');
    this._currentResolve = null;

    eventBus.on('dialog:changed', (state) => this._render(state));
    eventBus.on('dialog:confirm', () => this._confirm());
    eventBus.on('dialog:cancel', () => this._cancel());

    // Click overlay to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this._cancel();
    });
  }

  // Show alert dialog, returns Promise<void>
  alert(title, message) {
    return new Promise(resolve => {
      this._currentResolve = () => resolve();
      setDialog({ type: 'alert', title, message });
    });
  }

  // Show confirm dialog, returns Promise<boolean>
  confirm(title, message) {
    return new Promise(resolve => {
      this._currentResolve = (val) => resolve(val);
      setDialog({ type: 'confirm', title, message });
    });
  }

  // Show prompt dialog, returns Promise<string|null>
  prompt(title, message, defaultValue = '') {
    return new Promise(resolve => {
      this._currentResolve = (val) => resolve(val);
      setDialog({ type: 'prompt', title, message, defaultValue });
    });
  }

  // Show progress dialog (no buttons, caller closes it)
  showProgress(title, message) {
    setDialog({ type: 'progress', title, message });
  }

  updateProgress(message) {
    const state = getState();
    if (state.dialog && state.dialog.type === 'progress') {
      const msgEl = this.overlay.querySelector('.dialog-message');
      if (msgEl) msgEl.textContent = message;
    }
  }

  close() {
    setDialog(null);
    this._currentResolve = null;
  }

  _render(state) {
    if (!state) {
      this.overlay.classList.add('hidden');
      return;
    }

    this.overlay.classList.remove('hidden');

    let buttonsHtml = '';
    let bodyHtml = `<div class="dialog-message">${escapeHtml(state.message || '')}</div>`;

    switch (state.type) {
      case 'alert':
        buttonsHtml = `<button class="dialog-btn dialog-btn-ok" data-action="confirm">OK</button>`;
        break;
      case 'confirm':
        buttonsHtml = `
          <button class="dialog-btn dialog-btn-ok" data-action="confirm">Yes</button>
          <button class="dialog-btn dialog-btn-cancel" data-action="cancel">No</button>`;
        break;
      case 'prompt':
        bodyHtml += `<input type="text" class="dialog-input" value="${escapeHtml(state.defaultValue || '')}" />`;
        buttonsHtml = `
          <button class="dialog-btn dialog-btn-ok" data-action="confirm">OK</button>
          <button class="dialog-btn dialog-btn-cancel" data-action="cancel">Cancel</button>`;
        break;
      case 'progress':
        bodyHtml += `<div class="dialog-progress"><div class="progress-spinner"></div></div>`;
        break;
    }

    this.overlay.innerHTML = `
      <div class="dialog">
        <div class="dialog-title">${escapeHtml(state.title || '')}</div>
        <div class="dialog-body">${bodyHtml}</div>
        ${buttonsHtml ? `<div class="dialog-buttons">${buttonsHtml}</div>` : ''}
      </div>
    `;

    // Focus input or OK button
    const input = this.overlay.querySelector('.dialog-input');
    const okBtn = this.overlay.querySelector('.dialog-btn-ok');
    if (input) {
      input.focus();
      input.select();
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this._confirm();
        if (e.key === 'Escape') this._cancel();
      });
    } else if (okBtn) {
      okBtn.focus();
    }

    // Button click handlers
    this.overlay.querySelectorAll('.dialog-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.action === 'confirm') this._confirm();
        else this._cancel();
      });
    });
  }

  _confirm() {
    const state = getState();
    if (!state.dialog) return;

    if (this._currentResolve) {
      if (state.dialog.type === 'prompt') {
        const input = this.overlay.querySelector('.dialog-input');
        this._currentResolve(input ? input.value : '');
      } else if (state.dialog.type === 'confirm') {
        this._currentResolve(true);
      } else {
        this._currentResolve();
      }
    }
    this.close();
  }

  _cancel() {
    if (this._currentResolve) {
      const state = getState();
      if (state.dialog && state.dialog.type === 'confirm') {
        this._currentResolve(false);
      } else if (state.dialog && state.dialog.type === 'prompt') {
        this._currentResolve(null);
      } else {
        this._currentResolve();
      }
    }
    this.close();
  }
}
