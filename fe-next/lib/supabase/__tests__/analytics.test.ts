import { getClassroomMetrics, getCommonMistakes, getStudentProgressMetrics, getStudentsProgressSummary, getLessonEffectiveness } from '../analytics';
import { supabase } from '@/lib/supabase';

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

describe('analytics - getClassroomMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return correct studentsNeedingHelp count', async () => {
    // GIVEN: Mock data with 2 students below 60% accuracy
    const mockMemberships = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
      { student_id: 'student-3' },
    ];

    const mockProgress = [
      // student-1: 5/10 = 50% accuracy (needs help)
      {
        student_id: 'student-1',
        words_attempted: {
          word1: { attempts: 2, correct: 1 },
          word2: { attempts: 2, correct: 1 },
          word3: { attempts: 2, correct: 1 },
          word4: { attempts: 2, correct: 1 },
          word5: { attempts: 2, correct: 1 },
          word6: { attempts: 2, correct: 0 },
          word7: { attempts: 2, correct: 0 },
          word8: { attempts: 2, correct: 0 },
          word9: { attempts: 2, correct: 0 },
          word10: { attempts: 2, correct: 0 },
        },
        total_xp: 100,
        last_practice_date: new Date().toISOString().split('T')[0],
      },
      // student-2: 8/10 = 80% accuracy (doing fine)
      {
        student_id: 'student-2',
        words_attempted: {
          word1: { attempts: 1, correct: 1 },
          word2: { attempts: 1, correct: 1 },
          word3: { attempts: 1, correct: 1 },
          word4: { attempts: 1, correct: 1 },
          word5: { attempts: 1, correct: 1 },
          word6: { attempts: 1, correct: 1 },
          word7: { attempts: 1, correct: 1 },
          word8: { attempts: 1, correct: 1 },
          word9: { attempts: 1, correct: 0 },
          word10: { attempts: 1, correct: 0 },
        },
        total_xp: 200,
        last_practice_date: new Date().toISOString().split('T')[0],
      },
      // student-3: 4/10 = 40% accuracy (needs help)
      {
        student_id: 'student-3',
        words_attempted: {
          word1: { attempts: 2, correct: 1 },
          word2: { attempts: 2, correct: 1 },
          word3: { attempts: 2, correct: 1 },
          word4: { attempts: 2, correct: 1 },
          word5: { attempts: 2, correct: 0 },
          word6: { attempts: 2, correct: 0 },
          word7: { attempts: 2, correct: 0 },
          word8: { attempts: 2, correct: 0 },
          word9: { attempts: 2, correct: 0 },
          word10: { attempts: 2, correct: 0 },
        },
        total_xp: 150,
        last_practice_date: new Date().toISOString().split('T')[0],
      },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getClassroomMetrics('classroom-1');

    // THEN
    expect(result.data?.studentsNeedingHelp).toBe(2);
    expect(result.error).toBeNull();
  });

  it('should calculate classAverageXp correctly', async () => {
    // GIVEN: 3 students with different XP totals
    const mockMemberships = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
      { student_id: 'student-3' },
    ];

    const mockProgress = [
      { student_id: 'student-1', total_xp: 100, words_attempted: {}, last_practice_date: null },
      { student_id: 'student-2', total_xp: 200, words_attempted: {}, last_practice_date: null },
      { student_id: 'student-3', total_xp: 300, words_attempted: {}, last_practice_date: null },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getClassroomMetrics('classroom-1');

    // THEN
    expect(result.data?.classAverageXp).toBe(200); // (100 + 200 + 300) / 3
    expect(result.error).toBeNull();
  });

  it('should return 0 for empty classroom', async () => {
    // GIVEN: Empty classroom
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    // WHEN
    const result = await getClassroomMetrics('classroom-empty');

    // THEN
    expect(result.data?.studentsNeedingHelp).toBe(0);
    expect(result.data?.classAverageXp).toBe(0);
    expect(result.data?.totalStudents).toBe(0);
    expect(result.error).toBeNull();
  });

  it('should count activeStudentsToday correctly', async () => {
    // GIVEN: 2 students practiced today
    const today = new Date().toISOString().split('T')[0];
    const mockMemberships = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
      { student_id: 'student-3' },
    ];

    const mockProgress = [
      { student_id: 'student-1', total_xp: 100, words_attempted: {}, last_practice_date: today },
      { student_id: 'student-2', total_xp: 200, words_attempted: {}, last_practice_date: '2024-01-01' },
      { student_id: 'student-3', total_xp: 300, words_attempted: {}, last_practice_date: today },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getClassroomMetrics('classroom-1');

    // THEN
    expect(result.data?.activeStudentsToday).toBe(2);
  });
});

describe('analytics - getCommonMistakes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return top 5 words by error rate', async () => {
    // GIVEN: Words with various error rates
    const mockMemberships = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
    ];

    const mockProgress = [
      {
        student_id: 'student-1',
        words_attempted: {
          difficult: { attempts: 10, correct: 2 }, // 80% error rate
          moderate: { attempts: 10, correct: 4 }, // 60% error rate
          easy: { attempts: 10, correct: 9 }, // 10% error rate
        },
      },
      {
        student_id: 'student-2',
        words_attempted: {
          difficult: { attempts: 10, correct: 1 }, // 90% error rate
          hard: { attempts: 10, correct: 3 }, // 70% error rate
          moderate: { attempts: 10, correct: 5 }, // 50% error rate (borderline, won't include)
        },
      },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getCommonMistakes('classroom-1', 5);

    // THEN
    expect(result.data).toHaveLength(3); // Only 3 words with >50% error
    expect(result.data?.[0].word).toBe('difficult'); // Highest error rate
    expect(result.data?.[0].errorRate).toBeGreaterThan(0.5);
    expect(result.data?.[0].studentCount).toBe(2);
  });

  it('should exclude words with <50% error rate', async () => {
    // GIVEN: Mix of easy and hard words
    const mockMemberships = [{ student_id: 'student-1' }];
    const mockProgress = [
      {
        student_id: 'student-1',
        words_attempted: {
          easy: { attempts: 10, correct: 9 }, // 10% error - should be excluded
          medium: { attempts: 10, correct: 7 }, // 30% error - should be excluded
          hard: { attempts: 10, correct: 2 }, // 80% error - should be included
        },
      },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getCommonMistakes('classroom-1');

    // THEN
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].word).toBe('hard');
  });

  it('should aggregate across multiple students', async () => {
    // GIVEN: Same word attempted by multiple students
    const mockMemberships = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
      { student_id: 'student-3' },
    ];

    const mockProgress = [
      { student_id: 'student-1', words_attempted: { difficult: { attempts: 10, correct: 3 } } },
      { student_id: 'student-2', words_attempted: { difficult: { attempts: 10, correct: 2 } } },
      { student_id: 'student-3', words_attempted: { difficult: { attempts: 10, correct: 4 } } },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getCommonMistakes('classroom-1');

    // THEN
    expect(result.data?.[0].studentCount).toBe(3);
    // Total: 30 attempts, 9 correct = 70% error rate
    expect(result.data?.[0].errorRate).toBeCloseTo(0.7, 1);
  });
});

describe('analytics - getStudentProgressMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return vocabulary mastery percentage', async () => {
    // GIVEN: Student mastered 7 out of 10 lesson words
    const mockLesson = {
      words: [
        { word: 'word1' },
        { word: 'word2' },
        { word: 'word3' },
        { word: 'word4' },
        { word: 'word5' },
        { word: 'word6' },
        { word: 'word7' },
        { word: 'word8' },
        { word: 'word9' },
        { word: 'word10' },
      ],
    };

    const mockProgress = {
      student_id: 'student-1',
      lesson_id: 'lesson-1',
      words_mastered: ['word1', 'word2', 'word3', 'word4', 'word5', 'word6', 'word7'],
      words_attempted: {},
    };

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockLesson, error: null }),
      });

    // WHEN
    const result = await getStudentProgressMetrics('student-1', 'classroom-1');

    // THEN
    expect(result.data?.vocabularyMastery).toBe(70); // 7/10 * 100
  });
});

describe('analytics - getLessonEffectiveness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no lessons assigned', async () => {
    // GIVEN: No lessons assigned to classroom
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: [], error: null }),
    });

    // WHEN
    const result = await getLessonEffectiveness('classroom-empty');

    // THEN
    expect(result.data).toEqual([]);
    expect(result.error).toBeNull();
  });

  it('should calculate averageXpGain correctly', async () => {
    // GIVEN: One lesson with student progress
    const mockAssignments = [{ lesson_id: 'lesson-1' }];
    const mockLesson = { id: 'lesson-1', name: 'Basic Vocabulary' };
    const mockProgress = [
      { student_id: 'student-1', lesson_id: 'lesson-1', total_xp: 100, completed_at: null, words_attempted: {} },
      { student_id: 'student-2', lesson_id: 'lesson-1', total_xp: 200, completed_at: null, words_attempted: {} },
      { student_id: 'student-3', lesson_id: 'lesson-1', total_xp: 300, completed_at: null, words_attempted: {} },
    ];
    const mockMemberships = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
      { student_id: 'student-3' },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockAssignments, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [mockLesson], error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getLessonEffectiveness('classroom-1');

    // THEN
    expect(result.data).toHaveLength(1);
    expect(result.data?.[0].averageXpGain).toBe(200); // (100 + 200 + 300) / 3
  });

  it('should calculate completionRate as percentage', async () => {
    // GIVEN: 2 out of 3 students completed
    const mockAssignments = [{ lesson_id: 'lesson-1' }];
    const mockLesson = { id: 'lesson-1', name: 'Basic Vocabulary' };
    const mockProgress = [
      { student_id: 'student-1', lesson_id: 'lesson-1', total_xp: 100, completed_at: '2024-01-01', words_attempted: {} },
      { student_id: 'student-2', lesson_id: 'lesson-1', total_xp: 200, completed_at: '2024-01-01', words_attempted: {} },
      { student_id: 'student-3', lesson_id: 'lesson-1', total_xp: 300, completed_at: null, words_attempted: {} },
    ];
    const mockMemberships = [
      { student_id: 'student-1' },
      { student_id: 'student-2' },
      { student_id: 'student-3' },
    ];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockAssignments, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [mockLesson], error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getLessonEffectiveness('classroom-1');

    // THEN
    expect(result.data?.[0].completionRate).toBeCloseTo(66.67, 1); // 2/3 * 100
  });

  it('should return lesson name from vocabulary_lessons', async () => {
    // GIVEN: Lesson with name
    const mockAssignments = [{ lesson_id: 'lesson-1' }];
    const mockLesson = { id: 'lesson-1', name: 'Advanced Verbs' };
    const mockProgress = [
      { student_id: 'student-1', lesson_id: 'lesson-1', total_xp: 100, completed_at: null, words_attempted: {} },
    ];
    const mockMemberships = [{ student_id: 'student-1' }];

    (supabase.from as jest.Mock)
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockAssignments, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [mockLesson], error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockMemberships, error: null }),
      })
      .mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ data: mockProgress, error: null }),
      });

    // WHEN
    const result = await getLessonEffectiveness('classroom-1');

    // THEN
    expect(result.data?.[0].lessonName).toBe('Advanced Verbs');
  });
});
