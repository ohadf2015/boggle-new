/**
 * CosmeticUnlockToast — the redesigned unlock capsule (replaces the old bare
 * green-check toast.success). Verifies it renders the cosmetic name, the equip
 * CTA, a rarity badge, and deep-links to the collection.
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CosmeticUnlockToastContent from '../CosmeticUnlockToast';
import { COSMETICS } from '@/lib/cosmetics';

const t = (key: string) => key;

describe('CosmeticUnlockToast', () => {
  const cosmetic = COSMETICS.find((c) => c.id === 'tile-neon')!;

  function renderToast(isRtl = false) {
    return render(
      <CosmeticUnlockToastContent
        cosmetic={cosmetic}
        href="/en/profile?tab=collection"
        isVisible
        isRtl={isRtl}
        t={t}
        onDismiss={vi.fn()}
      />,
    );
  }

  it('shows the cosmetic name, unlocked label and equip CTA', () => {
    renderToast();
    expect(screen.getByText(cosmetic.name)).toBeInTheDocument();
    expect(screen.getByText('cosmetics.unlockedLabel')).toBeInTheDocument();
    expect(screen.getByText('cosmetics.equipCta')).toBeInTheDocument();
  });

  it('renders a rarity badge for the cosmetic', () => {
    renderToast();
    expect(screen.getByText(`cosmetics.rarity.${cosmetic.rarity}`)).toBeInTheDocument();
  });

  it('deep-links the whole capsule to the cosmetics collection', () => {
    renderToast();
    const link = screen.getByTestId('cosmetic-unlock-toast');
    expect(link).toHaveAttribute('href', '/en/profile?tab=collection');
  });
});
