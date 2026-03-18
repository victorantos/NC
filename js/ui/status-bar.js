import { eventBus } from '../core/events.js';
import { getPanelState, getActivePanelId } from '../core/state.js';
import { formatFileSize } from '../core/format.js';

export class StatusBar {
  constructor() {
    this.el = document.getElementById('status-bar');
    eventBus.on('panel:updated', () => this.render());
    eventBus.on('panel:activated', () => this.render());
  }

  render() {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);

    const entries = ps.entries.filter(e => e.name !== '..');
    const dirs = entries.filter(e => e.isDirectory).length;
    const files = entries.filter(e => !e.isDirectory).length;
    const totalSize = entries
      .filter(e => !e.isDirectory)
      .reduce((sum, e) => sum + (e.size || 0), 0);

    let selInfo = '';
    if (ps.selection.size > 0) {
      selInfo = ` | ${ps.selection.size} selected`;
    }

    const fsType = ps.adapter
      ? (ps.adapter.getType() === 'native' ? '\u{1F4C1} Local' : '\u{1F4BE} OPFS')
      : '\u2014';

    this.el.innerHTML = `
      <span class="status-left">${dirs} dir(s), ${files} file(s), ${formatFileSize(totalSize)}${selInfo}</span>
      <span class="status-right">${fsType} | ${panelId} panel</span>
    `;
  }
}
