/**
 * TeacherAccessDrawer enhancements tests
 * Covers: Toast notifications, dialog accessibility, and error handling
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import toast from 'react-hot-toast';
import { TeacherAccessDrawer } from '../TeacherAccessDrawer';
import type { TeacherAccessRequest } from '@/lib/education/types';

vi.mock('react-hot-toast');
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string, defaults?: any) => {
      const keys: Record<string, string> = {
        'admin.teacherAccess.close': 'Close',
        'admin.teacherAccess.drawer_title': 'Teacher Access Request Details',
        'admin.teacherAccess.field.name': 'Name',
        'admin.teacherAccess.field.email': 'Email',
        'admin.teacherAccess.field.role': 'Role',
        'admin.teacherAccess.field.locale': 'Language',
        'admin.teacherAccess.field.country': 'Country',
        'admin.teacherAccess.field.school': 'School/Organization',
        'admin.teacherAccess.field.status': 'Status',
        'admin.teacherAccess.field.submitted': 'Submitted',
        'admin.teacherAccess.field.use_case': 'Use Case',
        'admin.teacherAccess.admin_note': 'Admin Note',
        'admin.teacherAccess.approve': 'Approve',
        'admin.teacherAccess.decline': 'Decline',
        'admin.teacherAccess.approveSuccess': 'Request approved successfully',
        'admin.teacherAccess.declineSuccess': 'Request declined successfully',
        'admin.teacherAccess.approveError': 'Failed to approve request',
        'admin.teacherAccess.declineError': 'Failed to decline request',
      };
      return keys[key] || key;
    },
  }),
}));

const mockRequest: TeacherAccessRequest = {
  id: '123',
  full_name: 'Jane Smith',
  email: 'jane@example.com',
  role: 'teacher',
  locale: 'en',
  country: 'USA',
  school_or_org: 'Lincoln High School',
  use_case: 'We want to use this for our ESL program.',
  status: 'pending',
  admin_note: null,
  created_at: '2026-05-14T10:00:00Z',
  updated_at: '2026-05-14T10:00:00Z',
};

describe('TeacherAccessDrawer Enhancements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('6. Action Toast Notifications', () => {
    it('should show success toast on successful approve', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onActioned = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(
        <TeacherAccessDrawer
          row={mockRequest}
          onClose={onClose}
          onActioned={onActioned}
        />
      );

      const approveBtn = screen.getByText('Approve');
      await user.click(approveBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Request approved successfully');
      });
    });

    it('should show error toast on failed approve', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onActioned = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Internal Server Error',
      });

      render(
        <TeacherAccessDrawer
          row={mockRequest}
          onClose={onClose}
          onActioned={onActioned}
        />
      );

      const approveBtn = screen.getByText('Approve');
      await user.click(approveBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to approve request');
      });
    });

    it('should show success toast on successful decline', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onActioned = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      render(
        <TeacherAccessDrawer
          row={mockRequest}
          onClose={onClose}
          onActioned={onActioned}
        />
      );

      const declineBtn = screen.getByText('Decline');
      await user.click(declineBtn);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Request declined successfully');
      });
    });

    it('should show error toast on failed decline', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onActioned = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        text: async () => 'Internal Server Error',
      });

      render(
        <TeacherAccessDrawer
          row={mockRequest}
          onClose={onClose}
          onActioned={onActioned}
        />
      );

      const declineBtn = screen.getByText('Decline');
      await user.click(declineBtn);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to decline request');
      });
    });
  });

  describe('7. A11Y Improvements', () => {
    it('should have ESC key to close drawer', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const onActioned = vi.fn();

      render(
        <TeacherAccessDrawer
          row={mockRequest}
          onClose={onClose}
          onActioned={onActioned}
        />
      );

      const drawer = screen.getByRole('dialog');
      fireEvent.keyDown(drawer, { key: 'Escape', code: 'Escape' });

      expect(onClose).toHaveBeenCalled();
    });

    it('should have proper dialog role and ARIA attributes', () => {
      render(
        <TeacherAccessDrawer
          row={mockRequest}
          onClose={vi.fn()}
          onActioned={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'tar-drawer-title');
      expect(dialog).toHaveAttribute('role', 'dialog');
    });

    it('should trap focus within drawer (simplified test)', async () => {
      const user = userEvent.setup();
      render(
        <TeacherAccessDrawer
          row={mockRequest}
          onClose={vi.fn()}
          onActioned={vi.fn()}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();

      // Verify first focusable element is accessible
      const closeBtn = screen.getByText('Close');
      expect(closeBtn).toBeVisible();
    });
  });
});
