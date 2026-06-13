import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { WordCraftModifierChip } from '../WordCraftModifierChip';

const t = (k: string, fallback?: string) => fallback ?? `[${k}]`;

describe('WordCraftModifierChip', () => {
  it('renders nothing for the no-op baseline modifier', () => {
    const { container } = render(<WordCraftModifierChip modifier="none" t={t} />);
    expect(container.firstChild).toBeNull();
  });

  it('announces an active modifier with its label', () => {
    const { container, getByText } = render(<WordCraftModifierChip modifier="land_grab" t={t} />);
    expect(container.firstChild).not.toBeNull();
    // Falls back to the human label when the i18n key is absent.
    expect(getByText(/Land Grab/i)).toBeTruthy();
  });

  it('uses status role so it is announced, not interactive', () => {
    const { container } = render(<WordCraftModifierChip modifier="bingo_bonanza" t={t} />);
    expect(container.querySelector('[role="status"]')).toBeTruthy();
    expect(container.querySelector('button')).toBeNull();
  });
});
