import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BlastCodexModal } from '../BlastCodexModal';
import type { BlastComboType } from '../utils/blastCombos';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string, _params?: any) => k }),
}));

// CODEX_COMBOS mock: 31 entries
vi.mock('../utils/blastComboScaling', () => ({
  CODEX_COMBOS: [
    'bomb_bomb', 'bomb_lightning', 'bomb_prism', 'bomb_rainbow', 'bomb_mirror',
    'bomb_magnet', 'bomb_gem', 'bomb_frozen',
    'lightning_lightning', 'lightning_prism', 'lightning_rainbow', 'lightning_mirror',
    'lightning_magnet', 'lightning_gem', 'lightning_frozen',
    'prism_prism', 'prism_rainbow', 'prism_mirror', 'prism_magnet', 'prism_gem', 'prism_frozen',
    'rainbow_mirror', 'rainbow_magnet', 'rainbow_gem', 'rainbow_frozen',
    'mirror_magnet', 'mirror_gem', 'mirror_frozen',
    'magnet_gem', 'magnet_frozen',
    'gem_frozen',
  ] as BlastComboType[],
  CODEX_COMBO_COUNT: 31,
}));

describe('BlastCodexModal', () => {
  const onClose = vi.fn();
  const emptySet = new Set<BlastComboType>();

  beforeEach(() => onClose.mockClear());

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <BlastCodexModal isOpen={false} onClose={onClose} discoveredCombos={emptySet} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal with data-testid="combo-codex-modal" when open', () => {
    render(<BlastCodexModal isOpen={true} onClose={onClose} discoveredCombos={emptySet} />);
    expect(screen.getByTestId('combo-codex-modal')).toBeInTheDocument();
  });

  it('renders header title using t("blast.comboCodex")', () => {
    render(<BlastCodexModal isOpen={true} onClose={onClose} discoveredCombos={emptySet} />);
    expect(screen.getByText('blast.comboCodex')).toBeInTheDocument();
  });

  it('shows progress using t("blast.codexProgress") key', () => {
    render(<BlastCodexModal isOpen={true} onClose={onClose} discoveredCombos={emptySet} />);
    expect(screen.getByText('blast.codexProgress')).toBeInTheDocument();
  });

  it('shows "???" for all 31 combos when none discovered', () => {
    render(<BlastCodexModal isOpen={true} onClose={onClose} discoveredCombos={emptySet} />);
    const lockedCards = screen.getAllByText('blast.codexLocked');
    expect(lockedCards).toHaveLength(31);
  });

  it('shows translated name for discovered combos and ??? for undiscovered', () => {
    const discovered = new Set<BlastComboType>(['bomb_bomb', 'lightning_lightning', 'prism_prism']);
    render(<BlastCodexModal isOpen={true} onClose={onClose} discoveredCombos={discovered} />);

    // 3 discovered combos show their translation keys
    expect(screen.getByText('blast.combo.bomb_bomb')).toBeInTheDocument();
    expect(screen.getByText('blast.combo.lightning_lightning')).toBeInTheDocument();
    expect(screen.getByText('blast.combo.prism_prism')).toBeInTheDocument();

    // remaining 28 show locked placeholder
    const lockedCards = screen.getAllByText('blast.codexLocked');
    expect(lockedCards).toHaveLength(28);
  });

  it('calls onClose when close button is clicked', () => {
    render(<BlastCodexModal isOpen={true} onClose={onClose} discoveredCombos={emptySet} />);
    fireEvent.click(screen.getByTestId('codex-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
