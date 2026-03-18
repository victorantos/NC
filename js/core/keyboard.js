import { eventBus } from './events.js';
import { getState, setActivePanel, getActivePanelId } from './state.js';

/**
 * Initialize keyboard shortcut handling.
 * Maps keyboard events to named actions via the EventBus.
 *
 * F1=Help, F2=Rename, F3=View, F4=Edit, F5=Copy, F6=Move,
 * F7=Mkdir, F8=Delete, F9=Menu, F10=Quit
 * Tab=Switch panel, Enter=Open, Backspace=Parent dir
 * ArrowUp/Down=Cursor, Home/End=First/Last
 * Insert=Toggle selection + move down, Space=Toggle selection (stay)
 * Ctrl+A=Select all, Escape=Close/deselect, Delete=Delete
 */
export function initKeyboard() {
  document.addEventListener('keydown', handleKeyDown);
}

function handleKeyDown(e) {
  const state = getState();

  // If dialog is open, only handle Escape and Enter
  if (state.dialog) {
    if (e.key === 'Escape') { e.preventDefault(); eventBus.emit('dialog:cancel'); }
    if (e.key === 'Enter') { e.preventDefault(); eventBus.emit('dialog:confirm'); }
    return;
  }

  // If editor is open
  if (state.editor) {
    if (e.key === 'Escape') { e.preventDefault(); eventBus.emit('editor:close'); }
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); eventBus.emit('editor:save'); }
    return; // Don't intercept typing in editor
  }

  // If context menu is open
  if (state.contextMenu) {
    if (e.key === 'Escape') { e.preventDefault(); eventBus.emit('contextmenu:close'); }
    return;
  }

  // Panel navigation
  switch (e.key) {
    case 'Tab':
      e.preventDefault();
      setActivePanel(getActivePanelId() === 'left' ? 'right' : 'left');
      break;
    case 'ArrowUp':
      e.preventDefault();
      eventBus.emit('cursor:up');
      break;
    case 'ArrowDown':
      e.preventDefault();
      eventBus.emit('cursor:down');
      break;
    case 'Home':
      e.preventDefault();
      eventBus.emit('cursor:home');
      break;
    case 'End':
      e.preventDefault();
      eventBus.emit('cursor:end');
      break;
    case 'Enter':
      e.preventDefault();
      eventBus.emit('entry:open');
      break;
    case 'Backspace':
      e.preventDefault();
      eventBus.emit('navigate:parent');
      break;
    case 'Insert':
      e.preventDefault();
      eventBus.emit('selection:toggle');
      break;
    case ' ':
      e.preventDefault();
      eventBus.emit('selection:toggleStay');
      break;
    case 'Delete':
      e.preventDefault();
      eventBus.emit('operation:delete');
      break;
    case 'Escape':
      e.preventDefault();
      eventBus.emit('selection:clear');
      break;
    // F-keys
    case 'F1':
      e.preventDefault();
      eventBus.emit('help:show');
      break;
    case 'F2':
      e.preventDefault();
      eventBus.emit('operation:rename');
      break;
    case 'F3':
      e.preventDefault();
      eventBus.emit('operation:view');
      break;
    case 'F4':
      e.preventDefault();
      eventBus.emit('operation:edit');
      break;
    case 'F5':
      e.preventDefault();
      eventBus.emit('operation:copy');
      break;
    case 'F6':
      e.preventDefault();
      eventBus.emit('operation:move');
      break;
    case 'F7':
      e.preventDefault();
      eventBus.emit('operation:mkdir');
      break;
    case 'F8':
      e.preventDefault();
      eventBus.emit('operation:delete');
      break;
    case 'F9':
      e.preventDefault();
      eventBus.emit('operation:menu');
      break;
    case 'F10':
      e.preventDefault();
      eventBus.emit('operation:quit');
      break;
    default:
      // Ctrl+A = select all
      if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        eventBus.emit('selection:all');
      }
      break;
  }
}

export function destroyKeyboard() {
  document.removeEventListener('keydown', handleKeyDown);
}
