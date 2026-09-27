// Main component
export { CommunityWordsManager } from './CommunityWordsManager';

// Types
export type {
  CommunityWord,
  CommunityStats,
  CommunityWordsManagerProps,
  LanguageOption,
  WordStatus,
  FilterState,
} from './types';

// Constants
export {
  LANGUAGES,
  DEFAULT_LIMIT,
  DEFAULT_STATUS_FILTER,
  DEFAULT_LANG_FILTER,
  DEFAULT_SORT_BY,
  getLanguageInfo,
  createWordKey,
} from './constants';

// Hooks
export { useCommunityWords } from './hooks';

// Sub-components
export { StatsCards, WordFilters, BulkActions, WordCard } from './components';
