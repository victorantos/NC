import { getExtension } from './format.js';

/**
 * Sort file entries with directories before files,
 * ".." always first, and the specified field/direction.
 *
 * @param {Array} entries - Array of FileEntry objects
 * @param {string} field - 'name' | 'ext' | 'size' | 'date'
 * @param {boolean} ascending - true for ascending, false for descending
 * @returns {Array} new sorted array
 */
export function sortEntries(entries, field, ascending) {
  return [...entries].sort((a, b) => {
    // ".." always first
    if (a.name === '..') return -1;
    if (b.name === '..') return 1;

    // Directories before files
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    // Sort by field
    let cmp = 0;
    switch (field) {
      case 'name':
        cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        break;
      case 'ext':
        cmp = getExtension(a.name).localeCompare(getExtension(b.name));
        if (cmp === 0) {
          cmp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        }
        break;
      case 'size':
        cmp = (a.size || 0) - (b.size || 0);
        break;
      case 'date':
        cmp = (a.lastModified || 0) - (b.lastModified || 0);
        break;
    }

    return ascending ? cmp : -cmp;
  });
}
