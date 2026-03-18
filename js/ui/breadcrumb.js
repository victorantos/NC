import { eventBus } from '../core/events.js';
import { getPanelState } from '../core/state.js';
import { escapeHtml } from '../core/format.js';

export class Breadcrumb {
  constructor(panelId) {
    this.panelId = panelId;
    this.el = document.querySelector(`.breadcrumb[data-panel="${panelId}"]`);
    this._bindEvents();
  }

  _bindEvents() {
    this.el.addEventListener('click', (e) => {
      const segment = e.target.closest('.breadcrumb-segment');
      if (!segment) return;
      const path = segment.dataset.path;
      eventBus.emit('navigate:to', { panelId: this.panelId, path });
    });
  }

  render() {
    const ps = getPanelState(this.panelId);
    const path = ps.path;
    const adapterName = ps.adapter ? ps.adapter.getRootName() : 'FS';

    let html = `<span class="breadcrumb-segment breadcrumb-root" data-path="/">${escapeHtml(adapterName)}</span>`;

    if (path !== '/') {
      const segments = path.split('/').filter(Boolean);
      let currentPath = '';
      for (const seg of segments) {
        currentPath += '/' + seg;
        html += `<span class="breadcrumb-separator">/</span>`;
        html += `<span class="breadcrumb-segment" data-path="${escapeHtml(currentPath)}">${escapeHtml(seg)}</span>`;
      }
    }

    this.el.innerHTML = html;
  }
}
