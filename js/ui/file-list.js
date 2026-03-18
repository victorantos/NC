import { eventBus } from '../core/events.js';
import { getPanelState, getActivePanelId, setState } from '../core/state.js';
import { formatFileSize, formatDate, getExtension, escapeHtml } from '../core/format.js';
import { sortEntries } from '../core/sort.js';

export class FileList {
  constructor(panelId) {
    this.panelId = panelId;
    this.el = document.querySelector(`.file-list[data-panel="${panelId}"]`);
    this.headerEl = document.querySelector(`.file-list-header[data-panel="${panelId}"]`);
    this._lastClickTime = 0;
    this._lastClickIndex = -1;
    this._bindEvents();
  }

  _bindEvents() {
    // Click on file entries
    this.el.addEventListener('click', (e) => {
      const entry = e.target.closest('.file-entry');
      if (!entry) return;
      const index = parseInt(entry.dataset.index, 10);

      // Focus this panel
      if (getActivePanelId() !== this.panelId) {
        import('../core/state.js').then(m => m.setActivePanel(this.panelId));
      }

      // Double-click detection
      const now = Date.now();
      if (index === this._lastClickIndex && (now - this._lastClickTime) < 350) {
        eventBus.emit('entry:open', this.panelId);
        this._lastClickTime = 0;
        return;
      }
      this._lastClickTime = now;
      this._lastClickIndex = index;

      // Set cursor
      setState(this.panelId, { cursor: index });
    });

    // Right-click context menu
    this.el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const entry = e.target.closest('.file-entry');
      if (entry) {
        const index = parseInt(entry.dataset.index, 10);
        setState(this.panelId, { cursor: index });
      }
      eventBus.emit('contextmenu:show', {
        x: e.clientX,
        y: e.clientY,
        panelId: this.panelId
      });
    });

    // Column header clicks for sorting
    this.headerEl.addEventListener('click', (e) => {
      const header = e.target.closest('.col-header');
      if (!header) return;
      const field = header.dataset.sort;
      const ps = getPanelState(this.panelId);
      const ascending = ps.sortField === field ? !ps.sortAsc : true;
      setState(this.panelId, { sortField: field, sortAsc: ascending });
      this.refresh();
    });

    // Focus on click
    this.el.addEventListener('mousedown', () => {
      if (getActivePanelId() !== this.panelId) {
        import('../core/state.js').then(m => m.setActivePanel(this.panelId));
      }
    });
  }

  render() {
    const ps = getPanelState(this.panelId);
    const sorted = sortEntries(ps.entries, ps.sortField, ps.sortAsc);

    this.el.innerHTML = '';

    sorted.forEach((entry, i) => {
      const div = document.createElement('div');
      div.className = 'file-entry';
      div.dataset.index = i;

      if (entry.isDirectory) div.classList.add('directory');
      else div.classList.add('file');
      if (entry.name === '..') div.classList.add('parent-dir');
      if (i === ps.cursor) div.classList.add('cursor');
      if (ps.selection.has(i)) div.classList.add('selected');

      const ext = entry.isDirectory ? '' : getExtension(entry.name);
      const displayName = entry.isDirectory
        ? entry.name
        : (ext ? entry.name.slice(0, -(ext.length + 1)) : entry.name);

      div.innerHTML = `
        <span class="file-name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name === '..' ? '..' : displayName)}</span>
        <span class="file-ext">${escapeHtml(ext)}</span>
        <span class="file-size">${entry.isDirectory ? '&lt;DIR&gt;' : formatFileSize(entry.size)}</span>
        <span class="file-date">${formatDate(entry.lastModified)}</span>
      `;

      this.el.appendChild(div);
    });

    this._updateSortIndicators();
    this._scrollCursorIntoView();
  }

  refresh() {
    this.render();
  }

  _updateSortIndicators() {
    const ps = getPanelState(this.panelId);
    this.headerEl.querySelectorAll('.col-header').forEach(h => {
      h.classList.remove('sort-asc', 'sort-desc');
      if (h.dataset.sort === ps.sortField) {
        h.classList.add(ps.sortAsc ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  _scrollCursorIntoView() {
    const cursorEl = this.el.querySelector('.file-entry.cursor');
    if (cursorEl) {
      cursorEl.scrollIntoView({ block: 'nearest' });
    }
  }

  // Get the sorted entries (same order as rendered)
  getSortedEntries() {
    const ps = getPanelState(this.panelId);
    return sortEntries(ps.entries, ps.sortField, ps.sortAsc);
  }
}
