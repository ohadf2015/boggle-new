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
  created_at: string;
}

export interface TeacherAccessFormPayload {
  email: string;
  full_name: string;
  school_or_org?: string;
  country?: string;
  role: TeacherAccessRole;
  locale: TeacherLocale;
  use_case: string;
}
