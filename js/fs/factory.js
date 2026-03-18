import { OPFSAdapter } from './opfs.js';
import { NativeFileSystemAdapter } from './native-fs.js';

export function isNativeFSSupported() {
  return typeof window.showDirectoryPicker === 'function';
}

export function isOPFSSupported() {
  return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

export async function createOPFSAdapter() {
  const adapter = new OPFSAdapter();
  await adapter.init();
  return adapter;
}

export async function createNativeAdapter() {
  if (!isNativeFSSupported()) {
    throw new Error('File System Access API is not supported in this browser');
  }
  const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
  return new NativeFileSystemAdapter(rootHandle);
}
