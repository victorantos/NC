import { eventBus } from './events.js';
import { getPanelState, getActivePanelId, getInactivePanelId } from './state.js';
import { setClipboard, getClipboard, clearClipboard } from './clipboard.js';

// Reference to dialog instance (set by app.js)
let dialog = null;
export function setDialogRef(d) { dialog = d; }

// Get full path for an entry given panel's current path
function fullPath(basePath, name) {
  return basePath === '/' ? '/' + name : basePath + '/' + name;
}

// Copy operation: triggered by F5
// Copies selected entries from active panel to inactive panel's current directory
export async function doCopy(panels) {
  const srcId = getActivePanelId();
  const destId = getInactivePanelId();
  const srcState = getPanelState(srcId);
  const destState = getPanelState(destId);
  const srcPanel = panels[srcId];
  const destPanel = panels[destId];

  const entries = srcPanel.getSelectedEntries();
  if (entries.length === 0) {
    await dialog.alert('Copy', 'No files selected.');
    return;
  }

  const names = entries.map(e => e.name).join(', ');
  const confirmed = await dialog.confirm('Copy', `Copy ${entries.length} item(s) to ${destState.path}?\n\n${names}`);
  if (!confirmed) return;

  try {
    dialog.showProgress('Copying', 'Copying files...');

    for (const entry of entries) {
      const srcPath = fullPath(srcState.path, entry.name);
      const destPath = fullPath(destState.path, entry.name);

      if (entry.isDirectory) {
        await copyDirCrossAdapter(srcState.adapter, destState.adapter, srcPath, destPath);
      } else {
        dialog.updateProgress(`Copying ${entry.name}...`);
        const blob = await srcState.adapter.readFile(srcPath);
        await destState.adapter.writeFile(destPath, blob);
      }
    }

    dialog.close();
    await destPanel.navigate(destState.path);
  } catch (err) {
    dialog.close();
    await dialog.alert('Error', `Copy failed: ${err.message}`);
  }
}

// Recursive directory copy across adapters
async function copyDirCrossAdapter(srcAdapter, destAdapter, srcPath, destPath) {
  await destAdapter.createDirectory(destPath);
  const entries = await srcAdapter.listDirectory(srcPath);

  for (const entry of entries) {
    const spath = srcPath === '/' ? '/' + entry.name : srcPath + '/' + entry.name;
    const dpath = destPath === '/' ? '/' + entry.name : destPath + '/' + entry.name;

    if (entry.isDirectory) {
      await copyDirCrossAdapter(srcAdapter, destAdapter, spath, dpath);
    } else {
      const blob = await srcAdapter.readFile(spath);
      await destAdapter.writeFile(dpath, blob);
    }
  }
}

// Move operation: triggered by F6
export async function doMove(panels) {
  const srcId = getActivePanelId();
  const destId = getInactivePanelId();
  const srcState = getPanelState(srcId);
  const destState = getPanelState(destId);
  const srcPanel = panels[srcId];
  const destPanel = panels[destId];

  const entries = srcPanel.getSelectedEntries();
  if (entries.length === 0) {
    await dialog.alert('Move', 'No files selected.');
    return;
  }

  const names = entries.map(e => e.name).join(', ');
  const confirmed = await dialog.confirm('Move', `Move ${entries.length} item(s) to ${destState.path}?\n\n${names}`);
  if (!confirmed) return;

  try {
    dialog.showProgress('Moving', 'Moving files...');

    for (const entry of entries) {
      const srcPath = fullPath(srcState.path, entry.name);
      const destPath = fullPath(destState.path, entry.name);

      // If same adapter, try rename
      if (srcState.adapter === destState.adapter) {
        dialog.updateProgress(`Moving ${entry.name}...`);
        await srcState.adapter.rename(srcPath, destPath);
      } else {
        // Cross-adapter: copy then delete
        if (entry.isDirectory) {
          await copyDirCrossAdapter(srcState.adapter, destState.adapter, srcPath, destPath);
        } else {
          dialog.updateProgress(`Moving ${entry.name}...`);
          const blob = await srcState.adapter.readFile(srcPath);
          await destState.adapter.writeFile(destPath, blob);
        }
        await srcState.adapter.delete(srcPath);
      }
    }

    dialog.close();
    await srcPanel.navigate(srcState.path);
    await destPanel.navigate(destState.path);
  } catch (err) {
    dialog.close();
    await dialog.alert('Error', `Move failed: ${err.message}`);
  }
}

// Delete operation: triggered by F8 or Delete
export async function doDelete(panels) {
  const panelId = getActivePanelId();
  const ps = getPanelState(panelId);
  const panel = panels[panelId];

  const entries = panel.getSelectedEntries();
  if (entries.length === 0) {
    await dialog.alert('Delete', 'No files selected.');
    return;
  }

  const names = entries.map(e => e.name).join(', ');
  const confirmed = await dialog.confirm('Delete', `Delete ${entries.length} item(s)?\n\n${names}`);
  if (!confirmed) return;

  try {
    dialog.showProgress('Deleting', 'Deleting...');

    for (const entry of entries) {
      dialog.updateProgress(`Deleting ${entry.name}...`);
      const path = fullPath(ps.path, entry.name);
      await ps.adapter.delete(path);
    }

    dialog.close();
    await panel.navigate(ps.path);
  } catch (err) {
    dialog.close();
    await dialog.alert('Error', `Delete failed: ${err.message}`);
  }
}

// Rename operation: triggered by F2
export async function doRename(panels) {
  const panelId = getActivePanelId();
  const ps = getPanelState(panelId);
  const panel = panels[panelId];

  const entry = panel.getCursorEntry();
  if (!entry || entry.name === '..') {
    await dialog.alert('Rename', 'No file selected.');
    return;
  }

  const newName = await dialog.prompt('Rename', `Rename "${entry.name}" to:`, entry.name);
  if (!newName || newName === entry.name) return;

  try {
    const oldPath = fullPath(ps.path, entry.name);
    const newPath = fullPath(ps.path, newName);
    await ps.adapter.rename(oldPath, newPath);
    await panel.navigate(ps.path);
  } catch (err) {
    await dialog.alert('Error', `Rename failed: ${err.message}`);
  }
}

// Mkdir operation: triggered by F7
export async function doMkdir(panels) {
  const panelId = getActivePanelId();
  const ps = getPanelState(panelId);
  const panel = panels[panelId];

  const name = await dialog.prompt('New Folder', 'Enter folder name:');
  if (!name) return;

  try {
    const path = fullPath(ps.path, name);
    await ps.adapter.createDirectory(path);
    await panel.navigate(ps.path);
  } catch (err) {
    await dialog.alert('Error', `Create folder failed: ${err.message}`);
  }
}
