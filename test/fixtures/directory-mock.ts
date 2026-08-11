// Canned responses from directory.disclose.io's public widget JSON API.
// Keep these aligned with the normalized contract in src/lib/directory.ts.

interface FixtureProgram {
  slug: string;
  programName: string;
  policyUrl: string;
  contactValue: string;
  securityTxtUrl?: string;
  safeHarbor?: string;
  offersBounty?: boolean;
  offersSwag?: boolean;
  maturityLevel?: string;
  maturityScore?: number;
}

const PROGRAMS: Record<string, FixtureProgram> = {
  'level5-example.test': {
    slug: 'level5-example-test',
    programName: 'Level5 Example (level5-example.test)',
    policyUrl: 'https://level5-example.test/security',
    contactValue: 'security@level5-example.test',
    securityTxtUrl: 'https://level5-example.test/.well-known/security.txt',
    safeHarbor: 'Full',
    offersBounty: true,
    offersSwag: true,
    maturityLevel: 'Level 5',
    maturityScore: 95.0,
  },
  'safeharbor-example.test': {
    slug: 'safeharbor-example-test',
    programName: 'Safe Harbor Example (safeharbor-example.test)',
    policyUrl: 'https://safeharbor-example.test/disclosure',
    contactValue: 'security@safeharbor-example.test',
    safeHarbor: 'Full',
    offersBounty: false,
    offersSwag: false,
    maturityLevel: 'Partial',
    maturityScore: 65.0,
  },
  'vdp-only-example.test': {
    slug: 'vdp-only-example-test',
    programName: 'VDP Only Example (vdp-only-example.test)',
    policyUrl: 'https://vdp-only-example.test/security',
    contactValue: 'security@vdp-only-example.test',
    safeHarbor: 'None',
    offersBounty: false,
    offersSwag: false,
    maturityLevel: 'Basic',
    maturityScore: 40.0,
  },
};

function organization(program: FixtureProgram) {
  return {
    name: program.programName,
    slug: program.slug,
    safeHarbor: program.safeHarbor,
    offersBounty: program.offersBounty,
    offersSwag: program.offersSwag,
    maturity: { label: program.maturityLevel, score: program.maturityScore },
    policies: [{
      policyUrl: program.policyUrl,
      pointOfContact: program.contactValue,
      securitytxtUrl: program.securityTxtUrl,
      safeHarbor: program.safeHarbor,
      offersBounty: program.offersBounty,
      offersSwag: program.offersSwag,
    }],
  };
}

export function listResponseFor(query: string): string {
  const program = PROGRAMS[query.toLowerCase()];
  return JSON.stringify({ organizations: program ? [organization(program)] : [] });
}

export function detailResponseFor(slug: string): string {
  const program = Object.values(PROGRAMS).find((candidate) => candidate.slug === slug);
  if (!program) return JSON.stringify({ error: 'not found' });
  return JSON.stringify({
    ...organization(program),
    policyUrl: program.policyUrl,
    contactUrl: program.contactValue,
    securityTxtUrl: program.securityTxtUrl,
  });
}

export const KNOWN_DOMAINS = Object.keys(PROGRAMS);
