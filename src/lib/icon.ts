import type { IconState } from '../types';
import { verdictFor } from './maturity';

const SIZES = [16, 32, 48, 128] as const;

function pathsFor(state: IconState): chrome.action.TabIconDetails['path'] {
  const paths: Record<string, string> = {};
  for (const size of SIZES) {
    paths[String(size)] = `icons/${state}-${size}.png`;
  }
  return paths;
}

const TITLES: Record<IconState, string> = {
  unknown: 'disclose.io — checking…',
  none: 'disclose.io — no published security disclosure for this site',
  vdp: 'disclose.io — this site has a security-report channel',
  'safe-harbor': 'disclose.io — this site welcomes researchers (safe harbor)',
  level5: 'disclose.io — best-practice security disclosure',
};

export async function paintIcon(tabId: number, state: IconState): Promise<void> {
  try {
    await chrome.action.setIcon({ tabId, path: pathsFor(state) });
    await chrome.action.setTitle({ tabId, title: TITLES[state] });
  } catch {
    // Tab may have been closed before we got here; ignore.
  }
}

export function ariaVerdictFor(state: IconState): string {
  return verdictFor(state).headline;
}
