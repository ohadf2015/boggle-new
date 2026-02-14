/**
 * Teacher Components
 *
 * Export all teacher-related components.
 */

// Sub-module barrels
export * from './reports';
export * from './curriculum';
export * from './assignments';
export * from './dashboard';
export * from './lesson-creation';

// Top-level components
export { default as TeacherDashboard } from './TeacherDashboard';
export { default as ClassroomManager } from './ClassroomManager';
export { default as LessonBuilder } from './LessonBuilder';
export { default as LessonTemplateEditor } from './LessonTemplateEditor';
export { default as LessonAssignmentDialog } from './LessonAssignmentDialog';
export { default as StudentProgressView } from './StudentProgressView';
export { default as ClassProgressChart } from './ClassProgressChart';
export { default as ClassroomStudentList } from './ClassroomStudentList';
export { default as GameCodeDisplay } from './GameCodeDisplay';
export { default as QuickStartButton } from './QuickStartButton';
export { default as BulkWordImporter } from './BulkWordImporter';
