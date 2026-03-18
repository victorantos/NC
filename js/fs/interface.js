/**
 * @typedef {Object} FileEntry
 * @property {string} name        - File or directory name
 * @property {boolean} isDirectory - true if directory
 * @property {number} size        - File size in bytes (0 for dirs)
 * @property {number} lastModified - Timestamp ms (0 if unknown)
 */

/**
 * FileSystemAdapter interface contract.
 * Both NativeFileSystemAdapter and OPFSAdapter implement these methods.
 *
 * All path arguments are absolute paths starting with "/".
 * The root is "/" which maps to the root directory handle.
 *
 * Methods:
 * - async listDirectory(path) → FileEntry[]
 * - async readFile(path) → Blob
 * - async readTextFile(path) → string
 * - async writeFile(path, content) → void  (content: Blob | string)
 * - async createDirectory(path) → void
 * - async delete(path) → void  (recursive for directories)
 * - async rename(oldPath, newPath) → void
 * - async exists(path) → boolean
 * - async getEntry(path) → FileEntry | null
 * - getType() → string  ('native' | 'opfs')
 * - getRootName() → string  (display name for root)
 */
export default {};
