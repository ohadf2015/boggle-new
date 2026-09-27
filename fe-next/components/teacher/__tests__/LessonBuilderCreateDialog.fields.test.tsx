/**
 * The Create Lesson form's own fields: which language, what is optional.
 *
 * The language dropdown re-enumerated the locale list by hand — four entries,
 * English names hardcoded — so a Spanish or Russian teacher (whose form
 * defaults to their UI language) saw "English" selected while the lesson saved
 * as `es`/`ru`, and could never pick their own language back. The classroom
 * form already reads EDUCATION_LANGUAGES; this one now does too.
 *
 * Only the name and the words are required. The description label already said
 * "(optional)"; the classroom picker did not, so it read as a required step.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en', dir: 'ltr' }),
}));
vi.mock('../lesson-creation', () => ({ TemplateLessonSelector: () => null }));
vi.mock('../WordListEditor', () => ({ __esModule: true, default: () => null }));

import LessonBuilderCreateDialog from '../LessonBuilderCreateDialog';

const renderDialog = (language = 'en') =>
  render(
    <LessonBuilderCreateDialog
      {...({
        isOpen: true,
        onOpenChange: vi.fn(),
        formData: { name: '', description: '', language, classroomId: '', isPublic: false },
        onFormDataChange: vi.fn(),
        words: [],
        onWordsChange: vi.fn(),
        classrooms: [{ id: 'c1', name: 'Class 1' }],
        isSaving: false,
        showTemplateSelector: false,
        onToggleTemplateSelector: vi.fn(),
        onTemplateSelect: vi.fn(),
        onBulkImportOpen: vi.fn(),
        onCreate: vi.fn(),
        t: (k: string) => k,
      } as any)}
    />
  );

describe('LessonBuilderCreateDialog — fields', () => {
  it('offers every education language, labelled through translations', () => {
    renderDialog();
    const select = screen.getByLabelText('teacher.classroom.language') as HTMLSelectElement;
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['en', 'he', 'sv', 'ja', 'es', 'ru']);
    expect(Array.from(select.options).map((o) => o.textContent)).toContain('languages.russian');
  });

  it("shows a Spanish teacher's default language as selected, not English", () => {
    renderDialog('es');
    expect((screen.getByLabelText('teacher.classroom.language') as HTMLSelectElement).value).toBe('es');
  });

  it('labels every field so a screen reader can reach it', () => {
    renderDialog();
    expect(screen.getByLabelText('teacher.lesson.name')).toBeInTheDocument();
    expect(screen.getByLabelText('teacher.lesson.description')).toBeInTheDocument();
    expect(screen.getByLabelText('teacher.lesson.assignToClassroom')).toBeInTheDocument();
  });

  it('says in every locale that description and classroom are optional', async () => {
    const markers: Record<string, string> = { en: 'optional', he: 'אופציונלי', es: 'opcional', sv: 'valfritt', ja: '任意', ru: 'необязательно' };
    for (const [code, marker] of Object.entries(markers)) {
      const mod = await import(`../../../translations/${code}.js`);
      const lesson = mod[code].teacher.lesson;
      expect(lesson.assignToClassroom, code).toContain(marker);
    }
    const en = await import('../../../translations/en.js');
    expect(en.en.teacher.lesson.description).toContain('optional');
  });
});
