// Internal clipboard state for file operations
let clipboardState = null;

export function setClipboard(operation, entries, sourcePath, sourceAdapter) {
  clipboardState = { operation, entries, sourcePath, sourceAdapter };
}

export function getClipboard() {
  return clipboardState;
}

export function clearClipboard() {
  clipboardState = null;
}

export function hasClipboard() {
  return clipboardState !== null;
}
