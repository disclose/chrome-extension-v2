import { describe, expect, test } from 'bun:test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');

describe('release contract', () => {
  test('keeps package and Chrome manifest versions synchronized', async () => {
    const packageJson = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
    const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
    expect(packageJson.version).toBe('0.2.2');
    expect(manifest.version).toBe(packageJson.version);
    expect(manifest.manifest_version).toBe(3);
  });

  test('meets Chrome Web Store description and summary limits', async () => {
    const manifest = JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8'));
    const listing = await readFile(path.join(ROOT, 'store/LISTING.md'), 'utf8');
    expect(manifest.description.length).toBeGreaterThan(0);
    expect(manifest.description.length).toBeLessThanOrEqual(132);
    const summary = listing.match(/## Summary[^\n]*\n+([^\n]+)/i)?.[1];
    expect(summary).toBeDefined();
    expect(summary!.length).toBeLessThanOrEqual(132);
  });

  test('keeps the downloadable archive versioned and checksum-backed', async () => {
    const packageJson = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8'));
    const packager = await readFile(path.join(ROOT, 'scripts/package.ts'), 'utf8');
    const readme = await readFile(path.join(ROOT, 'README.md'), 'utf8');
    expect(packageJson.scripts.package).toBe('bun scripts/package.ts');
    expect(packager).toContain('disclose-extension-v${manifest.version}.zip');
    expect(packager).toContain("'SHA256SUMS'");
    expect(readme).toContain('disclose-extension-v*.zip');
  });
});
