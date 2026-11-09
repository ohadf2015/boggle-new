import { render, screen } from '@testing-library/react';
import { NeoButton } from '../button';
import { NEO_BLOCK_TONES, NEO_BUTTON } from '../neoStyles';
import { cn } from '@/lib/utils';

describe('NeoButton', () => {
  it('renders the primary action with the shared classes', () => {
    render(<NeoButton>Start</NeoButton>);
    const el = screen.getByRole('button', { name: 'Start' });
    expect(el).toHaveAttribute('type', 'button');
    expect(el.className).toBe(cn(NEO_BUTTON.primary));
  });

  it('layers a block tone over the small button, the same cn() order call sites used', () => {
    render(<NeoButton variant="small" tone="cyan">Copy</NeoButton>);
    expect(screen.getByRole('button').className).toBe(cn(NEO_BUTTON.small, NEO_BLOCK_TONES.cyan));
  });

  it('keeps the live lip-press button distinct from the teacher press', () => {
    render(<NeoButton variant="livePrimary">Go</NeoButton>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('shadow-[0_4px_0_0]');
    expect(cls).not.toContain('hover:-translate-y-px');
  });

  it('appends caller classes and renders its child via asChild', () => {
    render(
      <NeoButton asChild variant="secondary" className="w-full">
        <a href="https://example.com/x">Open</a>
      </NeoButton>,
    );
    const link = screen.getByRole('link', { name: 'Open' });
    expect(link.className).toBe(cn(NEO_BUTTON.secondary, 'w-full'));
  });
});
