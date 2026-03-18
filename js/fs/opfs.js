export class OPFSAdapter {
  constructor() {
    this._root = null;
    this._handleCache = new Map(); // path → FileSystemDirectoryHandle
  }

  async init() {
    this._root = await navigator.storage.getDirectory();
    this._handleCache.set('/', this._root);
    return this;
  }

  getType() { return 'opfs'; }
  getRootName() { return 'Virtual FS'; }

  // Resolve a path string to a DirectoryHandle by walking segments
  // Uses cache for intermediate handles
  async _resolveDirHandle(path) {
    if (path === '/' || path === '') return this._root;

    // Check cache
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

  // Resolve parent directory handle and entry name from a full path
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

      // Get file metadata
      if (handle.kind === 'file') {
        try {
          const file = await handle.getFile();
          entry.size = file.size;
          entry.lastModified = file.lastModified;
        } catch (e) {
          // Metadata unavailable
        }
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
    // Invalidate cache for this path and all children
    this._invalidateCache(path);
  }

  async rename(oldPath, newPath) {
    // OPFS doesn't have a native rename, so copy + delete
    const { parentPath: oldParent, name: oldName } = this._splitPath(oldPath);
    const { parentPath: newParent, name: newName } = this._splitPath(newPath);

    const oldDirHandle = await this._resolveDirHandle(oldParent);

    // Check if it's a file or directory
    let isDir = false;
    try {
      await oldDirHandle.getDirectoryHandle(oldName);
      isDir = true;
    } catch {
      isDir = false;
    }

    if (isDir) {
      // For directories: create new, copy contents recursively, delete old
      await this.createDirectory(newPath);
      await this._copyDirContents(oldPath, newPath);
      await this.delete(oldPath);
    } else {
      // For files: read, write to new location, delete old
      const blob = await this.readFile(oldPath);
      await this.writeFile(newPath, blob);
      await this.delete(oldPath);
    }
  }

  async _copyDirContents(srcPath, destPath) {
    const entries = await this.listDirectory(srcPath);
    for (const entry of entries) {
      const srcEntryPath = srcPath === '/' ? '/' + entry.name : srcPath + '/' + entry.name;
      const destEntryPath = destPath === '/' ? '/' + entry.name : destPath + '/' + entry.name;
      if (entry.isDirectory) {
        await this.createDirectory(destEntryPath);
        await this._copyDirContents(srcEntryPath, destEntryPath);
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
    if (path === '/') return { name: '/', isDirectory: true, size: 0, lastModified: 0 };
    try {
      const { parentPath, name } = this._splitPath(path);
      const dirHandle = await this._resolveDirHandle(parentPath);

      // Try as file
      try {
        const fh = await dirHandle.getFileHandle(name);
        const file = await fh.getFile();
        return { name, isDirectory: false, size: file.size, lastModified: file.lastModified };
      } catch {}

      // Try as directory
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
