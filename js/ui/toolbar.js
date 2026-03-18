import { eventBus } from '../core/events.js';

const BUTTONS = [
  { key: 'F1', label: 'Help', event: 'help:show' },
  { key: 'F2', label: 'Rename', event: 'operation:rename' },
  { key: 'F3', label: 'View', event: 'operation:view' },
  { key: 'F4', label: 'Edit', event: 'operation:edit' },
  { key: 'F5', label: 'Copy', event: 'operation:copy' },
  { key: 'F6', label: 'Move', event: 'operation:move' },
  { key: 'F7', label: 'MkDir', event: 'operation:mkdir' },
  { key: 'F8', label: 'Delete', event: 'operation:delete' },
  { key: 'F9', label: 'Menu', event: 'operation:menu' },
  { key: 'F10', label: 'Quit', event: 'operation:quit' },
];

export class Toolbar {
  constructor() {
    this.el = document.getElementById('toolbar');
    this._render();
  }

  _render() {
    this.el.innerHTML = BUTTONS.map(btn =>
      `<button class="toolbar-btn" data-event="${btn.event}" title="${btn.key} ${btn.label}">
        <span class="btn-key">${btn.key}</span><span class="btn-label">${btn.label}</span>
      </button>`
    ).join('');

    this.el.addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (!btn) return;
      eventBus.emit(btn.dataset.event);
    });
  }
}
