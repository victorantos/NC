import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { setClipboard, getClipboard, hasClipboard, clearClipboard } from '../js/core/clipboard.js';

describe('clipboard', () => {
    beforeEach(() => {
        clearClipboard();
    });

    it('starts empty', () => {
        assert.strictEqual(getClipboard(), null);
        assert.strictEqual(hasClipboard(), false);
    });

    it('stores clipboard state', () => {
        setClipboard('copy', [{ name: 'file.txt' }], '/src', 'opfs');
        assert.ok(hasClipboard());
        const clip = getClipboard();
        assert.strictEqual(clip.operation, 'copy');
        assert.strictEqual(clip.entries.length, 1);
        assert.strictEqual(clip.sourcePath, '/src');
        assert.strictEqual(clip.sourceAdapter, 'opfs');
    });

    it('clears clipboard', () => {
        setClipboard('cut', [], '/', null);
        clearClipboard();
        assert.strictEqual(hasClipboard(), false);
        assert.strictEqual(getClipboard(), null);
    });

    it('overwrites previous clipboard', () => {
        setClipboard('copy', [{ name: 'a.txt' }], '/a', 'opfs');
        setClipboard('cut', [{ name: 'b.txt' }], '/b', 'native');
        const clip = getClipboard();
        assert.strictEqual(clip.operation, 'cut');
        assert.strictEqual(clip.entries[0].name, 'b.txt');
    });
});
