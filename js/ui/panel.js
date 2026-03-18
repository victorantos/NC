import { eventBus } from '../core/events.js';
import { getPanelState, getActivePanelId, setState, setActivePanel } from '../core/state.js';
import { FileList } from './file-list.js';
import { Breadcrumb } from './breadcrumb.js';

export class Panel {
  constructor(panelId) {
    this.panelId = panelId;
    this.el = document.getElementById(panelId + '-panel');
    this.fileList = new FileList(panelId);
    this.breadcrumb = new Breadcrumb(panelId);
    this._bindEvents();
  }

  _bindEvents() {
    // Listen for panel updates
    eventBus.on('panel:updated', (id) => {
      if (id === this.panelId) this.render();
    });

    eventBus.on('panel:activated', (id) => {
      this._updateActiveState();
      if (id === this.panelId) {
        this.fileList.el.focus();
      }
    });
  }

  async navigate(path) {
    const ps = getPanelState(this.panelId);
    if (!ps.adapter) return;

    try {
      const entries = await ps.adapter.listDirectory(path);

      // Add ".." entry if not at root
      const allEntries = path === '/'
        ? entries
        : [{ name: '..', isDirectory: true, size: 0, lastModified: 0 }, ...entries];

      setState(this.panelId, {
        path: path,
        entries: allEntries,
        cursor: 0,
        selection: new Set()
      });
    } catch (err) {
      console.error(`Failed to navigate to ${path}:`, err);
      eventBus.emit('error', `Cannot open ${path}: ${err.message}`);
    }
  }

  render() {
    this.breadcrumb.render();
    this.fileList.render();
    this._updateActiveState();
  }

  _updateActiveState() {
    const isActive = getActivePanelId() === this.panelId;
    this.el.classList.toggle('active-panel', isActive);
    this.el.classList.toggle('inactive', !isActive);
  }

  // Get current cursor entry (from sorted list)
  getCursorEntry() {
    const ps = getPanelState(this.panelId);
    const sorted = this.fileList.getSortedEntries();
    return sorted[ps.cursor] || null;
  }

  // Get all selected entries, or cursor entry if none selected
  getSelectedEntries() {
    const ps = getPanelState(this.panelId);
    const sorted = this.fileList.getSortedEntries();
    if (ps.selection.size > 0) {
      return [...ps.selection].map(i => sorted[i]).filter(Boolean);
    }
    const cursor = sorted[ps.cursor];
    return cursor && cursor.name !== '..' ? [cursor] : [];
  }
}
