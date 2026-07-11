export type TeacherAccessStatus = 'pending' | 'approved' | 'declined';
export type TeacherAccessRole = 'teacher' | 'tutor' | 'admin' | 'parent' | 'researcher' | 'other';
export type TeacherLocale = 'en' | 'he' | 'sv' | 'ja' | 'es';

export interface TeacherAccessRequest {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  school_or_org: string | null;
  country: string | null;
  role: TeacherAccessRole;
  locale: TeacherLocale;
  use_case: string;
  status: TeacherAccessStatus;
  admin_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  /** When the granted trial ends (set on approval). Null/absent for un-approved rows. */
  trial_expires_at?: string | null;
  created_at: string;
}

/**
 * What the client sends. Name, email, and country are NOT included — they're
 * already known from signup and derived server-side from the verified account,
 * so applicants never re-enter them.
 */
export interface TeacherAccessSubmission {
  role: TeacherAccessRole;
  locale: TeacherLocale;
  use_case: string;
  school_or_org?: string;
}

/** The full persisted/notification shape, assembled server-side. */
export interface TeacherAccessFormPayload extends TeacherAccessSubmission {
  email: string;
  full_name: string;
  country?: string;
}
