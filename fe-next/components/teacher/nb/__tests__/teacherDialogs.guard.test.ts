import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/** Every dialog, sheet and menu a teacher opens. */
const DIALOGS = [
  'components/teacher/home/HomeRosterDetail.tsx',
  'components/teacher/home/HomeSessionAll.tsx',
  'components/teacher/lesson-creation/ListEditorSheet.tsx',
  'components/teacher/LessonBuilderDraftPrompt.tsx',
  'components/teacher/lesson-creation/library/ListPreviewSheet.tsx',
  'components/teacher/lesson-creation/library/AssignListDialog.tsx',
  'components/teacher/lesson-creation/library/ReportListDialog.tsx',
  'components/teacher/ClassLimitUpsellModal.tsx',
  'components/teacher/ClassroomFormDialog.tsx',
  'components/teacher/assignments/AssignmentCreator.tsx',
  'components/teacher/TeacherWhatsNew.tsx',
  'components/teacher/TeacherTrialWelcome.tsx',
  'components/teacher/ProWelcomeCelebration.tsx',
  'components/teacher/pro/PreCheckoutExplainer.tsx',
  'components/teacher/analytics/overview/ClassOverview.tsx',
  'components/education/shell/TeacherAccountMenu.tsx',
  'components/education/EducationHeaderMobileMenu.tsx',
  'components/education/TeacherOnboarding.tsx',
  'components/education/lobby/LobbySetupDisclosure.tsx',
  'components/education/lobby/LobbyModeSwitcher.tsx',
];

describe.each(DIALOGS)('%s', (file) => {
  const src = readFileSync(path.join(ROOT, file), 'utf8');

  it('wears the shared teacher NB chrome', () => {
    expect(src).toMatch(/from '@\/components\/teacher\/nb\/(NbDialog|nbDialogStyles)'/);
  });

  it('never opens the raw primitive DialogContent (its red close, halftone and slate edge)', () => {
    expect(src).not.toMatch(/<DialogContent\b/);
  });

  it('has at most one lime primary action', () => {
    const body = src.replace(/^import[\s\S]*?;$/gm, '');
    expect((body.match(/NB_PRIMARY|PRIMARY_BUTTON/g) ?? []).length).toBeLessThanOrEqual(1);
  });

  it('is not a light cream sheet on the dark teacher pages', () => {
    expect(src).not.toMatch(/bg-neo-cream dark:bg-neo-cream/);
  });
});
