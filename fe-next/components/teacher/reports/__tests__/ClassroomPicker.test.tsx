import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }),
}));

import { ClassroomPicker, ClassHero, accentFor } from '../ClassroomPicker';

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

  it('Given more classes than accents, Then colors cycle', () => {
    expect(accentFor(0)).toBe(accentFor(4));
    expect(accentFor(0)).not.toBe(accentFor(1));
  });
});

describe('<ClassHero>', () => {
  it('Given a class, Then it renders the name and member count', () => {
    render(<ClassHero name="5B English" memberCount={3} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('5B English');
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
