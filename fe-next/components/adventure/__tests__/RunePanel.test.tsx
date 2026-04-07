import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import RunePanel from '../RunePanel';
import type { PlayerRune } from '@/types/adventure';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      if (params) {
        let result = key;
        for (const [k, v] of Object.entries(params)) {
          result = result.replace(`{${k}}`, String(v));
        }
        return result;
      }
      return key;
    },
    locale: 'en',
    dir: 'ltr',
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

vi.mock('next/image', () => ({
  // eslint-disable-next-line @next/next/no-img-element
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

describe('RunePanel', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    runes: [] as PlayerRune[],
    fragments: 0,
    onForge: vi.fn(),
    onEquip: vi.fn(),
    onUnequip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // Rendering
  // ========================================

  it('renders when open', () => {
    render(<RunePanel {...defaultProps} />);
    expect(screen.getByTestId('rune-panel')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<RunePanel {...defaultProps} isOpen={false} />);
    expect(screen.queryByTestId('rune-panel')).not.toBeInTheDocument();
  });

  it('shows fragment count', () => {
    render(<RunePanel {...defaultProps} fragments={25} />);
    expect(screen.getByTestId('rune-fragments')).toHaveTextContent('25');
  });

  it('shows equipped count', () => {
    const runes: PlayerRune[] = [
      { runeId: 'ember', equipped: true },
      { runeId: 'midas', equipped: false },
    ];
    render(<RunePanel {...defaultProps} runes={runes} />);
    expect(screen.getByTestId('rune-equipped-count')).toHaveTextContent('1/3');
  });

  // ========================================
  // Rune catalog display
  // ========================================

  it('shows all 12 runes from catalog', () => {
    render(<RunePanel {...defaultProps} />);
    expect(screen.getByTestId('rune-card-ember')).toBeInTheDocument();
    expect(screen.getByTestId('rune-card-dragonslayer')).toBeInTheDocument();
  });

  it('marks owned runes differently from locked', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    render(<RunePanel {...defaultProps} runes={runes} />);
    const emberCard = screen.getByTestId('rune-card-ember');
    expect(emberCard).toHaveAttribute('data-owned', 'true');
    const midasCard = screen.getByTestId('rune-card-midas');
    expect(midasCard).toHaveAttribute('data-owned', 'false');
  });

  it('shows rune images for owned runes', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    render(<RunePanel {...defaultProps} runes={runes} />);
    const img = screen.getByAltText('adventure.runes.ember.name');
    expect(img).toHaveAttribute('src', '/images/runes/rune-ember.webp');
  });

  // ========================================
  // Forging
  // ========================================

  it('shows forge button for unowned runes when enough fragments', () => {
    render(<RunePanel {...defaultProps} fragments={10} />);
    // ember is common, costs 5 fragments
    const forgeBtn = screen.getByTestId('rune-forge-ember');
    expect(forgeBtn).not.toBeDisabled();
  });

  it('disables forge button when insufficient fragments', () => {
    render(<RunePanel {...defaultProps} fragments={2} />);
    const forgeBtn = screen.getByTestId('rune-forge-ember');
    expect(forgeBtn).toBeDisabled();
  });

  it('calls onForge when forge button clicked', () => {
    const onForge = vi.fn();
    render(<RunePanel {...defaultProps} fragments={10} onForge={onForge} />);
    fireEvent.click(screen.getByTestId('rune-forge-ember'));
    expect(onForge).toHaveBeenCalledWith('ember');
  });

  it('hides forge button for already owned runes', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    render(<RunePanel {...defaultProps} runes={runes} />);
    expect(screen.queryByTestId('rune-forge-ember')).not.toBeInTheDocument();
  });

  // ========================================
  // Equipping / Unequipping
  // ========================================

  it('shows equip button for owned unequipped runes', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    render(<RunePanel {...defaultProps} runes={runes} />);
    expect(screen.getByTestId('rune-equip-ember')).toBeInTheDocument();
  });

  it('shows unequip button for equipped runes', () => {
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: true }];
    render(<RunePanel {...defaultProps} runes={runes} />);
    expect(screen.getByTestId('rune-unequip-ember')).toBeInTheDocument();
  });

  it('calls onEquip when equip button clicked', () => {
    const onEquip = vi.fn();
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: false }];
    render(<RunePanel {...defaultProps} runes={runes} onEquip={onEquip} />);
    fireEvent.click(screen.getByTestId('rune-equip-ember'));
    expect(onEquip).toHaveBeenCalledWith('ember');
  });

  it('calls onUnequip when unequip button clicked', () => {
    const onUnequip = vi.fn();
    const runes: PlayerRune[] = [{ runeId: 'ember', equipped: true }];
    render(<RunePanel {...defaultProps} runes={runes} onUnequip={onUnequip} />);
    fireEvent.click(screen.getByTestId('rune-unequip-ember'));
    expect(onUnequip).toHaveBeenCalledWith('ember');
  });

  it('disables equip when 3 runes already equipped', () => {
    const runes: PlayerRune[] = [
      { runeId: 'ember', equipped: true },
      { runeId: 'midas', equipped: true },
      { runeId: 'flow', equipped: true },
      { runeId: 'hourglass', equipped: false },
    ];
    render(<RunePanel {...defaultProps} runes={runes} />);
    expect(screen.getByTestId('rune-equip-hourglass')).toBeDisabled();
  });

  // ========================================
  // Close
  // ========================================

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<RunePanel {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('rune-panel-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
