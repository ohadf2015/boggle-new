// Community word status types
export type WordStatus = 'validated' | 'pending_review' | 'rejected' | 'pending';

// Word data structure from API
export interface CommunityWord {
  word: string;
  language: string;
  likes_count: number;
  dislikes_count: number;
  net_score: number;
  is_potentially_valid: boolean;
  first_submitter: string | null;
  last_voted_at: string | null;
  first_voted_at: string | null;
  status: WordStatus;
}

// Stats structure from API
export interface CommunityStats {
  total: number;
  validated: number;
  pendingReview: number;
  rejected: number;
  pending: number;
}

// Language option for filters
export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

// Component props
export interface CommunityWordsManagerProps {
  authToken: string;
}

// Filter state
export interface FilterState {
  statusFilter: string;
  langFilter: string;
  searchQuery: string;
  sortBy: string;
}
