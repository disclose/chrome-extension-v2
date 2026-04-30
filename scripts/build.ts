#!/usr/bin/env bun
import { build } from 'esbuild';
import { mkdir, writeFile, readFile, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dir, '..');
const DIST = path.join(ROOT, 'dist');

const ICON_SIZES = [16, 32, 48, 128] as const;
type IconState = 'unknown' | 'none' | 'vdp' | 'safe-harbor' | 'level5';

interface IconTheme {
  body: string;
  glow: string;
  stroke: string;
  fg: string;
  glyph: string;
  extraGroupAttrs?: string;
  overlay?: string;
}

const ICON_THEMES: Record<IconState, IconTheme> = {
  unknown: {
    body: '#9ca3af',
    glow: '#d1d5db',
    stroke: '#6b7280',
    fg: '#ffffff',
    glyph:
      // dot
      '<circle cx="64" cy="64" r="10"/>',
  },
  none: {
    body: '#9ca3af',
    glow: '#d1d5db',
    stroke: '#6b7280',
    fg: '#ffffff',
    // bold ?
    glyph:
      '<text x="64" y="92" font-family="Helvetica, Arial, sans-serif" font-size="86" font-weight="900" text-anchor="middle">?</text>',
  },
  vdp: {
    body: '#a78bfa',
    glow: '#ddd6fe',
    stroke: '#7c3aed',
    fg: '#ffffff',
    // checkmark
    glyph:
      '<path d="M40 66 L58 84 L92 46" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  },
  'safe-harbor': {
    body: '#7c3aed',
    glow: '#a78bfa',
    stroke: '#5b21b6',
    fg: '#ffffff',
    // shield with check
    glyph:
      '<path d="M64 22 L96 36 V66 C96 82 80 96 64 102 C48 96 32 82 32 66 V36 Z" fill="#ffffff" opacity="0.18"/><path d="M40 66 L58 84 L92 46" stroke="#ffffff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  },
  level5: {
    body: '#4c1d95',
    glow: '#7c3aed',
    stroke: '#3c1361',
    fg: '#fde68a',
    glyph:
      // sparkle star + "5"
      '<text x="64" y="86" font-family="Helvetica, Arial, sans-serif" font-size="74" font-weight="900" text-anchor="middle" fill="#fde68a">5</text>',
    overlay:
      '<g fill="#fde68a"><circle cx="100" cy="28" r="6"/><path d="M100 16 L100 40 M88 28 L112 28" stroke="#fde68a" stroke-width="3" stroke-linecap="round"/></g>',
  },
};

async function ensureDir(p: string): Promise<void> {
  if (!existsSync(p)) await mkdir(p, { recursive: true });
}

async function clean(): Promise<void> {
  await rm(DIST, { recursive: true, force: true });
  await ensureDir(DIST);
  await ensureDir(path.join(DIST, 'icons'));
}

async function bundleScripts(): Promise<void> {
  await build({
    entryPoints: {
      background: path.join(ROOT, 'src/background.ts'),
      popup: path.join(ROOT, 'src/popup/popup.ts'),
    },
    outdir: DIST,
    bundle: true,
    minify: true,
    sourcemap: false,
    format: 'esm',
    target: 'chrome116',
    platform: 'browser',
    logLevel: 'info',
  });
}

async function copyStaticAssets(): Promise<void> {
  await copyFile(path.join(ROOT, 'manifest.json'), path.join(DIST, 'manifest.json'));
  await copyFile(path.join(ROOT, 'src/popup/popup.html'), path.join(DIST, 'popup.html'));
  await copyFile(path.join(ROOT, 'src/popup/popup.css'), path.join(DIST, 'popup.css'));
}

async function renderIcons(): Promise<void> {
  const tpl = await readFile(path.join(ROOT, 'assets/icon.svg'), 'utf8');

  for (const [state, theme] of Object.entries(ICON_THEMES) as [IconState, IconTheme][]) {
    const svg = tpl
      .replace('__BODY__', theme.body)
      .replace('__GLOW__', theme.glow)
      .replace('__STROKE__', theme.stroke)
      .replace('__FG__', theme.fg)
      .replace('__GLYPH__', theme.glyph)
      .replace('__EXTRA_GROUP_ATTRS__', theme.extraGroupAttrs ?? '')
      .replace('__OVERLAY__', theme.overlay ?? '');
    const svgBuf = Buffer.from(svg, 'utf8');
    for (const size of ICON_SIZES) {
      const out = path.join(DIST, 'icons', `${state}-${size}.png`);
      await sharp(svgBuf).resize(size, size).png({ compressionLevel: 9 }).toFile(out);
    }
  }
}

async function writeBuildInfo(): Promise<void> {
  const info = {
    builtAt: new Date().toISOString(),
    version: JSON.parse(await readFile(path.join(ROOT, 'manifest.json'), 'utf8')).version,
  };
  await writeFile(path.join(DIST, 'build-info.json'), JSON.stringify(info, null, 2));
}

async function main(): Promise<void> {
  console.log('Cleaning…');
  await clean();
  console.log('Bundling scripts…');
  await bundleScripts();
  console.log('Copying static assets…');
  await copyStaticAssets();
  console.log('Rendering icons…');
  await renderIcons();
  await writeBuildInfo();
  console.log(`✓ Built to ${DIST}`);
}

await main();
