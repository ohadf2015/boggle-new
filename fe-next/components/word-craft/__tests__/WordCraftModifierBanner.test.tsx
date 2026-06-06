import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WordCraftModifierBanner } from '../WordCraftModifierBanner';

const t = (k: string) => `[${k}]`;

describe('WordCraftModifierBanner', () => {
  it('announces an active modifier by name + description', () => {
    render(<WordCraftModifierBanner modifier="bingo_bonanza" t={t} />);
    expect(screen.getByText(/wordcraft.modifier.bingo_bonanza/)).toBeTruthy();
    expect(screen.getByText(/wordcraft.modifier.desc.bingo_bonanza/)).toBeTruthy();
  });

  it('renders nothing for the no-op baseline (none)', () => {
    const { container } = render(<WordCraftModifierBanner modifier="none" t={t} />);
    expect(container.firstChild).toBeNull();
  });
});
