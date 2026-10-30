import { render, screen, fireEvent, within } from '@testing-library/react';

vi.mock('react-hot-toast', () => ({ __esModule: true, default: { error: vi.fn(), success: vi.fn() } }));
vi.mock('@/hooks/gameState', () => ({ useGameActions: () => ({ setGameMode: vi.fn(), setHostSelectedGameMode: vi.fn() }) }));

import { LobbyModeSwitcher } from '../lobby/LobbyModeSwitcher';

const socket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() } as never;
const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}|${JSON.stringify(params)}` : key);
const ACCENT = /(^|\s)bg-neo-(lime|cyan|pink|purple|yellow)(\/\d+)?(\s|$)/;

function openSheet() {
  render(<LobbyModeSwitcher gameCode="JATS5Z" currentMode="classic" socket={socket} t={t} showName={false} />);
  fireEvent.click(screen.getByTestId('lobby-change-mode'));
  return screen.getByTestId('lobby-mode-sheet');
}

describe('Change-game sheet: calm selection', () => {
  it('given the sheet is open, when a mode is live, then its card has a lime ring and check, never a colored fill', () => {
    openSheet();
    const live = screen.getByTestId('mode-tile-classic');
    expect(live).toHaveAttribute('aria-checked', 'true');
    expect(live.className).not.toMatch(ACCENT);
    expect(live.className).toMatch(/ring-neo-lime/);
    expect(within(live).getByTestId('mode-selected-check')).toBeInTheDocument();
    for (const el of Array.from(screen.getByTestId('lobby-mode-sheet').querySelectorAll<HTMLElement>('[class]'))) {
      expect(el.getAttribute('class') ?? '').not.toMatch(ACCENT);
    }
  });

  it('given the sheet is open, then nothing in it shouts in capitals', () => {
    const sheet = openSheet();
    expect(sheet.querySelectorAll('.uppercase')).toHaveLength(0);
  });

  it('given a card, then where it plays reads as a short label with the full label on hover', () => {
    openSheet();
    const tag = within(screen.getByTestId('mode-tile-classic')).getByTestId(/^delivery-tag-/);
    const delivery = tag.getAttribute('data-testid')!.replace('delivery-tag-', '');
    expect(tag).toHaveTextContent(`eduShell.deliveryShort.${delivery}`);
    expect(tag).toHaveAttribute('title', `eduShell.delivery.${delivery}`);
  });
});
