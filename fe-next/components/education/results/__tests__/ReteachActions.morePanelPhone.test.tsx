import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ReteachActions } from '../ReteachActions';
import type { ReteachLinks } from '../useReteachLinks';

const links = {
  canLaunchMissGapQuestionPack: false,
  onPrintPracticeSheet: vi.fn(),
  onPrintUnpluggedPack: vi.fn(),
  onShareMissGapPractice: vi.fn(),
  missGapShareState: 'idle',
} as unknown as ReteachLinks;

describe('ReteachActions variant="more" on a teacher phone', () => {
  it('Given a 390px recap, When More opens, Then the panel drops below the row instead of rising above the screen top', () => {
    render(<ReteachActions links={links} onReteach={vi.fn()} t={(k) => k} variant="more" />);
    const panel = screen.getByTestId('reteach-more-panel').className;
    expect(panel).toContain('max-lg:top-full');
    expect(panel).toContain('max-lg:bottom-auto');
    expect(panel).toContain('lg:bottom-full');
  });

  it('Given the panel points down on a phone, Then the chevron points down too', () => {
    render(<ReteachActions links={links} onReteach={vi.fn()} t={(k) => k} variant="more" />);
    const chevron = screen.getByTestId('reteach-more-actions').querySelector('[data-testid="reteach-more-chevron"]') as SVGElement;
    expect(chevron.getAttribute('class')).toContain('max-lg:rotate-180');
  });
});

describe('ReteachActions variant="more" — opening brings the panel on screen', () => {
  it('Given the panel opens below the fold, When More is toggled open, Then it scrolls into view', () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    render(<ReteachActions links={links} onReteach={vi.fn()} t={(k) => k} variant="more" />);
    const details = screen.getByTestId('reteach-more') as HTMLDetailsElement;
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
    expect(scrollIntoView).toHaveBeenCalledWith(expect.objectContaining({ block: 'nearest' }));
  });
});
