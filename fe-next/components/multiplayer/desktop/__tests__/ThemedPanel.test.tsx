import { render, screen } from '@testing-library/react';
import { ThemedPanel } from '../ThemedPanel';

describe('ThemedPanel', () => {
  it('renders mode-specific border + shadow classes', () => {
    const { rerender } = render(
      <ThemedPanel mode="classic" testId="p"><span>x</span></ThemedPanel>
    );
    expect(screen.getByTestId('p').className).toMatch(/border-neo-cyan/);
    expect(screen.getByTestId('p').className).toMatch(/shadow-hard-cyan/);

    rerender(<ThemedPanel mode="blast" testId="p"><span>x</span></ThemedPanel>);
    expect(screen.getByTestId('p').className).toMatch(/border-neo-lime/);
    expect(screen.getByTestId('p').className).toMatch(/shadow-hard-lime/);
  });

  it('renders header label when provided', () => {
    render(
      <ThemedPanel mode="wheel-rush" header="ROSTER" testId="p"><span>x</span></ThemedPanel>
    );
    expect(screen.getByText('ROSTER')).toBeInTheDocument();
  });

  it('renders halftone overlay by default and skips when withTexture=false', () => {
    const { container, rerender } = render(
      <ThemedPanel mode="classic" testId="p"><span>x</span></ThemedPanel>
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();

    rerender(<ThemedPanel mode="classic" testId="p" withTexture={false}><span>x</span></ThemedPanel>);
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it('exposes data-mode attribute for selectors', () => {
    render(
      <ThemedPanel mode="word-hunt" testId="p"><span>x</span></ThemedPanel>
    );
    expect(screen.getByTestId('p').getAttribute('data-mode')).toBe('word-hunt');
  });

  it('uses logical-prop classes only (RTL safe)', () => {
    const { container } = render(
      <ThemedPanel mode="blast" header="X" testId="p"><span>x</span></ThemedPanel>
    );
    const html = container.innerHTML;
    expect(html).not.toMatch(/\s(ml|mr|pl|pr)-\d/);
  });
});
