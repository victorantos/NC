export class NativeFileSystemAdapter {
  constructor(rootHandle) {
    this._root = rootHandle;
    this._rootName = rootHandle.name;
    this._handleCache = new Map();
    this._handleCache.set('/', rootHandle);
  }

  getType() { return 'native'; }
  getRootName() { return this._rootName; }

  // Same path resolution strategy as OPFS
  async _resolveDirHandle(path) {
    if (path === '/' || path === '') return this._root;
    if (this._handleCache.has(path)) return this._handleCache.get(path);

    const segments = path.split('/').filter(Boolean);
    let current = this._root;
    let currentPath = '';

    for (const segment of segments) {
      currentPath += '/' + segment;
      if (this._handleCache.has(currentPath)) {
        current = this._handleCache.get(currentPath);
      } else {
        current = await current.getDirectoryHandle(segment);
        this._handleCache.set(currentPath, current);
      }
    }
    return current;
  }

  _splitPath(path) {
    const normalized = path.replace(/\/+$/, '');
    const lastSlash = normalized.lastIndexOf('/');
    const parentPath = normalized.substring(0, lastSlash) || '/';
    const name = normalized.substring(lastSlash + 1);
    return { parentPath, name };
  }

  async listDirectory(path) {
    const dirHandle = await this._resolveDirHandle(path);
    const entries = [];

    for await (const [name, handle] of dirHandle.entries()) {
      const entry = {
        name,
        isDirectory: handle.kind === 'directory',
        size: 0,
        lastModified: 0
      };

      if (handle.kind === 'file') {
        try {
          const file = await handle.getFile();
          entry.size = file.size;
          entry.lastModified = file.lastModified;
        } catch (e) { /* permission or access error */ }
      }

      entries.push(entry);
    }

    return entries;
  }

  async readFile(path) {
    const { parentPath, name } = this._splitPath(path);
    const dirHandle = await this._resolveDirHandle(parentPath);
    const fileHandle = await dirHandle.getFileHandle(name);
    return await fileHandle.getFile();
  }

  async readTextFile(path) {
    const blob = await this.readFile(path);
    return await blob.text();
  }

  async writeFile(path, content) {
    const { parentPath, name } = this._splitPath(path);
    const dirHandle = await this._resolveDirHandle(parentPath);
    const fileHandle = await dirHandle.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content instanceof Blob ? content : new Blob([content], { type: 'text/plain' }));
    await writable.close();
  }

  async createDirectory(path) {
    const { parentPath, name } = this._splitPath(path);
    const dirHandle = await this._resolveDirHandle(parentPath);
    const newDir = await dirHandle.getDirectoryHandle(name, { create: true });
    this._handleCache.set(path, newDir);
  }

  async delete(path) {
    const { parentPath, name } = this._splitPath(path);
    const dirHandle = await this._resolveDirHandle(parentPath);
    await dirHandle.removeEntry(name, { recursive: true });
    this._invalidateCache(path);
  }

  async rename(oldPath, newPath) {
    const { parentPath: oldParent, name: oldName } = this._splitPath(oldPath);
    const { parentPath: newParent, name: newName } = this._splitPath(newPath);
    const oldDirHandle = await this._resolveDirHandle(oldParent);

    // Try native move() first (Chrome 110+)
    let handle;
    let isDir = false;
    try {
      handle = await oldDirHandle.getFileHandle(oldName);
    } catch {
      handle = await oldDirHandle.getDirectoryHandle(oldName);
      isDir = true;
    }

    if (handle.move) {
      try {
        const newDirHandle = await this._resolveDirHandle(newParent);
        await handle.move(newDirHandle, newName);
        this._invalidateCache(oldPath);
        return;
      } catch {
        // Fallback below
      }
    }

    // Fallback: copy + delete
    if (isDir) {
      await this._copyDir(oldPath, newPath);
      await this.delete(oldPath);
    } else {
      const blob = await this.readFile(oldPath);
      await this.writeFile(newPath, blob);
      await this.delete(oldPath);
    }
  }

  async _copyDir(srcPath, destPath) {
    await this.createDirectory(destPath);
    const entries = await this.listDirectory(srcPath);
    for (const entry of entries) {
      const srcEntryPath = srcPath === '/' ? '/' + entry.name : srcPath + '/' + entry.name;
      const destEntryPath = destPath === '/' ? '/' + entry.name : destPath + '/' + entry.name;
      if (entry.isDirectory) {
        await this._copyDir(srcEntryPath, destEntryPath);
      } else {
        const blob = await this.readFile(srcEntryPath);
        await this.writeFile(destEntryPath, blob);
      }
    }
  }

  async exists(path) {
    try {
      if (path === '/') return true;
      const { parentPath, name } = this._splitPath(path);
      const dirHandle = await this._resolveDirHandle(parentPath);
      try { await dirHandle.getFileHandle(name); return true; } catch {}
      try { await dirHandle.getDirectoryHandle(name); return true; } catch {}
      return false;
    } catch {
      return false;
    }
  }

  async getEntry(path) {
    if (path === '/') return { name: this._rootName, isDirectory: true, size: 0, lastModified: 0 };
    try {
      const { parentPath, name } = this._splitPath(path);
      const dirHandle = await this._resolveDirHandle(parentPath);
      try {
        const fh = await dirHandle.getFileHandle(name);
        const file = await fh.getFile();
        return { name, isDirectory: false, size: file.size, lastModified: file.lastModified };
      } catch {}
      try {
        await dirHandle.getDirectoryHandle(name);
        return { name, isDirectory: true, size: 0, lastModified: 0 };
      } catch {}
      return null;
    } catch {
      return null;
    }
  }

  _invalidateCache(path) {
    for (const key of this._handleCache.keys()) {
      if (key === path || key.startsWith(path + '/')) {
        this._handleCache.delete(key);
      }
    }
  }
}
