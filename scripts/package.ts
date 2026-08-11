#!/usr/bin/env bun
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const DIST = path.join(ROOT, 'dist');
const ARTIFACTS = path.join(ROOT, 'artifacts');

interface ExtensionManifest {
  version: string;
  manifest_version: number;
  background?: { service_worker?: string };
  action?: { default_popup?: string; default_icon?: Record<string, string> };
  icons?: Record<string, string>;
  declarative_net_request?: { rule_resources?: Array<{ path?: string }> };
}

interface PackageMetadata {
  version: string;
  manifest: ExtensionManifest;
  archiveName: string;
  archivePath: string;
}

function argumentValue(name: string): string | undefined {
  const index = Bun.argv.indexOf(name);
  return index >= 0 ? Bun.argv[index + 1] : undefined;
}

async function run(command: string[], cwd = ROOT): Promise<void> {
  const child = Bun.spawn(command, { cwd, stdout: 'inherit', stderr: 'inherit' });
  const exitCode = await child.exited;
  if (exitCode !== 0) throw new Error(`${command[0]} exited with code ${exitCode}`);
}

async function capture(command: string[], cwd = ROOT): Promise<string> {
  const child = Bun.spawn(command, { cwd, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(`${command[0]} exited with code ${exitCode}: ${stderr.trim()}`);
  }
  return stdout;
}

async function readMetadata(expectedTag?: string): Promise<PackageMetadata> {
  const packageJson = JSON.parse(await readFile(path.join(ROOT, 'package.json'), 'utf8')) as {
    version?: unknown;
  };
  const manifest = JSON.parse(
    await readFile(path.join(ROOT, 'manifest.json'), 'utf8'),
  ) as ExtensionManifest;
  if (typeof packageJson.version !== 'string' || packageJson.version !== manifest.version) {
    throw new Error(`version mismatch: package=${String(packageJson.version)} manifest=${manifest.version}`);
  }
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(manifest.version)) {
    throw new Error(`manifest version is not Chrome-compatible: ${manifest.version}`);
  }
  if (manifest.manifest_version !== 3) throw new Error('release manifest must use MV3');
  if (expectedTag && expectedTag !== `v${manifest.version}`) {
    throw new Error(`tag ${expectedTag} does not match version v${manifest.version}`);
  }
  const archiveName = `disclose-extension-v${manifest.version}.zip`;
  return {
    version: manifest.version,
    manifest,
    archiveName,
    archivePath: path.join(ARTIFACTS, archiveName),
  };
}

function runtimePaths(manifest: ExtensionManifest): string[] {
  const paths = new Set<string>();
  if (manifest.background?.service_worker) paths.add(manifest.background.service_worker);
  if (manifest.action?.default_popup) paths.add(manifest.action.default_popup);
  for (const icon of Object.values(manifest.action?.default_icon ?? {})) paths.add(icon);
  for (const icon of Object.values(manifest.icons ?? {})) paths.add(icon);
  for (const resource of manifest.declarative_net_request?.rule_resources ?? []) {
    if (resource.path) paths.add(resource.path);
  }
  return [...paths];
}

function normalizedArchivePath(entry: string): string {
  return entry.replace(/^\.\//, '').replace(/\/$/, '');
}

function forbiddenArchivePath(entry: string): boolean {
  const normalized = normalizedArchivePath(entry);
  const segments = normalized.split('/');
  return (
    normalized.endsWith('.map') ||
    normalized === '.env' ||
    normalized.startsWith('.env.') ||
    segments.some((segment) => ['.git', 'node_modules', 'src', 'test', 'scripts'].includes(segment)) ||
    segments.some((segment) => /^(?:id_rsa|id_ed25519|credentials|secrets?)(?:\.|$)/i.test(segment))
  );
}

async function verifyArchive(metadata: PackageMetadata): Promise<void> {
  const archiveStat = await stat(metadata.archivePath);
  if (!archiveStat.isFile() || archiveStat.size === 0) throw new Error('release archive is empty');

  const rawEntries = (await capture(['unzip', '-Z1', metadata.archivePath]))
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean);
  const entries = new Set(rawEntries.map(normalizedArchivePath));
  if (!entries.has('manifest.json')) throw new Error('manifest.json is not at the archive root');
  for (const required of runtimePaths(metadata.manifest)) {
    if (!entries.has(required)) throw new Error(`archive is missing manifest runtime asset: ${required}`);
  }
  const forbidden = rawEntries.filter(forbiddenArchivePath);
  if (forbidden.length > 0) throw new Error(`forbidden release paths: ${forbidden.join(', ')}`);

  const manifestText = await capture(['unzip', '-p', metadata.archivePath, 'manifest.json']);
  const archivedManifest = JSON.parse(manifestText) as ExtensionManifest;
  if (archivedManifest.version !== metadata.version) {
    throw new Error(`archive version ${archivedManifest.version} does not match ${metadata.version}`);
  }

  const secretPattern = /-----BEGIN [A-Z ]*PRIVATE KEY-----|\bghp_[A-Za-z0-9]{20,}\b|\bgithub_pat_[A-Za-z0-9_]{20,}\b|\bsk-[A-Za-z0-9]{20,}\b/;
  for (const entry of rawEntries.filter((name) => /\.(?:css|html|js|json)$/i.test(name))) {
    const contents = await capture(['unzip', '-p', metadata.archivePath, entry]);
    if (secretPattern.test(contents)) throw new Error(`possible secret found in archive entry: ${entry}`);
  }
}

async function main(): Promise<void> {
  const expectedTag = argumentValue('--tag');
  const metadata = await readMetadata(expectedTag);
  if (Bun.argv.includes('--check')) {
    console.log(`✓ package and manifest versions match ${metadata.version}`);
    return;
  }

  await run([process.execPath, path.join(ROOT, 'scripts/build.ts')]);
  await rm(ARTIFACTS, { recursive: true, force: true });
  await mkdir(ARTIFACTS, { recursive: true });
  await run(['zip', '-q', '-r', metadata.archivePath, '.', '-x', '*.map'], DIST);
  await verifyArchive(metadata);

  const digest = createHash('sha256').update(await readFile(metadata.archivePath)).digest('hex');
  await writeFile(path.join(ARTIFACTS, 'SHA256SUMS'), `${digest}  ${metadata.archiveName}\n`);
  console.log(`✓ Packaged ${metadata.archivePath}`);
  console.log(`✓ SHA-256 ${digest}`);
}

await main();
