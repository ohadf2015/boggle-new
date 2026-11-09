import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassSwitcher } from '../ClassSwitcher';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

const classes = [{ id: 'a', name: 'Class A' }, { id: 'b', name: 'Class B' }];

describe('ClassSwitcher', () => {
  it('renders nothing for a single class', () => {
    const { container } = render(<ClassSwitcher classrooms={[classes[0]]} activeId="a" onSelect={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('marks the active class and switches on tap of another', () => {
    const onSelect = vi.fn();
    render(<ClassSwitcher classrooms={classes} activeId="a" onSelect={onSelect} />);
    expect(screen.getByRole('radio', { name: 'Class A' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('radio', { name: 'Class A' }));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('radio', { name: 'Class B' }));
    expect(onSelect).toHaveBeenCalledWith('b');
  });
});
