export type EntitlementTier =
  | 'free'
  | 'plus'
  | 'pro'
  | 'creator'
  | 'business'
  | 'exclusive';

export interface SubscriptionProfile {
  tier?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  professional?: UserProfessionalProfile | null;
  is_pro?: boolean | null;
  is_active?: boolean | null;
  subscription_status?: string | null;
  subscription_plan?: string | null;
  membership?: string | null;
  subscription_expires_at?: string | null;
}

export interface UserProfessionalProfile {
  headline?: string;
  bio?: string;
  location?: string;
  skills?: string[];
  careerGoals?: string;
  industryInterests?: string[];
  experienceLevel?: 'student' | 'entry' | 'junior' | 'mid' | 'senior' | 'lead' | 'executive' | 'career_switcher' | '';
  smartSummary?: string;
  smartPositioning?: string;
  smartSuggestedSkills?: string[];
  experience?: Array<{ role: string; company: string; start?: string; end?: string; summary?: string; verified?: boolean }>;
  education?: Array<{ institution: string; degree?: string; field?: string; start?: string; end?: string; verified?: boolean }>;
  links?: Array<{ type: string; url: string }>;
  endorsements?: Record<string, number>;
  openToCollab?: boolean;
  collabNote?: string;
  resumeSummary?: string;
}

export function resolveSubscriptionTier(
  profile: SubscriptionProfile | null | undefined,
  fallbackTier?: string | null,
  now?: number
): EntitlementTier;

export function isTierAtLeast(tier: string | null | undefined, minimumTier: string): boolean;
