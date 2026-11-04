import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/teacher/TeacherPresencePing', () => ({
  TeacherPresencePing: () => <div data-testid="teacher-presence-ping" />,
}));
vi.mock('@/components/teacher/CheckoutReturnCapture', () => ({
  CheckoutReturnCapture: () => null,
}));

import TeacherLayout from '../layout';
import EducationLayout from '../../education/layout';

describe('shared teacher/education presence mount', () => {
  it('mounts the presence ping on the teacher layout', () => {
    render(
      <TeacherLayout>
        <span>teacher-page</span>
      </TeacherLayout>,
    );
    expect(screen.getByTestId('teacher-presence-ping')).toBeInTheDocument();
    expect(screen.getByText('teacher-page')).toBeInTheDocument();
  });

  it('mounts the presence ping on the education layout', () => {
    render(
      <EducationLayout>
        <span>education-page</span>
      </EducationLayout>,
    );
    expect(screen.getByTestId('teacher-presence-ping')).toBeInTheDocument();
    expect(screen.getByText('education-page')).toBeInTheDocument();
  });
});
