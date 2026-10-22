import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
  }),
}));

import { ParentStudentSelect, type SelectableStudent } from '../ParentStudentSelect';

const STUDENTS: SelectableStudent[] = [
  { id: 's1', name: 'Maya Cohen' },
  { id: 's2', name: 'Leo' },
  { id: 's3', name: 'Mayan' },
];

function Harness({ initial = [] as string[] }) {
  const [selected, setSelected] = useState(new Set(initial));
  return (
    <>
      <ParentStudentSelect students={STUDENTS} selected={selected} onChange={setSelected} />
      <output data-testid="picked">{[...selected].sort().join(',')}</output>
    </>
  );
}

describe('ParentStudentSelect', () => {
  it('starts with nobody selected and lists every student with a checkbox', () => {
    render(<Harness />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByTestId('picked').textContent).toBe('');
    expect(screen.getByText('parentReportsFlow.selectedCount|0|3')).toBeInTheDocument();
  });

  it('toggles one student', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Leo' }));
    expect(screen.getByTestId('picked').textContent).toBe('s2');
  });

  it('search narrows the list case-insensitively; select all only picks the matches', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'maya' } });
    expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'parentReportsFlow.selectAll' }));
    expect(screen.getByTestId('picked').textContent).toBe('s1,s3');
  });

  it('clear deselects everyone, including students hidden by the search', () => {
    render(<Harness initial={['s1', 's2']} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'leo' } });
    fireEvent.click(screen.getByRole('button', { name: 'parentReportsFlow.selectNone' }));
    expect(screen.getByTestId('picked').textContent).toBe('');
  });

  it('says so when the search matches nobody', () => {
    render(<Harness />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } });
    expect(screen.getByText('parentReportsFlow.noMatch')).toBeInTheDocument();
  });
});
