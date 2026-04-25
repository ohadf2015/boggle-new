/**
 * Tests for MultiLessonSelector Component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MultiLessonSelector } from '../MultiLessonSelector';

// Mock LanguageContext
const mockT = vi.fn((key: string) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    dir: 'ltr',
  }),
}));

describe('MultiLessonSelector', () => {
  const mockLessons = [
    {
      id: 'lesson-1',
      name: 'Animals',
      words: [
        { word: 'cat', canIntegrate: true },
        { word: 'dog', canIntegrate: true },
      ],
      teacher_id: 'teacher-1',
      classroom_id: null,
      description: '',
      language: 'en' as const,
      is_public: false,
      source_game_code: null,
      created_at: '',
      updated_at: '',
    },
    {
      id: 'lesson-2',
      name: 'Colors',
      words: [
        { word: 'red', canIntegrate: true },
        { word: 'blue', canIntegrate: false },
      ],
      teacher_id: 'teacher-1',
      classroom_id: null,
      description: '',
      language: 'en' as const,
      is_public: false,
      source_game_code: null,
      created_at: '',
      updated_at: '',
    },
  ];

  it('should render lesson options', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    // WHEN
    render(
      <MultiLessonSelector
        lessons={mockLessons}
        selectedLessonIds={[]}
        onSelectChange={onSelectChange}
      />
    );

    // THEN
    expect(screen.getByText(/Animals/)).toBeInTheDocument();
    expect(screen.getByText(/Colors/)).toBeInTheDocument();
  });

  it('should show word count for each lesson', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    // WHEN
    render(
      <MultiLessonSelector
        lessons={mockLessons}
        selectedLessonIds={[]}
        onSelectChange={onSelectChange}
      />
    );

    // THEN - Animals has 2 playable words
    expect(screen.getByText(/2.*word/i)).toBeInTheDocument();
    // Colors has 1 playable word (blue is not integrable)
    expect(screen.getByText(/1.*word/i)).toBeInTheDocument();
  });

  it('should call onSelectChange when lesson is selected', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    render(
      <MultiLessonSelector
        lessons={mockLessons}
        selectedLessonIds={[]}
        onSelectChange={onSelectChange}
      />
    );

    // WHEN - Click on Animals lesson
    const animalsOption = screen.getByText(/Animals/);
    fireEvent.click(animalsOption);

    // THEN
    expect(onSelectChange).toHaveBeenCalledWith(['lesson-1']);
  });

  it('should allow selecting multiple lessons', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    render(
      <MultiLessonSelector
        lessons={mockLessons}
        selectedLessonIds={['lesson-1']}
        onSelectChange={onSelectChange}
      />
    );

    // WHEN - Select Colors (Animals already selected)
    const colorsOption = screen.getByText(/Colors/);
    fireEvent.click(colorsOption);

    // THEN
    expect(onSelectChange).toHaveBeenCalledWith(['lesson-1', 'lesson-2']);
  });

  it('should allow deselecting a lesson', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    render(
      <MultiLessonSelector
        lessons={mockLessons}
        selectedLessonIds={['lesson-1', 'lesson-2']}
        onSelectChange={onSelectChange}
      />
    );

    // WHEN - Click on already-selected Animals to deselect
    const animalsOption = screen.getByText(/Animals/);
    fireEvent.click(animalsOption);

    // THEN
    expect(onSelectChange).toHaveBeenCalledWith(['lesson-2']);
  });

  it('should show empty state when no lessons available', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    // WHEN
    render(
      <MultiLessonSelector
        lessons={[]}
        selectedLessonIds={[]}
        onSelectChange={onSelectChange}
      />
    );

    // THEN
    expect(mockT).toHaveBeenCalledWith('education.classroomGame.noLessonsAvailable');
  });

  it('should show selected count', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    // WHEN
    render(
      <MultiLessonSelector
        lessons={mockLessons}
        selectedLessonIds={['lesson-1', 'lesson-2']}
        onSelectChange={onSelectChange}
      />
    );

    // THEN - Should show "2 lessons selected"
    expect(mockT).toHaveBeenCalledWith(
      'education.classroomGame.lessonsSelected',
      expect.objectContaining({ count: 2 })
    );
  });

  it('should highlight selected lessons visually', () => {
    // GIVEN
    const onSelectChange = vi.fn();

    // WHEN
    render(
      <MultiLessonSelector
        lessons={mockLessons}
        selectedLessonIds={['lesson-1']}
        onSelectChange={onSelectChange}
      />
    );

    // THEN - Selected lesson should have different styling (check for class)
    const animalsOption = screen.getByText(/Animals/).closest('button');
    expect(animalsOption).toHaveClass('bg-neo-cyan');
  });

  describe('Select All / Deselect All', () => {
    it('should show "Select All" button when not all lessons selected', () => {
      // GIVEN
      const onSelectChange = vi.fn();

      // WHEN
      render(
        <MultiLessonSelector
          lessons={mockLessons}
          selectedLessonIds={[]}
          onSelectChange={onSelectChange}
        />
      );

      // THEN
      expect(
        screen.getByText('education.classroomGame.selectAllLessons')
      ).toBeInTheDocument();
    });

    it('should select all lessons when "Select All" is clicked', () => {
      // GIVEN
      const onSelectChange = vi.fn();

      render(
        <MultiLessonSelector
          lessons={mockLessons}
          selectedLessonIds={[]}
          onSelectChange={onSelectChange}
        />
      );

      // WHEN
      fireEvent.click(
        screen.getByText('education.classroomGame.selectAllLessons')
      );

      // THEN
      expect(onSelectChange).toHaveBeenCalledWith(['lesson-1', 'lesson-2']);
    });

    it('should show "Deselect All" when all lessons are selected', () => {
      // GIVEN
      const onSelectChange = vi.fn();

      // WHEN
      render(
        <MultiLessonSelector
          lessons={mockLessons}
          selectedLessonIds={['lesson-1', 'lesson-2']}
          onSelectChange={onSelectChange}
        />
      );

      // THEN
      expect(
        screen.getByText('education.classroomGame.deselectAll')
      ).toBeInTheDocument();
    });

    it('should deselect all lessons when "Deselect All" is clicked', () => {
      // GIVEN
      const onSelectChange = vi.fn();

      render(
        <MultiLessonSelector
          lessons={mockLessons}
          selectedLessonIds={['lesson-1', 'lesson-2']}
          onSelectChange={onSelectChange}
        />
      );

      // WHEN
      fireEvent.click(
        screen.getByText('education.classroomGame.deselectAll')
      );

      // THEN
      expect(onSelectChange).toHaveBeenCalledWith([]);
    });

    it('should not show Select All button when no lessons available', () => {
      // GIVEN
      const onSelectChange = vi.fn();

      // WHEN
      render(
        <MultiLessonSelector
          lessons={[]}
          selectedLessonIds={[]}
          onSelectChange={onSelectChange}
        />
      );

      // THEN - Empty state shown, no Select All button
      expect(
        screen.queryByText('education.classroomGame.selectAllLessons')
      ).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('renders a list with each lesson as a checkbox-role button', () => {
      render(
        <MultiLessonSelector
          lessons={mockLessons}
          selectedLessonIds={['lesson-1']}
          onSelectChange={vi.fn()}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      expect(checkboxes[0]).toHaveAttribute('aria-checked', 'true');
      expect(checkboxes[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('Select All control meets the 40px+ TV/kid touch target', () => {
      render(
        <MultiLessonSelector
          lessons={mockLessons}
          selectedLessonIds={[]}
          onSelectChange={vi.fn()}
        />
      );

      const btn = screen.getByText('education.classroomGame.selectAllLessons');
      // Tailwind py-2.5 = 10px top+bottom + ~20px line-height ≈ 40px
      expect(btn.className).toMatch(/py-2\.5/);
      expect(btn.className).toMatch(/px-4/);
    });

    it('lesson buttons expose a focus-visible ring for keyboard / TV users', () => {
      render(
        <MultiLessonSelector
          lessons={mockLessons}
          selectedLessonIds={[]}
          onSelectChange={vi.fn()}
        />
      );

      const lessonButton = screen.getAllByRole('checkbox')[0];
      expect(lessonButton.className).toMatch(/focus-visible:ring/);
    });
  });
});
