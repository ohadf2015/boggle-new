import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClassAssignCard } from '../ClassPageBlocks';

const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k);

describe('ClassAssignCard', () => {
  it('Given a class page, When it renders, Then an Assign homework button opens the assign dialog for this class', () => {
    render(<ClassAssignCard classroomId="c9" language="he" t={t} />);
    const cta = screen.getByTestId('class-page-assign');
    expect(cta).toHaveAttribute('href', '/he/teacher?classroomId=c9&assign=1');
    expect(cta).toHaveTextContent('teacher.classroom.assignCta');
    expect(screen.getByText('teacher.classroom.assignTitle')).toBeInTheDocument();
  });
});
