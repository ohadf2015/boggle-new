import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StudentExitDialog } from '../StudentExitDialog';

const t = (key: string) => key;

describe('StudentExitDialog', () => {
  it('Given it is open, Then it uses the same dark surface as the host exit, not cream', () => {
    render(<StudentExitDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} t={t} />);
    const dialog = screen.getByRole('alertdialog');
    expect(dialog.className).toContain('bg-neo-navy-light');
    expect(dialog.className).not.toContain('bg-neo-cream');
  });

  it('speaks to a student: stay is the easy choice, leaving says they can come back', () => {
    render(<StudentExitDialog open onOpenChange={vi.fn()} onConfirm={vi.fn()} t={t} />);
    expect(screen.getByText('eduStudent.exit.title')).toBeInTheDocument();
    expect(screen.getByText('eduStudent.exit.body')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'eduStudent.exit.stay' })).toBeInTheDocument();
  });

  it('When leave is tapped, Then the exit is confirmed', () => {
    const onConfirm = vi.fn();
    render(<StudentExitDialog open onOpenChange={vi.fn()} onConfirm={onConfirm} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'eduStudent.exit.leave' }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it('renders nothing while closed', () => {
    render(<StudentExitDialog open={false} onOpenChange={vi.fn()} onConfirm={vi.fn()} t={t} />);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
