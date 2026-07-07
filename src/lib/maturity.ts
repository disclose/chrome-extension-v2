import type { IconState, ProgramSnapshot } from '../types';

function safeHarborIsFull(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  if (v === 'full') return true;
  // Some directory entries write out the policy text. Treat verbose entries that
  // mention safe harbor without "none"/"partial" as full when the field is long.
  if (v.length > 80 && !v.includes('partial') && !v.includes('none')) return true;
  return false;
}

function safeHarborIsNone(value: string | undefined): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  return v === '' || v === 'none' || v === 'no' || v === 'n/a';
}

function isLevel5(program: ProgramSnapshot): boolean {
  if (typeof program.maturityScore === 'number' && program.maturityScore >= 80) return true;
  const level = program.maturityLevel?.toLowerCase() ?? '';
  if (/level\s*5/.test(level) || level === 'full') {
    return safeHarborIsFull(program.safeHarbor);
  }
  return false;
}

export function iconStateFor(program: ProgramSnapshot | undefined): IconState {
  if (!program) return 'none';
  if (isLevel5(program)) return 'level5';
  if (safeHarborIsFull(program.safeHarbor)) return 'safe-harbor';
  if (program.policyUrl || program.contactUrl || program.contactEmail) return 'vdp';
  return 'none';
}

/**
 * Map a program's maturity onto directory.disclose.io's own visual ramp.
 * The directory encodes maturity as escalating purple saturation
 * (Basic/security.txt = lightest → Full = mid → Full+CVD = solid brand). We
 * mirror that with three intensities so the popup badge reads the same as a
 * directory row. Label-first (the directory's tier vocabulary), score-fallback.
 */
export type MaturityTier = 'basic' | 'partial' | 'full' | 'top';

export function maturityTier(program: ProgramSnapshot | undefined): MaturityTier {
  if (!program) return 'basic';
  const level = (program.maturityLevel ?? '').toLowerCase().trim();
  // The directory renders four distinct badge colours; we match its rungs 1:1.
  // ORDER IS LOAD-BEARING: "Full+CVD" matches both the top branch and the plain
  // `\bfull\b` branch, so top MUST be tested before full or it silently downgrades.
  // Top: Full+CVD (full + proactive timeline) and the extension's own Level 5/4.
  if (/full\s*\+|cvd|level\s*[45]\b|\bl[45]\b/.test(level)) return 'top';
  // Full: explicitly authorises testing + law exemptions.
  if (/\bfull\b/.test(level)) return 'full';
  // Partial: won't-pursue-legal (safe-harbor without full authorisation), Advanced.
  if (/partial|advanced|intermediate|level\s*3\b|\bl3\b/.test(level)) return 'partial';
  // Basic: public policy + channel, security.txt (intake exists), low levels.
  if (/basic|security\.?txt|level\s*[0-2]\b|\bl[0-2]\b|none/.test(level)) return 'basic';
  // Unrecognised label → lean on the numeric score (label always dominates above).
  const s = program.maturityScore;
  if (typeof s === 'number') {
    if (s >= 80) return 'top';
    if (s >= 65) return 'full';
    if (s >= 45) return 'partial';
    return 'basic';
  }
  return 'basic';
}

export function verdictFor(state: IconState, program?: ProgramSnapshot): {
  headline: string;
  detail: string;
  tone: 'celebrate' | 'positive' | 'neutral' | 'concern';
} {
  switch (state) {
    case 'level5':
      return {
        headline: 'Best-practice security disclosure',
        detail:
          program
            ? `${program.programName} is recognized at Maturity Level 5 — a clear, researcher-safe way to report security issues.`
            : 'This site has reached the highest disclosure-maturity tier.',
        tone: 'celebrate',
      };
    case 'safe-harbor':
      return {
        headline: 'Welcomes security reports — researcher-safe',
        detail:
          program
            ? `${program.programName} accepts security research and protects researchers acting in good faith.`
            : 'This site has a published policy and full safe harbor.',
        tone: 'positive',
      };
    case 'vdp':
      return {
        headline: 'Has a way to report security issues',
        detail:
          program
            ? `${program.programName} publishes a security contact, but does not offer full safe-harbor protections for researchers.`
            : 'This site has a security contact, but does not offer full safe-harbor protections.',
        tone: 'neutral',
      };
    case 'none':
      return {
        headline: 'No published way to report security problems',
        detail:
          'This site is not in the disclose.io directory. Researchers may have nowhere clear to send security findings.',
        tone: 'concern',
      };
    case 'unknown':
    default:
      return {
        headline: 'Checking…',
        detail: 'Looking this site up in the disclose.io directory.',
        tone: 'neutral',
      };
  }
}

export function safeHarborLabel(value: string | undefined): string {
  if (safeHarborIsNone(value)) return 'None';
  if (safeHarborIsFull(value)) return 'Full';
  return value!;
}
