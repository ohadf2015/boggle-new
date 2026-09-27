/**
 * CurriculumWordListBrowser Component Tests
 *
 * Tests for the curriculum word list browser that displays
 * pre-built word lists aligned with Israeli educational standards.
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CurriculumWordListBrowser } from '../CurriculumWordListBrowser';
import {
  getCurriculumWordLists,
  importCurriculumToLesson,
  CurriculumWordList,
} from '@/lib/supabase/education';

// Mock the education data functions
vi.mock('@/lib/supabase/education', () => ({
  getCurriculumWordLists: vi.fn(),
  importCurriculumToLesson: vi.fn(),
}));

// Stable t function to avoid infinite re-renders (useCallback depends on t)
const stableT = (key: string, params?: Record<string, string | number>) => {
  const translations: Record<string, string> = {
    'teacher.curriculum.title': 'Curriculum Word Lists',
    'teacher.curriculum.description': 'Pre-built word lists aligned with Israeli educational standards',
    'teacher.curriculum.browse': 'Browse Curriculum Lists',
    'teacher.curriculum.import': 'Import to Lesson',
    'teacher.curriculum.importing': 'Importing...',
    'teacher.curriculum.imported': 'Successfully imported!',
    'teacher.curriculum.importError': 'Failed to import word list',
    'teacher.curriculum.preview': 'Preview Words',
    'teacher.curriculum.wordCount': '{{count}} words',
    'teacher.curriculum.noResults': 'No curriculum lists found matching your filters',
    'teacher.curriculum.selectGrade': 'Select Grade Level',
    'teacher.curriculum.selectSubject': 'Select Subject',
    'teacher.curriculum.allGrades': 'All Grades',
    'teacher.curriculum.allSubjects': 'All Subjects',
    'teacher.curriculum.filters.title': 'Filter Lists',
    'teacher.curriculum.filters.grade': 'Grade Level',
    'teacher.curriculum.filters.subject': 'Subject Area',
    'teacher.curriculum.filters.language': 'Language',
    'teacher.curriculum.filters.clear': 'Clear Filters',
    'teacher.curriculum.grades.grade_1': 'Grade 1',
    'teacher.curriculum.grades.grade_3': 'Grade 3',
    'teacher.curriculum.grades.grade_5': 'Grade 5',
    'teacher.curriculum.grades.grade_7': 'Grade 7',
    'teacher.curriculum.subjects.english': 'English',
    'teacher.curriculum.subjects.hebrew': 'Hebrew',
    'teacher.curriculum.subjects.science': 'Science',
    'teacher.curriculum.subjects.math': 'Mathematics',
    'teacher.curriculum.gradeGroups.elementary': 'Elementary School',
    'teacher.curriculum.gradeGroups.middle': 'Middle School',
    'teacher.curriculum.gradeGroups.high': 'High School',
    'teacher.curriculum.standard': 'Curriculum Standard',
    'teacher.curriculum.lastUpdated': 'Last Updated',
    'common.loading': 'Loading...',
    'common.error': 'Error',
  };
  let result = translations[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      result = result.replace(`{{${k}}}`, String(v));
    });
  }
  return result;
};

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: stableT,
    language: 'en',
    dir: 'ltr',
  }),
}));


// Mock useAuth
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'teacher-123', email: 'teacher@example.com' },
    isAuthenticated: true,
    loading: false,
  }),
}));

const mockCurriculumLists: CurriculumWordList[] = [
  {
    id: 'list-1',
    name: 'Grade 3 - Basic English Vocabulary',
    description: 'Foundational English vocabulary for 3rd grade students',
    language: 'en',
    grade_level: 'grade_3',
    subject: 'english',
    curriculum_standard: 'MOE-ENG-G3-CORE',
    words: [
      { word: 'apple', definition: 'A round fruit', canIntegrate: true },
      { word: 'book', definition: 'Pages bound together', canIntegrate: true },
      { word: 'cat', definition: 'A small furry animal', canIntegrate: true },
    ],
    word_count: 3,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'list-2',
    name: 'Grade 5 - Intermediate English',
    description: 'Intermediate vocabulary for 5th grade',
    language: 'en',
    grade_level: 'grade_5',
    subject: 'english',
    curriculum_standard: 'MOE-ENG-G5-CORE',
    words: [
      { word: 'adventure', definition: 'An exciting experience', canIntegrate: true },
      { word: 'beautiful', definition: 'Very pleasing to look at', canIntegrate: true },
    ],
    word_count: 2,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'list-3',
    name: 'Grade 7 - Science Vocabulary',
    description: 'Science terms for 7th grade',
    language: 'en',
    grade_level: 'grade_7',
    subject: 'science',
    curriculum_standard: 'MOE-SCI-G7-CORE',
    words: [
      { word: 'hypothesis', definition: 'An educated guess', canIntegrate: true },
    ],
    word_count: 1,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z',
  },
];

const mockedGetCurriculumWordLists = getCurriculumWordLists as jest.MockedFunction<
  typeof getCurriculumWordLists
>;
const mockedImportCurriculumToLesson = importCurriculumToLesson as jest.MockedFunction<
  typeof importCurriculumToLesson
>;

describe('CurriculumWordListBrowser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetCurriculumWordLists.mockResolvedValue({ data: mockCurriculumLists, error: null });
    mockedImportCurriculumToLesson.mockResolvedValue({
      data: {
        id: 'new-lesson-123',
        name: 'Imported Lesson',
        words: [],
        teacher_id: 'teacher-123',
        classroom_id: null,
        description: null,
        language: 'en',
        is_public: false,
        source_game_code: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      },
      error: null,
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator while fetching curriculum lists', () => {
      mockedGetCurriculumWordLists.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<CurriculumWordListBrowser />);

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });
  });

  describe('Curriculum List Display', () => {
    it('displays the page title and description', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Curriculum Word Lists')).toBeInTheDocument();
      });
      expect(
        screen.getByText('Pre-built word lists aligned with Israeli educational standards')
      ).toBeInTheDocument();
    });

    it('displays all curriculum lists', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });
      expect(screen.getByText('Grade 5 - Intermediate English')).toBeInTheDocument();
      expect(screen.getByText('Grade 7 - Science Vocabulary')).toBeInTheDocument();
    });

    it('displays word count for each list', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('3 words')).toBeInTheDocument();
      });
      expect(screen.getByText('2 words')).toBeInTheDocument();
      expect(screen.getByText('1 words')).toBeInTheDocument();
    });

    it('displays curriculum standard codes', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('MOE-ENG-G3-CORE')).toBeInTheDocument();
      });
      expect(screen.getByText('MOE-ENG-G5-CORE')).toBeInTheDocument();
      expect(screen.getByText('MOE-SCI-G7-CORE')).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('displays filter controls', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Filter Lists')).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/grade level/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/subject area/i)).toBeInTheDocument();
    });

    it('filters by grade level when selected', async () => {
      const user = userEvent.setup();

      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      // Select grade 3
      const gradeSelect = screen.getByLabelText(/grade level/i);
      await user.selectOptions(gradeSelect, 'grade_3');

      // Verify getCurriculumWordLists was called with grade filter
      await waitFor(() => {
        expect(mockedGetCurriculumWordLists).toHaveBeenLastCalledWith(
          expect.objectContaining({ gradeLevel: 'grade_3' })
        );
      });
    });

    it('filters by subject when selected', async () => {
      const user = userEvent.setup();

      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      // Select science subject
      const subjectSelect = screen.getByLabelText(/subject area/i);
      await user.selectOptions(subjectSelect, 'science');

      // Verify getCurriculumWordLists was called with subject filter
      await waitFor(() => {
        expect(mockedGetCurriculumWordLists).toHaveBeenLastCalledWith(
          expect.objectContaining({ subject: 'science' })
        );
      });
    });

    it('clears filters when clear button is clicked', async () => {
      const user = userEvent.setup();

      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      // Apply a filter
      const gradeSelect = screen.getByLabelText(/grade level/i);
      await user.selectOptions(gradeSelect, 'grade_3');

      // Click clear filters
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      // Verify getCurriculumWordLists was called with no filters
      await waitFor(() => {
        expect(mockedGetCurriculumWordLists).toHaveBeenLastCalledWith({});
      });
    });

    it('shows no results message when filters match nothing', async () => {
      mockedGetCurriculumWordLists.mockResolvedValueOnce({ data: [], error: null });

      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(
          screen.getByText('No curriculum lists found matching your filters')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Word Preview', () => {
    it('shows word preview when preview button is clicked', async () => {
      const user = userEvent.setup();

      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      // Find and click preview button for first list
      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      // Verify words are shown
      await waitFor(() => {
        expect(screen.getByText('apple')).toBeInTheDocument();
      });
      expect(screen.getByText('A round fruit')).toBeInTheDocument();
      expect(screen.getByText('book')).toBeInTheDocument();
      expect(screen.getByText('cat')).toBeInTheDocument();
    });

    it('closes word preview when clicked again', async () => {
      const user = userEvent.setup();

      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      // Open preview
      let previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      // Verify preview is shown
      await waitFor(() => {
        expect(screen.getByText('apple')).toBeInTheDocument();
      });

      // Get fresh reference and close preview
      previewButtons = screen.getAllByRole('button', { name: /preview/i });
      await user.click(previewButtons[0]);

      // Verify words are hidden
      await waitFor(() => {
        expect(screen.queryByText('A round fruit')).not.toBeInTheDocument();
      });
    });
  });

  describe('Import Functionality', () => {
    it('shows import button for each list', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
        expect(importButtons).toHaveLength(3);
      });
    });

    it('calls importCurriculumToLesson when import button is clicked', async () => {
      const user = userEvent.setup();

      render(<CurriculumWordListBrowser teacherId="teacher-123" />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      // Click import button for first list
      const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(mockedImportCurriculumToLesson).toHaveBeenCalledWith(
          'list-1',
          'teacher-123',
          undefined
        );
      });
    });

    it('shows importing state while import is in progress', async () => {
      const user = userEvent.setup();
      mockedImportCurriculumToLesson.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({
          data: {
            id: 'new-lesson',
            name: 'Imported',
            words: [],
            teacher_id: 'teacher-123',
            classroom_id: null,
            description: null,
            language: 'en' as const,
            is_public: false,
            source_game_code: null,
            created_at: '',
            updated_at: '',
          },
          error: null,
        }), 100))
      );

      render(<CurriculumWordListBrowser teacherId="teacher-123" />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
      await user.click(importButtons[0]);

      expect(screen.getByText('Importing...')).toBeInTheDocument();
    });

    it('shows success message after successful import', async () => {
      const user = userEvent.setup();

      render(<CurriculumWordListBrowser teacherId="teacher-123" />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Successfully imported!')).toBeInTheDocument();
      });
    });

    it('calls onImportSuccess callback when import succeeds', async () => {
      const user = userEvent.setup();
      const onImportSuccess = vi.fn();

      render(
        <CurriculumWordListBrowser teacherId="teacher-123" onImportSuccess={onImportSuccess} />
      );

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(onImportSuccess).toHaveBeenCalledWith({
          id: 'new-lesson-123',
          name: 'Imported Lesson',
          words: [],
          teacher_id: 'teacher-123',
          classroom_id: null,
          description: null,
          language: 'en',
          is_public: false,
          source_game_code: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        });
      });
    });

    it('shows error message when import fails', async () => {
      const user = userEvent.setup();
      mockedImportCurriculumToLesson.mockResolvedValueOnce({
        data: null,
        error: { message: 'Import failed' },
      });

      render(<CurriculumWordListBrowser teacherId="teacher-123" />);

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Failed to import word list')).toBeInTheDocument();
      });
    });
  });

  describe('With Classroom Context', () => {
    it('passes classroomId to import function when provided', async () => {
      const user = userEvent.setup();

      render(
        <CurriculumWordListBrowser teacherId="teacher-123" classroomId="classroom-456" />
      );

      await waitFor(() => {
        expect(screen.getByText('Grade 3 - Basic English Vocabulary')).toBeInTheDocument();
      });

      const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
      await user.click(importButtons[0]);

      await waitFor(() => {
        expect(mockedImportCurriculumToLesson).toHaveBeenCalledWith(
          'list-1',
          'teacher-123',
          'classroom-456'
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when fetching fails', async () => {
      mockedGetCurriculumWordLists.mockResolvedValueOnce({
        data: [],
        error: { message: 'Network error' },
      });

      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has accessible heading structure', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(
          screen.getByRole('heading', { name: /curriculum word lists/i })
        ).toBeInTheDocument();
      });
    });

    it('filter selects have associated labels', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        expect(screen.getByLabelText(/grade level/i)).toBeInTheDocument();
      });
      expect(screen.getByLabelText(/subject area/i)).toBeInTheDocument();
    });

    it('buttons have accessible names', async () => {
      render(<CurriculumWordListBrowser />);

      await waitFor(() => {
        const importButtons = screen.getAllByRole('button', { name: /import to lesson/i });
        expect(importButtons.length).toBeGreaterThan(0);
      });

      const previewButtons = screen.getAllByRole('button', { name: /preview/i });
      expect(previewButtons.length).toBeGreaterThan(0);
    });
  });
});
