import { describe, it, expect } from 'vitest';
import { summarizeAssignmentCompletions } from '../assignmentCompletionReport';

const roster = 4;

describe('summarizeAssignmentCompletions', () => {
  it('treats 0 submitted as valid', () => {
    const rows = summarizeAssignmentCompletions([
      { id: 'a1', title: 'Week 1 nouns', completion_count: 0, student_count: roster },
    ]);
    expect(rows).toEqual([
      { assignmentId: 'a1', title: 'Week 1 nouns', submitted: 0, roster },
    ]);
  });

  it('counts a partial classroom', () => {
    const rows = summarizeAssignmentCompletions([
      { id: 'a1', title: 'Week 1 nouns', completion_count: 2, student_count: roster },
    ]);
    expect(rows[0]).toMatchObject({ submitted: 2, roster });
  });

  it('counts an all-submitted classroom', () => {
    const rows = summarizeAssignmentCompletions([
      { id: 'a1', title: 'Week 1 nouns', completion_count: roster, student_count: roster },
    ]);
    expect(rows[0]).toMatchObject({ submitted: roster, roster });
  });

  it('falls back to the lesson name and clamps missing counts to 0', () => {
    const rows = summarizeAssignmentCompletions(
      [{ id: 'a2', vocabulary_lessons: { name: 'Verbs' } }],
      'Untitled lesson',
    );
    expect(rows[0]).toEqual({
      assignmentId: 'a2',
      title: 'Verbs',
      submitted: 0,
      roster: 0,
    });
  });

  it('returns an empty list when the classroom has no assignments', () => {
    expect(summarizeAssignmentCompletions([])).toEqual([]);
  });
});
