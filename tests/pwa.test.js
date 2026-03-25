import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf-8'));
const indexHtml = await readFile(new URL('index.html', root), 'utf-8');
const swSource = await readFile(new URL('sw.js', root), 'utf-8');

describe('manifest.json', () => {
    it('has required fields', () => {
        const required = ['name', 'short_name', 'start_url', 'display', 'icons'];
        for (const field of required) {
            assert.ok(field in manifest, `missing "${field}"`);
        }
    });

    it('display is standalone', () => {
        assert.strictEqual(manifest.display, 'standalone');
    });

    it('has NC blue theme colors', () => {
        assert.strictEqual(manifest.background_color, '#0000AA');
        assert.strictEqual(manifest.theme_color, '#0000AA');
    });

    it('has icons at required sizes', () => {
        const sizes = manifest.icons.map((i) => i.sizes);
        assert.ok(sizes.includes('192x192'), 'missing 192x192 icon');
        assert.ok(sizes.includes('512x512'), 'missing 512x512 icon');
    });

    it('icon files exist', async () => {
        for (const icon of manifest.icons) {
            const iconPath = new URL(icon.src.replace(/^\//, ''), root);
            await assert.doesNotReject(access(iconPath, constants.R_OK), `icon missing: ${icon.src}`);
        }
    });
});

describe('index.html', () => {
    it('has apple-mobile-web-app-capable', () => {
        assert.ok(indexHtml.includes('apple-mobile-web-app-capable'));
    });

    it('has theme-color meta', () => {
        assert.ok(indexHtml.includes('theme-color'));
    });

    it('has viewport meta', () => {
        assert.ok(indexHtml.includes('viewport'));
    });

    it('links to manifest.json', () => {
        assert.ok(indexHtml.includes('manifest.json'));
    });

    it('has apple-touch-icon', () => {
        assert.ok(indexHtml.includes('apple-touch-icon'));
    });

    it('loads app.js as module', () => {
        assert.ok(indexHtml.includes('type="module"'));
    });
});

describe('Service Worker', () => {
    it('defines a cache name', () => {
        assert.ok(swSource.includes('CACHE_NAME'));
    });

    it('caches core static assets', () => {
        const required = ['index.html', 'variables.css', 'layout.css', 'components.css', 'app.js', 'format.js', 'sort.js', 'state.js'];
        for (const asset of required) {
            assert.ok(swSource.includes(asset), `missing cached asset: ${asset}`);
        }
    });

    it('all cached files exist on disk', async () => {
        const assetMatch = swSource.match(/ASSETS\s*=\s*\[([\s\S]*?)\]/);
        assert.ok(assetMatch, 'could not find ASSETS array');
        const paths = assetMatch[1].match(/'([^']+)'/g).map((p) => p.replace(/'/g, ''));
        for (const p of paths) {
            if (p === '/') continue;
            const filePath = new URL(p.replace(/^\//, ''), root);
            await assert.doesNotReject(access(filePath, constants.R_OK), `cached file missing: ${p}`);
        }
    });

    it('handles install event', () => {
        assert.ok(swSource.includes("addEventListener('install'"));
    });

    it('handles activate event', () => {
        assert.ok(swSource.includes("addEventListener('activate'"));
    });

    it('handles fetch event', () => {
        assert.ok(swSource.includes("addEventListener('fetch'"));
    });

    it('calls skipWaiting', () => {
        assert.ok(swSource.includes('skipWaiting'));
    });

    it('calls clients.claim', () => {
        assert.ok(swSource.includes('clients.claim'));
    });
});
