/**
 * Practice Session Operations
 * Foundation stubs for Phase 37 (Practice Modes)
 * TODO: Implement in Phase 37
 */

export interface PracticeSession {
  id: string;
  studentId: string;
  lessonId: string;
  mode: 'matching' | 'spelling' | 'blitz';
  score: number;
  completedAt: string | null;
}

// Stub functions — will be implemented in Phase 37
