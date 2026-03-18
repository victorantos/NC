import { eventBus } from './events.js';

const state = {
  activePanel: 'left',        // 'left' | 'right'
  leftPanel: {
    path: '/',
    entries: [],               // FileEntry[]
    cursor: 0,                 // index of cursor
    selection: new Set(),      // Set of selected indices
    sortField: 'name',        // 'name' | 'ext' | 'size' | 'date'
    sortAsc: true,
    adapter: null,             // FileSystemAdapter reference
    adapterType: 'opfs'       // 'opfs' | 'native'
  },
  rightPanel: {
    path: '/',
    entries: [],
    cursor: 0,
    selection: new Set(),
    sortField: 'name',
    sortAsc: true,
    adapter: null,
    adapterType: 'opfs'
  },
  dialog: null,                // { type, title, message, ... } or null
  editor: null,                // { path, content, mode, panelId } or null
  contextMenu: null            // { x, y, entries, panelId } or null
};

export function getState() {
  return state;
}

export function getPanelState(panelId) {
  return state[panelId + 'Panel'];
}

export function getActivePanel() {
  return state[state.activePanel + 'Panel'];
}

export function getActivePanelId() {
  return state.activePanel;
}

export function getInactivePanelId() {
  return state.activePanel === 'left' ? 'right' : 'left';
}

export function setState(panelId, updates) {
  Object.assign(state[panelId + 'Panel'], updates);
  eventBus.emit('panel:updated', panelId);
}

export function setActivePanel(panelId) {
  state.activePanel = panelId;
  eventBus.emit('panel:activated', panelId);
}

export function setDialog(dialogState) {
  state.dialog = dialogState;
  eventBus.emit('dialog:changed', dialogState);
}

export function setEditor(editorState) {
  state.editor = editorState;
  eventBus.emit('editor:changed', editorState);
}

export function setContextMenu(menuState) {
  state.contextMenu = menuState;
  eventBus.emit('contextmenu:changed', menuState);
}
