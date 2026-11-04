// Canned JSON:API responses from api.disclosebot.io's public directory API.
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
    id: program.slug,
    type: 'directory_organization',
    attributes: {
      name: program.programName,
      slug: program.slug,
      safe_harbor: program.safeHarbor,
      offers_bounty: program.offersBounty,
      offers_swag: program.offersSwag,
      maturity_level: program.maturityLevel === 'Level 5' ? 5 : program.maturityLevel === 'Partial' ? 3 : 2,
      maturity_label: program.maturityLevel,
      maturity_score: program.maturityScore,
      policy_url: program.policyUrl,
      security_txt_url: program.securityTxtUrl,
      contact_url: program.contactValue,
    },
    relationships: { policies: { data: [{ id: `policy-${program.slug}`, type: 'policy_summary' }] } },
  };
}

function policy(program: FixtureProgram) {
  return {
    id: `policy-${program.slug}`,
    type: 'policy_summary',
    attributes: {
      policy_url: program.policyUrl,
      point_of_contact: program.contactValue,
      securitytxt_url: program.securityTxtUrl,
      safe_harbor: program.safeHarbor,
      offers_bounty: program.offersBounty,
      offers_swag: program.offersSwag,
    },
  };
}

export function listResponseFor(query: string): string {
  const program = PROGRAMS[query.toLowerCase()];
  return JSON.stringify({ data: program ? [organization(program)] : [], included: program ? [policy(program)] : [] });
}

export function detailResponseFor(slug: string): string {
  const program = Object.values(PROGRAMS).find((candidate) => candidate.slug === slug);
  if (!program) return JSON.stringify({ error: 'not found' });
  return JSON.stringify({
    data: organization(program),
    included: [policy(program)],
  });
}

export const KNOWN_DOMAINS = Object.keys(PROGRAMS);
