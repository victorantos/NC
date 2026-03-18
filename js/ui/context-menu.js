import { eventBus } from '../core/events.js';
import { getState, setContextMenu } from '../core/state.js';

const MENU_ITEMS = [
  { label: 'View (F3)', event: 'operation:view' },
  { label: 'Edit (F4)', event: 'operation:edit' },
  { separator: true },
  { label: 'Copy (F5)', event: 'operation:copy' },
  { label: 'Move (F6)', event: 'operation:move' },
  { label: 'Rename (F2)', event: 'operation:rename' },
  { separator: true },
  { label: 'New Folder (F7)', event: 'operation:mkdir' },
  { separator: true },
  { label: 'Delete (F8)', event: 'operation:delete' },
];

export class ContextMenu {
  constructor() {
    this.el = document.getElementById('context-menu');

    eventBus.on('contextmenu:changed', (state) => this._render(state));
    eventBus.on('contextmenu:show', (data) => this._show(data));
    eventBus.on('contextmenu:close', () => this._close());

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.el.contains(e.target)) {
        this._close();
      }
    });

    // Close on scroll
    document.addEventListener('scroll', () => this._close(), true);
  }

  _show(data) {
    setContextMenu(data);
  }

  _close() {
    setContextMenu(null);
  }

  _render(state) {
    if (!state) {
      this.el.classList.add('hidden');
      return;
    }

    this.el.classList.remove('hidden');
    this.el.innerHTML = MENU_ITEMS.map(item => {
      if (item.separator) return '<div class="context-menu-separator"></div>';
      return `<div class="context-menu-item" data-event="${item.event}">${item.label}</div>`;
    }).join('');

    // Position menu
    const rect = this.el.getBoundingClientRect();
    let x = state.x;
    let y = state.y;

    // Keep within viewport
    if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 5;
    if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 5;

    this.el.style.left = x + 'px';
    this.el.style.top = y + 'px';

    // Click handlers
    this.el.querySelectorAll('.context-menu-item').forEach(item => {
      item.addEventListener('click', () => {
        eventBus.emit(item.dataset.event);
        this._close();
      });
    });
  }
}
