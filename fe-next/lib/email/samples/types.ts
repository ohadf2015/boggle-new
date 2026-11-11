import type { TeacherLocale } from '@/lib/education/types';

export const TEACHER_LOCALES: TeacherLocale[] = ['en', 'he', 'sv', 'ja', 'es', 'ru'];

export interface EmailSample {
  /** `<template>.<variant>`; one entry per variant and locale. */
  name: string;
  locale: string;
  /** Lifecycle emails must carry an unsubscribe link. */
  needsUnsubscribe?: boolean;
  render: () => { subject: string; html: string } | Promise<{ subject: string; html: string }>;
}
