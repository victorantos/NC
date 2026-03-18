/**
 * Format a file size in bytes to a human-readable string.
 * Uses 1024 base. Shows integers for bytes, 1 decimal for larger units.
 * Directories return '<DIR>'.
 * @param {number} bytes
 * @param {boolean} [isDirectory=false]
 * @returns {string}
 */
export function formatFileSize(bytes, isDirectory = false) {
  if (isDirectory) return '<DIR>';
  if (bytes == null || isNaN(bytes)) return '';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let unitIndex = 0;
  let size = bytes;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  if (unitIndex === 0) {
    return `${Math.round(size)} ${units[unitIndex]}`;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Format a date to 'YYYY-MM-DD HH:mm' string.
 * @param {Date|number|null|undefined} date
 * @returns {string}
 */
export function formatDate(date) {
  if (date == null) return '';

  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * Get the lowercase extension of a filename without the dot.
 * Directories return ''. No extension returns ''.
 * @param {string} filename
 * @param {boolean} [isDirectory=false]
 * @returns {string}
 */
export function getExtension(filename, isDirectory = false) {
  if (isDirectory) return '';
  if (!filename) return '';

  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return '';

  return filename.slice(lastDot + 1).toLowerCase();
}

const TEXT_EXTENSIONS = new Set([
  'txt', 'js', 'jsx', 'ts', 'tsx', 'css', 'html', 'htm', 'xml',
  'json', 'md', 'yml', 'yaml', 'toml', 'ini', 'cfg', 'conf',
  'sh', 'bash', 'zsh', 'py', 'rb', 'java', 'c', 'h', 'cpp', 'hpp',
  'cs', 'go', 'rs', 'php', 'sql', 'env', 'gitignore', 'dockerfile',
  'makefile', 'log', 'csv', 'svg'
]);

/**
 * Check if a filename is a text file based on its extension.
 * Returns true for known text extensions and files with no extension.
 * @param {string} filename
 * @returns {boolean}
 */
export function isTextFile(filename) {
  if (!filename) return false;

  const ext = getExtension(filename);
  if (ext === '') return true; // No extension treated as text
  return TEXT_EXTENSIONS.has(ext);
}

const MIME_TYPES = {
  html: 'text/html',
  htm: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  jsx: 'text/javascript',
  ts: 'text/typescript',
  tsx: 'text/typescript',
  json: 'application/json',
  xml: 'application/xml',
  svg: 'image/svg+xml',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  py: 'text/x-python',
  rb: 'text/x-ruby',
  java: 'text/x-java',
  c: 'text/x-c',
  h: 'text/x-c',
  cpp: 'text/x-c++',
  hpp: 'text/x-c++',
  cs: 'text/x-csharp',
  go: 'text/x-go',
  rs: 'text/x-rust',
  php: 'text/x-php',
  sh: 'text/x-shellscript',
  bash: 'text/x-shellscript',
  zsh: 'text/x-shellscript',
  sql: 'text/x-sql',
  yml: 'text/yaml',
  yaml: 'text/yaml',
  toml: 'text/toml',
  ini: 'text/plain',
  cfg: 'text/plain',
  conf: 'text/plain',
  log: 'text/plain',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  pdf: 'application/pdf',
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  mp4: 'video/mp4',
  webm: 'video/webm',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf'
};

/**
 * Get the MIME type for a filename based on its extension.
 * @param {string} filename
 * @returns {string}
 */
export function getMimeType(filename) {
  const ext = getExtension(filename);
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Escape HTML special characters for safe insertion into HTML.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
