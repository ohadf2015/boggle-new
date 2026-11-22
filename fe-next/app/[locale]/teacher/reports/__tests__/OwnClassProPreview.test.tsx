import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    language: 'en',
  }),
}));

const getClassroomStudents = vi.fn();
vi.mock('@/lib/supabase/education/classrooms', () => ({
  getClassroomStudents: (...a: unknown[]) => getClassroomStudents(...a),
}));

import { OwnClassProPreview, OwnClassProPreviewView } from '../OwnClassProPreview';

const ID = '11111111-1111-4111-8111-111111111111';
const roster = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, name: `Kid ${i}` }));

describe('OwnClassProPreviewView', () => {
  it('Given the class roster, Then each real student gets a row with accuracy, mastered and missed words locked', () => {
    render(<OwnClassProPreviewView className="7B" students={roster(3)} />);
    const rows = screen.getAllByTestId('own-preview-row');
    expect(rows.map((r) => within(r).getByTestId('own-preview-name').textContent)).toEqual(['Kid 0', 'Kid 1', 'Kid 2']);
    for (const row of rows) {
      expect(within(row).getAllByTestId('own-preview-locked')).toHaveLength(3);
      expect(row.textContent).not.toMatch(/\d+\s*%/);
    }
    expect(screen.getByTestId('own-class-pro-preview')).toHaveTextContent('teacher.reports.ownPreview.columns.accuracy');
    expect(screen.getByTestId('own-class-pro-preview')).toHaveTextContent('teacher.reports.ownPreview.columns.mastered');
    expect(screen.getByTestId('own-class-pro-preview')).toHaveTextContent('teacher.reports.ownPreview.columns.missed');
  });

  it('Then one line says what Pro shows for each student, under the class name', () => {
    render(<OwnClassProPreviewView className="7B" students={roster(2)} />);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('teacher.reports.ownPreview.title:7B');
    expect(screen.getByTestId('own-preview-line')).toHaveTextContent('teacher.reports.ownPreview.line');
  });

  it('Given a big class, Then it shows the first rows and counts the rest', () => {
    render(<OwnClassProPreviewView className="7B" students={roster(11)} />);
    expect(screen.getAllByTestId('own-preview-row')).toHaveLength(6);
    expect(screen.getByTestId('own-preview-more')).toHaveTextContent('teacher.reports.ownPreview.more_other:5');
  });

  it('Given nobody on the roster, Then nothing renders', () => {
    const { container } = render(<OwnClassProPreviewView className="7B" students={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('OwnClassProPreview', () => {
  beforeEach(() => getClassroomStudents.mockReset());

  it("Given a class, Then it lists that class's students by the name the teacher gave them", async () => {
    getClassroomStudents.mockResolvedValue({
      data: [
        { student_id: 'a', roster_name: 'Maya K', profiles: { display_name: 'maya.k', username: 'u1' } },
        { student_id: 'b', roster_name: null, profiles: { display_name: 'Leo', username: 'u2' } },
      ],
      error: null,
    });
    render(<OwnClassProPreview classroomId={ID} className="7B" />);
    const names = await screen.findAllByTestId('own-preview-name');
    expect(names.map((n) => n.textContent)).toEqual(['Maya K', 'Leo']);
    expect(getClassroomStudents).toHaveBeenCalledWith(ID);
  });

  it('Given the roster read fails, Then nothing renders', async () => {
    getClassroomStudents.mockResolvedValue({ data: [], error: { message: 'x' } });
    const { container } = render(<OwnClassProPreview classroomId={ID} className="7B" />);
    await vi.waitFor(() => expect(getClassroomStudents).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
