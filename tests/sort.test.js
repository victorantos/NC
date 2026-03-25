import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sortEntries } from '../js/core/sort.js';

const makeEntry = (name, isDirectory = false, size = 0, lastModified = 0) =>
    ({ name, isDirectory, size, lastModified });

const entries = [
    makeEntry('readme.md', false, 1024, 3000),
    makeEntry('..', true),
    makeEntry('src', true, 0, 2000),
    makeEntry('app.js', false, 512, 1000),
    makeEntry('lib', true, 0, 4000),
    makeEntry('zebra.txt', false, 2048, 5000),
    makeEntry('alpha.css', false, 256, 6000),
];

describe('sortEntries', () => {
    it('always puts ".." first', () => {
        const sorted = sortEntries(entries, 'name', true);
        assert.strictEqual(sorted[0].name, '..');
    });

    it('puts directories before files', () => {
        const sorted = sortEntries(entries, 'name', true);
        const firstFileIndex = sorted.findIndex((e) => !e.isDirectory);
        const lastDirIndex = sorted.findLastIndex((e) => e.isDirectory);
        assert.ok(lastDirIndex < firstFileIndex, 'directories should come before files');
    });

    it('sorts by name ascending', () => {
        const sorted = sortEntries(entries, 'name', true);
        const files = sorted.filter((e) => !e.isDirectory && e.name !== '..');
        const names = files.map((e) => e.name);
        assert.deepStrictEqual(names, ['alpha.css', 'app.js', 'readme.md', 'zebra.txt']);
    });

    it('sorts by name descending', () => {
        const sorted = sortEntries(entries, 'name', false);
        const files = sorted.filter((e) => !e.isDirectory && e.name !== '..');
        const names = files.map((e) => e.name);
        assert.deepStrictEqual(names, ['zebra.txt', 'readme.md', 'app.js', 'alpha.css']);
    });

    it('sorts by extension', () => {
        const sorted = sortEntries(entries, 'ext', true);
        const files = sorted.filter((e) => !e.isDirectory && e.name !== '..');
        const names = files.map((e) => e.name);
        assert.strictEqual(names[0], 'alpha.css');
        assert.strictEqual(names[1], 'app.js');
    });

    it('sorts by size ascending', () => {
        const sorted = sortEntries(entries, 'size', true);
        const files = sorted.filter((e) => !e.isDirectory && e.name !== '..');
        const sizes = files.map((e) => e.size);
        for (let i = 1; i < sizes.length; i++) {
            assert.ok(sizes[i] >= sizes[i - 1]);
        }
    });

    it('sorts by date ascending', () => {
        const sorted = sortEntries(entries, 'date', true);
        const files = sorted.filter((e) => !e.isDirectory && e.name !== '..');
        const dates = files.map((e) => e.lastModified);
        for (let i = 1; i < dates.length; i++) {
            assert.ok(dates[i] >= dates[i - 1]);
        }
    });

    it('returns a new array (non-mutating)', () => {
        const sorted = sortEntries(entries, 'name', true);
        assert.notStrictEqual(sorted, entries);
    });

    it('handles empty array', () => {
        const sorted = sortEntries([], 'name', true);
        assert.deepStrictEqual(sorted, []);
    });

    it('directories sort among themselves by name', () => {
        const sorted = sortEntries(entries, 'name', true);
        const dirs = sorted.filter((e) => e.isDirectory && e.name !== '..');
        const names = dirs.map((e) => e.name);
        assert.deepStrictEqual(names, ['lib', 'src']);
    });
});
