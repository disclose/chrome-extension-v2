import { describe, expect, test } from 'bun:test';
import { iconStateFor, maturityTier } from '../src/lib/maturity';
import type { ProgramSnapshot } from '../src/types';

const program: ProgramSnapshot = {
  slug: 'example', programName: 'Example', directoryUrl: 'https://directory.disclose.io/o/example',
  safeHarbor: 'full', policyUrl: 'https://example.com/security',
};

describe('directory maturity tiers', () => {
  test('a high score never upgrades an explicit Level 4 to Level 5', () => {
    const value = { ...program, maturityRank: 4, maturityLevel: 'L4 Full Safe Harbor', maturityScore: 110 };
    expect(iconStateFor(value)).toBe('safe-harbor');
    expect(maturityTier(value)).toBe('full');
  });

  test('the API rank determines Level 5 independently of score scale', () => {
    const value = { ...program, maturityRank: 5, maturityLevel: 'L5 Full Safe Harbor + CVD', maturityScore: 70 };
    expect(iconStateFor(value)).toBe('level5');
    expect(maturityTier(value)).toBe('top');
  });

  test('label-only legacy data recognizes L5 and respects lower labels', () => {
    expect(iconStateFor({ ...program, maturityLevel: 'L5 Full Safe Harbor + CVD', maturityScore: 70 })).toBe('level5');
    expect(iconStateFor({ ...program, maturityLevel: 'L4 Full Safe Harbor', maturityScore: 110 })).toBe('safe-harbor');
    expect(maturityTier({ ...program, maturityLevel: 'L4 Full Safe Harbor', maturityScore: 110 })).toBe('full');
    expect(maturityTier({ ...program, maturityLevel: 'Level 4', maturityScore: 110 })).toBe('full');
  });

  test('a score alone cannot establish the top disclosure tier', () => {
    expect(iconStateFor({ ...program, maturityScore: 110 })).toBe('safe-harbor');
    expect(maturityTier({ ...program, maturityScore: 110 })).toBe('basic');
  });
});
