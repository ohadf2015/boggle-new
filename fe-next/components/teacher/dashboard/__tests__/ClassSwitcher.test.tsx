/**
 * ClassSwitcher — which class the command deck is describing.
 *
 * The deck shows one class in full. Without this, which one was an accident
 * of `classrooms[0]`, and a teacher with three classes had to open a
 * collapsed tools drawer to change it.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassSwitcher } from '../ClassSwitcher';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: (key: string, a?: unknown, b?: unknown) => {
      const params = (typeof a === 'object' && a !== null ? a : b) as Record<string, unknown> | undefined;
      return params
        ? `${key} ${Object.entries(params).map(([k, v]) => `${k}=${String(v)}`).join(' ')}`
        : key;
    },
  }),
  LanguageContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}));

const classes = [
  { id: 'c1', name: 'Year 7 English', member_count: 3 },
  { id: 'c2', name: 'Year 8 Set 2', member_count: 0 },
];

describe('ClassSwitcher', () => {
  it('renders nothing when there is only one class', () => {
    // A control that offers no choice is furniture in front of the content.
    const { container } = render(
      <ClassSwitcher classrooms={[classes[0]]} selectedId="c1" onSelect={vi.fn()} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('offers one pressable per class and marks the selected one', () => {
    render(<ClassSwitcher classrooms={classes} selectedId="c2" onSelect={vi.fn()} />);

    expect(screen.getByTestId('class-switch-c1')).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('class-switch-c2')).toHaveAttribute('aria-pressed', 'true');
  });

  it('carries each class roster on its own chip, so the row itself says something', () => {
    render(<ClassSwitcher classrooms={classes} selectedId="c1" onSelect={vi.fn()} />);

    expect(screen.getByTestId('class-switch-c1')).toHaveTextContent('Year 7 English');
    expect(screen.getByTestId('class-switch-c1')).toHaveTextContent('3');
    expect(screen.getByTestId('class-switch-c2')).toHaveTextContent('0');
  });

  it('hands the chosen class id up', async () => {
    const onSelect = vi.fn();
    render(<ClassSwitcher classrooms={classes} selectedId="c1" onSelect={onSelect} />);

    await userEvent.click(screen.getByTestId('class-switch-c2'));

    expect(onSelect).toHaveBeenCalledWith('c2');
  });
});
