// Main component
export { DailyWordManager } from './DailyWordManager';

// Types
export type {
  BulkGeneratedWord,
  DailyTargetWord,
  BulkGenerateState,
  LanguageOption,
  WordListStats,
} from './types';

// Constants
export {
  MIN_WORD_LENGTH,
  LANGUAGES,
  WORD_LISTS_STORAGE_KEY,
  INITIAL_WORD_LISTS,
  formatDateDisplay,
  generateTypeScriptCode,
} from './constants';

// Hooks
export { useDailyWordLists, useWordSchedule, useBulkGeneration } from './hooks';

// Sub-components
export {
  LanguageSelector,
  ScheduleManager,
  BulkGenerator,
  WordListStats as WordListStatsComponent,
  WordListEditor,
} from './components';
