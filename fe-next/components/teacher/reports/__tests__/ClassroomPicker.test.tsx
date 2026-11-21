import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

import { ClassroomPicker, accentFor } from '../ClassroomPicker';

const classes = [
  { id: 'a', name: '5B English', member_count: 3 },
  { id: 'b', name: 'כיתה', member_count: 0 },
] as never;

describe('<ClassroomPicker>', () => {
  it('Given classes, Then each is a button showing badge, name and student count, and click picks it', () => {
    const onSelect = vi.fn();
    render(<ClassroomPicker classrooms={classes} onSelect={onSelect} />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
    expect(screen.getByText('5B')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /5B English/ }));
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('Given the picker, Then the open-class arrow is outlined, not a lime fill', () => {
    const { container } = render(<ClassroomPicker classrooms={classes} onSelect={vi.fn()} />);
    const arrows = [...container.querySelectorAll('span.size-11')];
    expect(arrows).toHaveLength(2);
    for (const arrow of arrows) expect(arrow.className).not.toMatch(/(^|\s)bg-neo-lime(\s|$)/);
  });

  it('Given one class is on show above, Then its tile says so and the rest do not', () => {
    render(<ClassroomPicker classrooms={classes} onSelect={vi.fn()} shownId="a" />);
    const tiles = screen.getAllByRole('button');
    expect(tiles[0]).toHaveAttribute('aria-current', 'true');
    expect(tiles[0]).toHaveTextContent('teacher.reports.picker.showing');
    expect(tiles[1]).not.toHaveAttribute('aria-current');
    expect(tiles[1]).not.toHaveTextContent('teacher.reports.picker.showing');
  });

  it('Given more classes than accents, Then colors cycle', () => {
    expect(accentFor(0)).toBe(accentFor(4));
    expect(accentFor(0)).not.toBe(accentFor(1));
  });
});
