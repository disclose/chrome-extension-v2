// Canned directory.disclose.io HTML responses, hand-crafted to exercise the
// regex parsers in src/lib/directory.ts. Tweak these if the directory's HTML
// shape evolves and re-sync with lookup-disclose-io's diodb.ts.

export const EMPTY_RESULTS_HTML = `
<html><body>
  <table>
    <tr><td>No organizations found.</td></tr>
  </table>
</body></html>
`;

interface FixtureRow {
  slug: string;
  programName: string;
  policyUrl: string;
  contactValue: string;
  maturityLevel?: string;
  maturityScore?: number;
}

function searchHtml(rows: FixtureRow[]): string {
  const trs = rows
    .map(
      (r) => `
    <tr>
      <td class="org-name"><a href="/${r.slug}" title="${r.programName}">${r.programName}</a></td>
      <td class="policy-col"><a href="${r.policyUrl}">policy</a></td>
      <td class="contact-col"><span title="${r.contactValue}">contact</span></td>
      <td>${r.maturityLevel ? `<span class="m-badge">${r.maturityLevel}</span>` : ''}</td>
      <td>${
        typeof r.maturityScore === 'number'
          ? `<span style="font-weight: 500; color: #111827;">${r.maturityScore.toFixed(1)}</span>`
          : ''
      }</td>
    </tr>`,
    )
    .join('\n');
  return `<html><body><table>${trs}</table></body></html>`;
}

interface FixtureDetail {
  contact?: string;
  policyUrl?: string;
  securityTxtUrl?: string;
  safeHarbor?: string;
  offersBounty?: 'met' | 'unmet';
  offersSwag?: 'met' | 'unmet';
}

function detailHtml(d: FixtureDetail): string {
  const field = (label: string, value?: string, href?: string): string => {
    if (!value && !href) return '';
    const inner = href ? `<a href="${href}">${value ?? href}</a>` : value;
    return `<div class="pol-grid-label">${label}</div><div class="pol-grid-value">${inner}</div>`;
  };
  const flag = (label: string, met?: 'met' | 'unmet'): string =>
    met ? `<span class="${met}">${label}</span>` : '';
  return `
<html><body>
  ${field('Policy URL', d.policyUrl, d.policyUrl)}
  ${field('Contact', d.contact)}
  ${field('security.txt', d.securityTxtUrl ?? '', d.securityTxtUrl)}
  ${field('Safe Harbor', d.safeHarbor)}
  ${flag('Offers Bounty', d.offersBounty)}
  ${flag('Offers Swag', d.offersSwag)}
</body></html>`;
}

interface FixtureProgram {
  searchRow: FixtureRow;
  detail: FixtureDetail;
}

const PROGRAMS: Record<string, FixtureProgram> = {
  'level5-example.test': {
    searchRow: {
      slug: 'level5-example-test',
      programName: 'Level5 Example (level5-example.test)',
      policyUrl: 'https://level5-example.test/security',
      contactValue: 'security@level5-example.test',
      maturityLevel: 'Level 5',
      maturityScore: 95.0,
    },
    detail: {
      policyUrl: 'https://level5-example.test/security',
      contact: 'security@level5-example.test',
      securityTxtUrl: 'https://level5-example.test/.well-known/security.txt',
      safeHarbor: 'Full',
      offersBounty: 'met',
      offersSwag: 'met',
    },
  },
  'safeharbor-example.test': {
    searchRow: {
      slug: 'safeharbor-example-test',
      programName: 'Safe Harbor Example (safeharbor-example.test)',
      policyUrl: 'https://safeharbor-example.test/disclosure',
      contactValue: 'security@safeharbor-example.test',
      maturityLevel: 'Partial',
      maturityScore: 65.0,
    },
    detail: {
      policyUrl: 'https://safeharbor-example.test/disclosure',
      contact: 'security@safeharbor-example.test',
      safeHarbor: 'Full',
      offersBounty: 'unmet',
      offersSwag: 'unmet',
    },
  },
  'vdp-only-example.test': {
    searchRow: {
      slug: 'vdp-only-example-test',
      programName: 'VDP Only Example (vdp-only-example.test)',
      policyUrl: 'https://vdp-only-example.test/security',
      contactValue: 'security@vdp-only-example.test',
      maturityLevel: 'Basic',
      maturityScore: 40.0,
    },
    detail: {
      policyUrl: 'https://vdp-only-example.test/security',
      contact: 'security@vdp-only-example.test',
      safeHarbor: 'None',
      offersBounty: 'unmet',
      offersSwag: 'unmet',
    },
  },
};

export function searchResponseFor(query: string): string {
  const normalized = query.toLowerCase();
  const program = PROGRAMS[normalized];
  if (!program) return EMPTY_RESULTS_HTML;
  return searchHtml([program.searchRow]);
}

export function detailResponseFor(slug: string): string {
  const program = Object.values(PROGRAMS).find((p) => p.searchRow.slug === slug);
  if (!program) return '<html><body>not found</body></html>';
  return detailHtml(program.detail);
}

export const KNOWN_DOMAINS = Object.keys(PROGRAMS);
