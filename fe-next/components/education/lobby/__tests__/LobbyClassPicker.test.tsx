import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LobbyClassPicker } from '../LobbyClassPicker';

describe('<LobbyClassPicker>', () => {
  it('Given one class, Then nothing renders: the setup row already names the class', () => {
    const { container } = render(<LobbyClassPicker classrooms={[{ id: 'a', name: '5B' }]} selectedId="a" onSelect={vi.fn()} label="Class" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('Given two classes, Then both are radios and the selected one is checked', () => {
    render(<LobbyClassPicker classrooms={[{ id: 'a', name: '5B' }, { id: 'b', name: '4A' }]} selectedId="b" onSelect={vi.fn()} label="Class" />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: '4A' })).toHaveAttribute('aria-checked', 'true');
  });
});
