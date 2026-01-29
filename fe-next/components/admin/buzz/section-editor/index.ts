/**
 * Section Editor Module
 *
 * Provides UI components for managing all 11 prompt sections
 * in the Daily Buzz admin dashboard.
 */

// Constants and metadata
export {
  SECTION_METADATA,
  SECTION_TO_TEMPLATE_TYPE,
  TEMPLATE_TYPE_TO_SECTION,
  SAMPLE_PREVIEW_DATA,
  getSortedSections,
  getCriticalSections,
} from './constants';

export type { SectionMetadata } from './constants';

// Components
export { SectionEditor } from './SectionEditor';
export { SectionCard } from './SectionCard';
export { SectionForm } from './SectionForm';
export { PromptPreviewDialog } from './PromptPreviewDialog';

// Hooks
export { useSectionManagement } from './hooks/useSectionManagement';
