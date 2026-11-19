/**
 * TeacherWorkspaceProCard render gates.
 *
 * The card is the Teacher Pro checkout pitch inside the signed-in teacher
 * workspace, so its audience gate is the contract: hidden for anonymous
 * viewers, students, teachers still waiting on their first joined student,
 * and anyone already on Pro — visible only for a free approved teacher with
 * realized value. The checkout href and copy come straight from
 * TeacherProCheckoutCta (the landing CTA), so mirroring is asserted against
 * that module, not duplicated strings.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeacherWorkspaceProCard } from './TeacherWorkspaceProCard';
import { teacherProCheckoutCopy, TEACHER_PRO_CHECKOUT_PATH } from './TeacherProCheckoutCta';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const OPEN_GATE = {
  isApprovedTeacher: true,
  isFreeTeacher: true,
  classrooms: [{ member_count: 4 }],
};

describe('TeacherWorkspaceProCard', () => {
  describe('audience gate — hidden', () => {
    it('renders nothing for an anonymous viewer', () => {
      const { container } = render(
        <TeacherWorkspaceProCard
          locale="en"
          isApprovedTeacher={false}
          isFreeTeacher
          classrooms={[{ member_count: 4 }]}
        />,
      );
      expect(container).toBeEmptyDOMElement();
      expect(screen.queryByTestId('teacher-pro-checkout-cta')).not.toBeInTheDocument();
    });

    it('renders nothing for a student viewer', () => {
      const { container } = render(
        <TeacherWorkspaceProCard
          locale="en"
          isApprovedTeacher={false}
          isFreeTeacher
          classrooms={[{ member_count: 4 }]}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing while the classroom list is still loading', () => {
      const { container } = render(
        <TeacherWorkspaceProCard locale="en" isApprovedTeacher isFreeTeacher classrooms={null} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for a teacher with zero classrooms', () => {
      const { container } = render(
        <TeacherWorkspaceProCard locale="en" isApprovedTeacher isFreeTeacher classrooms={[]} />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for a teacher whose classrooms have zero joined students', () => {
      const { container } = render(
        <TeacherWorkspaceProCard
          locale="en"
          isApprovedTeacher
          isFreeTeacher
          classrooms={[{ member_count: 0 }, { member_count: null }, { member_count: undefined }]}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing for an approved teacher with students who already has Pro', () => {
      const { container } = render(
        <TeacherWorkspaceProCard
          locale="en"
          isApprovedTeacher
          isFreeTeacher={false}
          classrooms={[{ member_count: 4 }]}
        />,
      );
      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('audience gate — visible', () => {
    it('renders the landing checkout CTA for a free approved teacher with a joined student', () => {
      render(<TeacherWorkspaceProCard locale="en" {...OPEN_GATE} />);

      const cta = screen.getByTestId('teacher-pro-checkout-cta');
      expect(cta).toBeInTheDocument();

      // Value copy mirrors the landing CTA, sourced from the same module.
      const copy = teacherProCheckoutCopy('en');
      expect(screen.getByText(copy.heading)).toBeInTheDocument();
      expect(screen.getByText(copy.body)).toBeInTheDocument();
      expect(screen.getByText(copy.note)).toBeInTheDocument();

      // The exact checkout href TeacherProCheckoutCta already uses.
      const link = screen.getByTestId('teacher-pro-checkout-link');
      expect(link).toHaveAttribute('href', `/en${TEACHER_PRO_CHECKOUT_PATH}`);
      expect(link).toHaveTextContent(copy.cta);
    });

    it('opens the gate when at least one class has a student, even if another class is empty', () => {
      render(
        <TeacherWorkspaceProCard
          locale="en"
          isApprovedTeacher
          isFreeTeacher
          classrooms={[{ member_count: 0 }, { member_count: 2 }]}
        />,
      );
      expect(screen.getByTestId('teacher-pro-checkout-cta')).toBeInTheDocument();
    });

    it('passes the className through to the CTA card', () => {
      render(<TeacherWorkspaceProCard locale="en" className="w-full" {...OPEN_GATE} />);
      expect(screen.getByTestId('teacher-pro-checkout-cta')).toHaveClass('w-full');
    });
  });
});
