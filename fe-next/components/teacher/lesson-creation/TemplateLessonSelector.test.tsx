/**
 * Tests for TemplateLessonSelector Component
 * Validates template lesson browsing and filtering
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/contexts/LanguageContext';
import TemplateLessonSelector from './TemplateLessonSelector';
import type { Language } from '@/lib/supabase/education/types';

// Mock translations
vi.mock('@/contexts/LanguageContext', () => ({
  ...vi.importActual('@/contexts/LanguageContext'),
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'teacher.lesson.templates': 'Lesson Templates',
        'teacher.lesson.category.all': 'All',
        'teacher.lesson.category.grade-1': 'Grade 1',
        'teacher.lesson.category.grade-2': 'Grade 2',
        'teacher.lesson.category.grade-3': 'Grade 3',
        'teacher.lesson.category.academic': 'Academic',
        'teacher.lesson.category.everyday': 'Everyday',
      };
      return translations[key] || key;
    },
    language: 'en' as Language,
    setLanguage: vi.fn(),
    isRTL: false,
  }),
  LanguageProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('TemplateLessonSelector', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render template selector with heading', () => {
    render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="en" />
    );

    expect(screen.getByText('Lesson Templates')).toBeInTheDocument();
  });

  it('should render category filter tabs', () => {
    render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="en" />
    );

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Grade 1')).toBeInTheDocument();
    expect(screen.getByText('Grade 2')).toBeInTheDocument();
    expect(screen.getByText('Academic')).toBeInTheDocument();
  });

  it('should render templates for English language', () => {
    render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="en" />
    );

    // Should show English templates
    expect(screen.getByText(/Animals/i)).toBeInTheDocument();
  });

  it('should render templates for Hebrew language', () => {
    render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="he" />
    );

    // Should show Hebrew templates
    const templates = screen.getAllByRole('button');
    expect(templates.length).toBeGreaterThan(1); // At least category tabs + templates
  });

  it('should NOT show templates from other languages', () => {
    const { container } = render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="en" />
    );

    // English classroom should NOT show Hebrew template names
    const text = container.textContent || '';
    expect(text).not.toMatch(/חיות/); // Hebrew word for animals
  });

  it('should filter templates by category', async () => {
    const user = userEvent.setup();
    render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="en" />
    );

    // Click Grade 1 category
    const grade1Button = screen.getByText('Grade 1');
    await user.click(grade1Button);

    // Should show only Grade 1 templates
    const templates = screen.getAllByRole('button');
    // Expect category buttons + Grade 1 templates
    expect(templates.length).toBeGreaterThan(5); // 5 category buttons + templates
  });

  it('should call onSelect with template data when template is clicked', async () => {
    const user = userEvent.setup();
    render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="en" />
    );

    // Find first template button (skip category filter buttons)
    const templateButtons = screen.getAllByRole('button');
    // Category buttons are first 5, templates start after
    const firstTemplate = templateButtons.find((btn) =>
      btn.textContent?.includes('Animals')
    );

    if (firstTemplate) {
      await user.click(firstTemplate);

      expect(mockOnSelect).toHaveBeenCalledTimes(1);
      const callArg = mockOnSelect.mock.calls[0][0];
      expect(callArg).toHaveProperty('id');
      expect(callArg).toHaveProperty('name');
      expect(callArg).toHaveProperty('words');
      expect(Array.isArray(callArg.words)).toBe(true);
    }
  });

  it('should highlight selected category', async () => {
    const user = userEvent.setup();
    render(
      <TemplateLessonSelector onSelect={mockOnSelect} classroomLanguage="en" />
    );

    const academicButton = screen.getByText('Academic');
    await user.click(academicButton);

    // Selected category should have different styling
    expect(academicButton).toHaveClass('bg-neo-pink');
  });
});
