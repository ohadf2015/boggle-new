/**
 * Types specific to the RegenerationDialog component
 * Note: Core types are imported from parent '../types'
 */

// Dialog step navigation
export type DialogStep = 'fields' | 'feedback' | 'preview';

// Step labels for display
export const STEP_LABELS: Record<DialogStep, string> = {
  fields: '1. Fields',
  feedback: '2. Feedback',
  preview: '3. Preview',
};

// Step order for navigation
export const DIALOG_STEPS: DialogStep[] = ['fields', 'feedback', 'preview'];
