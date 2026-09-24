/**
 * The class card keeps rename/delete behind a "…" menu so one class fits a
 * phone without the page scrolling. Those actions must still be reachable,
 * and the menu must close on an outside press (it once used a `fixed`
 * backdrop that a transformed ancestor clipped to the card itself).
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('../../ClassroomStudentList', () => ({ default: () => <div /> }));
vi.mock('../../StudentCapMeter', () => ({ StudentCapMeter: () => <div data-testid="cap" /> }));

import { ClassroomCard } from '../ClassroomCard';

const CLASS = { id: 'c1', name: 'Year 7', language: 'en', join_code: 'AB12CD', member_count: 2 };

function renderCard(overrides: Partial<Parameters<typeof ClassroomCard>[0]> = {}) {
  const props = {
    classroom: CLASS,
    index: 0,
    expanded: false,
    onToggleExpanded: vi.fn(),
    onCopy: vi.fn(),
    onShare: vi.fn(),
    googleHref: 'https://classroom.google.com/share?url=x',
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
  render(<ClassroomCard {...props} />);
  return props;
}

describe('ClassroomCard actions menu', () => {
  it('Given the card, Then rename/delete are not on its face but the menu button is', () => {
    renderCard();
    expect(screen.queryByRole('menuitem')).toBeNull();
    expect(screen.getByTestId('classroom-card-menu')).toHaveAttribute('aria-expanded', 'false');
  });

  it('When the teacher opens the menu and taps Edit, Then edit runs and the menu closes', () => {
    const props = renderCard();
    fireEvent.click(screen.getByTestId('classroom-card-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: /teacher.classroom.edit/ }));
    expect(props.onEdit).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('classroom-card-menu')).toHaveAttribute('aria-expanded', 'false');
  });

  it('When the teacher opens the menu and taps Delete, Then delete runs', () => {
    const props = renderCard();
    fireEvent.click(screen.getByTestId('classroom-card-menu'));
    fireEvent.click(screen.getByRole('menuitem', { name: /teacher.classroom.delete/ }));
    expect(props.onDelete).toHaveBeenCalledTimes(1);
  });

  it('When the teacher presses outside the menu, Then it closes', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('classroom-card-menu'));
    expect(screen.getByTestId('classroom-card-menu')).toHaveAttribute('aria-expanded', 'true');
    fireEvent.pointerDown(document.body);
    expect(screen.getByTestId('classroom-card-menu')).toHaveAttribute('aria-expanded', 'false');
  });

  it('When the teacher presses Escape, Then it closes', () => {
    renderCard();
    fireEvent.click(screen.getByTestId('classroom-card-menu'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('classroom-card-menu')).toHaveAttribute('aria-expanded', 'false');
  });

  it('Given a Google Classroom link, Then it stays one tap away on the card face', () => {
    renderCard();
    const link = screen.getByTestId('share-to-google-classroom');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
