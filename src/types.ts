export type IconState = 'unknown' | 'none' | 'vdp' | 'safe-harbor' | 'level5';

export interface ProgramSnapshot {
  slug: string;
  programName: string;
  policyUrl?: string;
  contactUrl?: string;
  contactEmail?: string;
  securityTxtUrl?: string;
  safeHarbor?: string;
  offersBounty?: boolean;
  offersSwag?: boolean;
  maturityLevel?: string;
  maturityScore?: number;
  directoryUrl: string;
}

export type EvaluationStatus = 'pending' | 'matched' | 'unmatched' | 'ineligible' | 'error';

export interface TabEvaluation {
  domain: string;
  status: EvaluationStatus;
  iconState: IconState;
  program?: ProgramSnapshot;
  evaluatedAt: number;
  error?: string;
}

export type ContactType =
  | 'bug_bounty'
  | 'security_txt'
  | 'dns_security_txt'
  | 'vdp'
  | 'psirt'
  | 'web_form'
  | 'email'
  | 'abuse_contact'
  | 'convention'
  | 'cert';

export interface ContactChannel {
  type: ContactType;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
  label: string;
  verified: boolean;
}

export interface LookupReport {
  input: string;
  assetType: string;
  timestamp: string;
  status: 'complete' | 'partial' | 'failed';
  attribution?: {
    organization?: string;
    industry?: string;
    confidence?: 'high' | 'medium' | 'low';
  };
  contacts: ContactChannel[];
  details?: {
    diodb?: {
      programs?: Array<{
        name?: string;
        bounty?: boolean | string;
        safeHarbor?: string;
        securityTxtUrl?: string;
      }>;
      maturity_level?: string;
      maturity_score?: number;
    };
  };
}

export interface PopupRequest {
  type: 'getEvaluation';
  tabId: number;
}

export interface PopupResponse {
  evaluation: TabEvaluation | null;
}

export interface LookupRequest {
  type: 'runLookup';
  domain: string;
}

export interface LookupResponse {
  report: LookupReport | null;
  error?: string;
}
