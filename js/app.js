import { eventBus } from './core/events.js';
import { getState, getPanelState, getActivePanelId, getInactivePanelId, setState, setActivePanel } from './core/state.js';
import { initKeyboard } from './core/keyboard.js';
import { initTouch } from './core/touch.js';
import { sortEntries } from './core/sort.js';
import { isTextFile } from './core/format.js';
import { isNativeFSSupported, createOPFSAdapter, createNativeAdapter } from './fs/factory.js';
import { Panel } from './ui/panel.js';
import { Toolbar } from './ui/toolbar.js';
import { StatusBar } from './ui/status-bar.js';
import { Dialog } from './ui/dialog.js';
import { Editor } from './ui/editor.js';
import { ContextMenu } from './ui/context-menu.js';
import { setDialogRef, doCopy, doMove, doDelete, doRename, doMkdir } from './core/operations.js';
import { registerServiceWorker } from './pwa/register.js';

let panels = {};
let dialogUI, editorUI;

async function init() {
  console.log('NC Web initializing...');

  // Init UI components
  dialogUI = new Dialog();
  editorUI = new Editor();
  new Toolbar();
  new StatusBar();
  new ContextMenu();

  // Set dialog ref for operations module
  setDialogRef(dialogUI);

  // Create panels
  panels.left = new Panel('left');
  panels.right = new Panel('right');

  // Hide Open buttons if native FS not supported
  if (!isNativeFSSupported()) {
    document.getElementById('btn-open-left')?.style.setProperty('display', 'none');
    document.getElementById('btn-open-right')?.style.setProperty('display', 'none');
  }

  // Init keyboard and touch
  initKeyboard();
  initTouch();

  // Wire up events
  wireEvents();

  // Init both panels with OPFS
  try {
    const leftAdapter = await createOPFSAdapter();
    const rightAdapter = await createOPFSAdapter();

    setState('left', { adapter: leftAdapter, adapterType: 'opfs' });
    setState('right', { adapter: rightAdapter, adapterType: 'opfs' });

    await panels.left.navigate('/');
    await panels.right.navigate('/');
  } catch (err) {
    console.error('Failed to initialize OPFS:', err);
    dialogUI.alert('Error', 'Failed to initialize file system. Please use a modern browser.');
  }

  // Set left as active
  setActivePanel('left');

  // Register service worker
  registerServiceWorker();

  // Wire up top toolbar buttons
  const openHandler = (panelId) => async () => {
    try {
      const adapter = await createNativeAdapter();
      setState(panelId, { adapter, adapterType: 'native' });
      await panels[panelId].navigate('/');
    } catch (err) {
      if (err.name !== 'AbortError') {
        dialogUI.alert('Error', `Failed to open directory: ${err.message}`);
      }
    }
  };
  document.getElementById('btn-open-left')?.addEventListener('click', openHandler('left'));
  document.getElementById('btn-open-right')?.addEventListener('click', openHandler('right'));

  // Help button
  document.getElementById('btn-help')?.addEventListener('click', () => {
    eventBus.emit('help:show');
  });

  // Mobile tab switching
  document.getElementById('mobile-tabs')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.mobile-tab');
    if (!btn) return;
    const panelId = btn.dataset.tab;
    setActivePanel(panelId);
    updateMobilePanes();
  });

  console.log('NC Web ready!');
}

function wireEvents() {
  // Cursor movement
  eventBus.on('cursor:up', () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    if (ps.cursor > 0) setState(panelId, { cursor: ps.cursor - 1 });
  });

  eventBus.on('cursor:down', () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    if (ps.cursor < ps.entries.length - 1) setState(panelId, { cursor: ps.cursor + 1 });
  });

  eventBus.on('cursor:home', () => {
    setState(getActivePanelId(), { cursor: 0 });
  });

  eventBus.on('cursor:end', () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    setState(panelId, { cursor: Math.max(0, ps.entries.length - 1) });
  });

  // Selection
  eventBus.on('selection:toggle', () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    const sorted = sortEntries(ps.entries, ps.sortField, ps.sortAsc);
    const entry = sorted[ps.cursor];
    if (!entry || entry.name === '..') return;

    const newSelection = new Set(ps.selection);
    if (newSelection.has(ps.cursor)) newSelection.delete(ps.cursor);
    else newSelection.add(ps.cursor);

    const newCursor = Math.min(ps.cursor + 1, ps.entries.length - 1);
    setState(panelId, { selection: newSelection, cursor: newCursor });
  });

  eventBus.on('selection:toggleStay', () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    const sorted = sortEntries(ps.entries, ps.sortField, ps.sortAsc);
    const entry = sorted[ps.cursor];
    if (!entry || entry.name === '..') return;

    const newSelection = new Set(ps.selection);
    if (newSelection.has(ps.cursor)) newSelection.delete(ps.cursor);
    else newSelection.add(ps.cursor);
    setState(panelId, { selection: newSelection });
  });

  eventBus.on('selection:all', () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    const sorted = sortEntries(ps.entries, ps.sortField, ps.sortAsc);
    const newSelection = new Set();
    sorted.forEach((e, i) => { if (e.name !== '..') newSelection.add(i); });
    setState(panelId, { selection: newSelection });
  });

  eventBus.on('selection:clear', () => {
    setState(getActivePanelId(), { selection: new Set() });
  });

  // Open entry (Enter or double-click)
  eventBus.on('entry:open', async (overridePanelId) => {
    const panelId = overridePanelId || getActivePanelId();
    const panel = panels[panelId];
    const entry = panel.getCursorEntry();
    if (!entry) return;

    const ps = getPanelState(panelId);

    if (entry.name === '..') {
      // Navigate to parent
      const parentPath = ps.path === '/' ? '/' : ps.path.substring(0, ps.path.lastIndexOf('/')) || '/';
      await panel.navigate(parentPath);
    } else if (entry.isDirectory) {
      // Navigate into directory
      const newPath = ps.path === '/' ? '/' + entry.name : ps.path + '/' + entry.name;
      await panel.navigate(newPath);
    } else {
      // Open file — view if text, alert if binary
      const filePath = ps.path === '/' ? '/' + entry.name : ps.path + '/' + entry.name;
      if (isTextFile(entry.name)) {
        await editorUI.view(filePath, ps.adapter);
      } else {
        await dialogUI.alert('File', `Cannot view binary file: ${entry.name}\nSize: ${entry.size} bytes`);
      }
    }
  });

  // Navigate to parent
  eventBus.on('navigate:parent', async () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    if (ps.path === '/') return;
    const parentPath = ps.path.substring(0, ps.path.lastIndexOf('/')) || '/';
    await panels[panelId].navigate(parentPath);
  });

  // Navigate to specific path (from breadcrumb)
  eventBus.on('navigate:to', async ({ panelId, path }) => {
    await panels[panelId].navigate(path);
  });

  // File operations
  eventBus.on('operation:copy', () => doCopy(panels));
  eventBus.on('operation:move', () => doMove(panels));
  eventBus.on('operation:delete', () => doDelete(panels));
  eventBus.on('operation:rename', () => doRename(panels));
  eventBus.on('operation:mkdir', () => doMkdir(panels));

  // View/Edit
  eventBus.on('operation:view', async () => {
    const panelId = getActivePanelId();
    const panel = panels[panelId];
    const entry = panel.getCursorEntry();
    if (!entry || entry.isDirectory || entry.name === '..') return;

    const ps = getPanelState(panelId);
    const filePath = ps.path === '/' ? '/' + entry.name : ps.path + '/' + entry.name;

    if (isTextFile(entry.name)) {
      await editorUI.view(filePath, ps.adapter);
    } else {
      await dialogUI.alert('View', `Cannot view binary file: ${entry.name}`);
    }
  });

  eventBus.on('operation:edit', async () => {
    const panelId = getActivePanelId();
    const panel = panels[panelId];
    const entry = panel.getCursorEntry();
    if (!entry || entry.isDirectory || entry.name === '..') return;

    const ps = getPanelState(panelId);
    const filePath = ps.path === '/' ? '/' + entry.name : ps.path + '/' + entry.name;

    if (isTextFile(entry.name)) {
      await editorUI.edit(filePath, ps.adapter);
    } else {
      await dialogUI.alert('Edit', `Cannot edit binary file: ${entry.name}`);
    }
  });

  // Help
  eventBus.on('help:show', () => {
    dialogUI.alert('NC Web — Help',
      'Keyboard shortcuts:\n' +
      '  Tab — Switch panel\n' +
      '  Arrows — Navigate\n' +
      '  Enter — Open dir/file\n' +
      '  Backspace — Parent dir\n' +
      '  Insert — Select file\n' +
      '  Ctrl+A — Select all\n\n' +
      'F1 Help  F2 Rename  F3 View\n' +
      'F4 Edit  F5 Copy    F6 Move\n' +
      'F7 MkDir F8 Delete\n\n' +
      'Right-click for context menu.\n' +
      'On mobile: swipe to switch panes.'
    );
  });

  // Panel refresh (after editor save)
  eventBus.on('panel:refresh', async () => {
    const panelId = getActivePanelId();
    const ps = getPanelState(panelId);
    await panels[panelId].navigate(ps.path);
  });

  // Error handling
  eventBus.on('error', (msg) => {
    dialogUI.alert('Error', msg);
  });

  // Swipe to switch panes (mobile)
  eventBus.on('swipe:left', () => {
    setActivePanel('right');
    updateMobilePanes();
  });

  eventBus.on('swipe:right', () => {
    setActivePanel('left');
    updateMobilePanes();
  });

  // Long press = context menu
  eventBus.on('touch:longpress', (data) => {
    // Find which panel the touch is in
    const leftPanel = document.getElementById('left-panel');
    const rightPanel = document.getElementById('right-panel');
    let panelId = 'left';
    if (rightPanel && rightPanel.contains(data.target)) panelId = 'right';

    eventBus.emit('contextmenu:show', {
      x: data.x,
      y: data.y,
      panelId
    });
  });

  // Quit
  eventBus.on('operation:quit', () => {
    dialogUI.confirm('Quit', 'Close NC Web?').then(confirmed => {
      if (confirmed) window.close();
    });
  });
}

function updateMobilePanes() {
  const active = getActivePanelId();
  const leftPanel = document.getElementById('left-panel');
  const rightPanel = document.getElementById('right-panel');

  leftPanel.classList.toggle('active-mobile', active === 'left');
  leftPanel.classList.toggle('inactive-mobile', active !== 'left');
  rightPanel.classList.toggle('active-mobile', active === 'right');
  rightPanel.classList.toggle('inactive-mobile', active !== 'right');

  // Update tab buttons
  document.querySelectorAll('.mobile-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === active);
  });
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
