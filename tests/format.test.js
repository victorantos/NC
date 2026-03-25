import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatFileSize, formatDate, getExtension, isTextFile, getMimeType, escapeHtml } from '../js/core/format.js';

describe('formatFileSize', () => {
    it('returns <DIR> for directories', () => {
        assert.strictEqual(formatFileSize(1024, true), '<DIR>');
    });

    it('returns empty string for null/undefined', () => {
        assert.strictEqual(formatFileSize(null), '');
        assert.strictEqual(formatFileSize(undefined), '');
    });

    it('returns empty string for NaN', () => {
        assert.strictEqual(formatFileSize(NaN), '');
    });

    it('formats bytes', () => {
        assert.strictEqual(formatFileSize(0), '0 B');
        assert.strictEqual(formatFileSize(512), '512 B');
        assert.strictEqual(formatFileSize(1023), '1023 B');
    });

    it('formats kilobytes', () => {
        assert.strictEqual(formatFileSize(1024), '1.0 KB');
        assert.strictEqual(formatFileSize(1536), '1.5 KB');
    });

    it('formats megabytes', () => {
        assert.strictEqual(formatFileSize(1048576), '1.0 MB');
    });

    it('formats gigabytes', () => {
        assert.strictEqual(formatFileSize(1073741824), '1.0 GB');
    });

    it('formats terabytes', () => {
        assert.strictEqual(formatFileSize(1099511627776), '1.0 TB');
    });
});

describe('formatDate', () => {
    it('returns empty string for null/undefined', () => {
        assert.strictEqual(formatDate(null), '');
        assert.strictEqual(formatDate(undefined), '');
    });

    it('returns empty string for invalid date', () => {
        assert.strictEqual(formatDate('not-a-date'), '');
    });

    it('formats Date objects', () => {
        const d = new Date(2026, 2, 25, 14, 30); // March 25, 2026 14:30
        assert.strictEqual(formatDate(d), '2026-03-25 14:30');
    });

    it('formats timestamps', () => {
        const d = new Date(2026, 0, 1, 9, 5); // Jan 1, 2026 09:05
        assert.strictEqual(formatDate(d.getTime()), '2026-01-01 09:05');
    });

    it('zero-pads single digit months, days, hours, minutes', () => {
        const d = new Date(2026, 0, 5, 3, 7);
        assert.strictEqual(formatDate(d), '2026-01-05 03:07');
    });
});

describe('getExtension', () => {
    it('returns empty string for directories', () => {
        assert.strictEqual(getExtension('folder', true), '');
    });

    it('returns empty string for no extension', () => {
        assert.strictEqual(getExtension('Makefile'), '');
    });

    it('returns empty string for dotfiles', () => {
        assert.strictEqual(getExtension('.gitignore'), '');
    });

    it('returns empty string for trailing dot', () => {
        assert.strictEqual(getExtension('file.'), '');
    });

    it('returns lowercase extension', () => {
        assert.strictEqual(getExtension('photo.JPG'), 'jpg');
        assert.strictEqual(getExtension('style.CSS'), 'css');
    });

    it('returns last extension for multiple dots', () => {
        assert.strictEqual(getExtension('archive.tar.gz'), 'gz');
    });

    it('returns empty string for null/empty', () => {
        assert.strictEqual(getExtension(''), '');
        assert.strictEqual(getExtension(null), '');
    });
});

describe('isTextFile', () => {
    it('returns false for empty/null', () => {
        assert.strictEqual(isTextFile(''), false);
        assert.strictEqual(isTextFile(null), false);
    });

    it('returns true for known text extensions', () => {
        assert.ok(isTextFile('app.js'));
        assert.ok(isTextFile('style.css'));
        assert.ok(isTextFile('README.md'));
        assert.ok(isTextFile('data.json'));
        assert.ok(isTextFile('index.html'));
    });

    it('returns false for binary extensions', () => {
        assert.strictEqual(isTextFile('photo.png'), false);
        assert.strictEqual(isTextFile('song.mp3'), false);
        assert.strictEqual(isTextFile('archive.zip'), false);
    });

    it('returns true for files without extension', () => {
        assert.ok(isTextFile('Makefile'));
    });
});

describe('getMimeType', () => {
    it('returns correct MIME for known extensions', () => {
        assert.strictEqual(getMimeType('index.html'), 'text/html');
        assert.strictEqual(getMimeType('app.js'), 'text/javascript');
        assert.strictEqual(getMimeType('style.css'), 'text/css');
        assert.strictEqual(getMimeType('data.json'), 'application/json');
        assert.strictEqual(getMimeType('photo.png'), 'image/png');
        assert.strictEqual(getMimeType('image.jpg'), 'image/jpeg');
    });

    it('returns application/octet-stream for unknown extensions', () => {
        assert.strictEqual(getMimeType('file.xyz'), 'application/octet-stream');
    });
});

describe('escapeHtml', () => {
    it('returns empty string for falsy input', () => {
        assert.strictEqual(escapeHtml(''), '');
        assert.strictEqual(escapeHtml(null), '');
        assert.strictEqual(escapeHtml(undefined), '');
    });

    it('escapes all special characters', () => {
        assert.strictEqual(escapeHtml('<script>alert("xss")</script>'),
            '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('escapes ampersands', () => {
        assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
    });

    it('escapes single quotes', () => {
        assert.strictEqual(escapeHtml("it's"), 'it&#39;s');
    });

    it('leaves safe strings unchanged', () => {
        assert.strictEqual(escapeHtml('hello world'), 'hello world');
    });
});
