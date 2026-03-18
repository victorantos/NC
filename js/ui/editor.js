import { eventBus } from '../core/events.js';
import { getState, setEditor } from '../core/state.js';
import { escapeHtml } from '../core/format.js';

export class Editor {
  constructor() {
    this.overlay = document.getElementById('editor-overlay');
    this._unsavedChanges = false;

    eventBus.on('editor:changed', (state) => this._render(state));
    eventBus.on('editor:close', () => this.close());
    eventBus.on('editor:save', () => this._save());
  }

  // Open file in view mode
  async view(path, adapter) {
    try {
      const content = await adapter.readTextFile(path);
      const name = path.split('/').pop();
      setEditor({ path, content, mode: 'view', adapter, fileName: name });
    } catch (err) {
      eventBus.emit('error', `Cannot read file: ${err.message}`);
    }
  }

  // Open file in edit mode (create new if it doesn't exist)
  async edit(path, adapter) {
    try {
      let content = '';
      const exists = await adapter.exists(path);
      if (exists) {
        content = await adapter.readTextFile(path);
      }
      const name = path.split('/').pop();
      setEditor({ path, content, mode: 'edit', adapter, fileName: name });
      this._unsavedChanges = false;
    } catch (err) {
      eventBus.emit('error', `Cannot open file: ${err.message}`);
    }
  }

  async close() {
    if (this._unsavedChanges) {
      if (!window.confirm('You have unsaved changes. Close anyway?')) return;
    }
    setEditor(null);
    this._unsavedChanges = false;
  }

  async _save() {
    const state = getState();
    if (!state.editor || state.editor.mode !== 'edit') return;

    const textarea = this.overlay.querySelector('.editor-textarea');
    if (!textarea) return;

    try {
      await state.editor.adapter.writeFile(state.editor.path, textarea.value);
      this._unsavedChanges = false;
      // Update content in state
      state.editor.content = textarea.value;
      // Flash save indicator
      const indicator = this.overlay.querySelector('.editor-save-indicator');
      if (indicator) {
        indicator.textContent = 'Saved!';
        setTimeout(() => { indicator.textContent = ''; }, 2000);
      }
      // Refresh the panel that owns this file
      eventBus.emit('panel:refresh');
    } catch (err) {
      eventBus.emit('error', `Cannot save file: ${err.message}`);
    }
  }

  _render(state) {
    if (!state) {
      this.overlay.classList.add('hidden');
      this.overlay.innerHTML = '';
      return;
    }

    this.overlay.classList.remove('hidden');

    const isEdit = state.mode === 'edit';

    this.overlay.innerHTML = `
      <div class="editor-header">
        <span class="editor-filename">${isEdit ? 'Edit' : 'View'}: ${escapeHtml(state.fileName)}</span>
        <span class="editor-save-indicator"></span>
        <div class="editor-actions">
          ${isEdit ? '<button class="editor-btn editor-save-btn" title="Ctrl+S">Save</button>' : ''}
          <button class="editor-btn editor-close-btn" title="Escape">Close</button>
        </div>
      </div>
      <div class="editor-content">
        ${isEdit
          ? `<textarea class="editor-textarea" spellcheck="false">${escapeHtml(state.content)}</textarea>`
          : `<pre class="viewer-content">${escapeHtml(state.content)}</pre>`
        }
      </div>
    `;

    // Bind events
    const closeBtn = this.overlay.querySelector('.editor-close-btn');
    closeBtn?.addEventListener('click', () => this.close());

    const saveBtn = this.overlay.querySelector('.editor-save-btn');
    saveBtn?.addEventListener('click', () => this._save());

    const textarea = this.overlay.querySelector('.editor-textarea');
    if (textarea) {
      textarea.focus();
      textarea.addEventListener('input', () => { this._unsavedChanges = true; });
      textarea.addEventListener('keydown', (e) => {
        // Allow Tab to insert tab character
        if (e.key === 'Tab') {
          e.preventDefault();
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          textarea.value = textarea.value.substring(0, start) + '\t' + textarea.value.substring(end);
          textarea.selectionStart = textarea.selectionEnd = start + 1;
          this._unsavedChanges = true;
        }
      });
    }
  }
}
