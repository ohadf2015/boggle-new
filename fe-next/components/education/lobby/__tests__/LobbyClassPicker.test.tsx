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

  it('Given the selected class past the edge of a narrow row, Then the row scrolls it into view', () => {
    const spy = vi.fn();
    Element.prototype.scrollIntoView = spy;
    render(<LobbyClassPicker classrooms={[{ id: 'a', name: '5B' }, { id: 'b', name: '4A' }, { id: 'c', name: '3C' }]} selectedId="c" onSelect={vi.fn()} label="Class" />);
    expect(spy).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
    expect(spy.mock.contexts[0]).toBe(screen.getByRole('radio', { name: '3C' }));
  });

  it('Given two classes, Then the chosen one is a pink chip with black ink and an outline, never a lime ring on cream', () => {
    render(<LobbyClassPicker classrooms={[{ id: 'a', name: '5B' }, { id: 'b', name: '4A' }]} selectedId="b" onSelect={vi.fn()} label="Class" />);
    const on = screen.getByRole('radio', { name: '4A' });
    expect(on).toHaveClass('bg-neo-pink', 'text-neo-black', 'border-neo-black');
    expect(on.className).not.toMatch(/neo-lime/);
  });

  it('Given many classes on a wide lobby, Then the row stops short of the mascot hanging over its end', () => {
    render(<LobbyClassPicker classrooms={[{ id: 'a', name: '5B' }, { id: 'b', name: '4A' }]} selectedId="b" onSelect={vi.fn()} label="Class" />);
    expect(screen.getByTestId('lobby-class-picker').parentElement?.className).toContain('@4xl/lobby:pe-[9.5rem]');
  });
});
