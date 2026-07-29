import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BlastModifierBadge } from '../BlastModifierBadge';
import { BLAST_MODIFIERS } from '../utils/blastModifiers';

const t = (key: string) => {
  const map: Record<string, string> = {
    'blast.modifier.chainFrenzy.name': 'Chain Frenzy',
    'blast.modifier.chainFrenzy.desc': 'Cascades go wild',
    'blast.modifier.incoming': 'Modifier',
  };
  return map[key] ?? '';
};

describe('BlastModifierBadge', () => {
  it('renders nothing when modifier is null', () => {
    const { container } = render(<BlastModifierBadge modifier={null} variant="chip" t={t} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the localized name as a chip', () => {
    render(<BlastModifierBadge modifier={BLAST_MODIFIERS.chainFrenzy} variant="chip" t={t} />);
    expect(screen.getByTestId('blast-modifier-chip')).toBeInTheDocument();
    expect(screen.getByText('Chain Frenzy')).toBeInTheDocument();
  });

  it('renders name + description as a banner', () => {
    render(<BlastModifierBadge modifier={BLAST_MODIFIERS.chainFrenzy} variant="banner" t={t} />);
    expect(screen.getByTestId('blast-modifier-banner')).toBeInTheDocument();
    expect(screen.getByText('Chain Frenzy')).toBeInTheDocument();
    expect(screen.getByText('Cascades go wild')).toBeInTheDocument();
  });

  it('falls back to the modifier id when translation is missing', () => {
    render(<BlastModifierBadge modifier={BLAST_MODIFIERS.goldRush} variant="chip" t={t} />);
    expect(screen.getByText('goldRush')).toBeInTheDocument();
  });
});
