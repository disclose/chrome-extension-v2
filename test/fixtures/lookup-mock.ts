import type { LookupReport } from '../../src/types';

export function happyLookupResponse(domain: string): LookupReport {
  return {
    input: domain,
    assetType: 'domain',
    timestamp: new Date().toISOString(),
    status: 'complete',
    attribution: {
      organization: 'Example Org',
      industry: 'technology',
      confidence: 'high',
    },
    contacts: [
      {
        type: 'vdp',
        value: `https://${domain}/security`,
        confidence: 'high',
        source: 'security-page-probe',
        label: `${domain} security page`,
        verified: true,
      },
      {
        type: 'email',
        value: `security@${domain}`,
        confidence: 'medium',
        source: 'convention',
        label: 'security@',
        verified: false,
      },
    ],
    details: {
      diodb: {
        programs: [],
        maturity_score: 50,
      },
    },
  };
}

export function retaliationLookupResponse(domain: string): LookupReport {
  return {
    input: domain,
    assetType: 'domain',
    timestamp: new Date().toISOString(),
    status: 'partial',
    contacts: [
      {
        type: 'convention',
        value: `https://disclose.io/research-threats/${domain}`,
        confidence: 'low',
        source: 'research-threats',
        label: '⚠ Retaliation history (2024-09-01): legal threat against good-faith researcher',
        verified: false,
      },
      {
        type: 'email',
        value: `security@${domain}`,
        confidence: 'medium',
        source: 'convention',
        label: 'security@',
        verified: false,
      },
    ],
  };
}
