import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));

test('PWA manifest includes install details and local icons at 192 and 512 pixels', () => {
  assert.equal(manifest.lang, 'de-DE');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.start_url, '/');
  assert.ok(manifest.icons.some((icon) => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some((icon) => icon.sizes === '512x512'));
  for (const icon of manifest.icons) {
    const path = new URL(`..${icon.src}`, import.meta.url);
    assert.ok(existsSync(path), `${icon.src} should be present in the app shell`);
    if (icon.type === 'image/png') {
      const image = readFileSync(path);
      assert.equal(image.readUInt32BE(16), Number.parseInt(icon.sizes, 10));
      assert.equal(image.readUInt32BE(20), Number.parseInt(icon.sizes, 10));
    }
  }
});
