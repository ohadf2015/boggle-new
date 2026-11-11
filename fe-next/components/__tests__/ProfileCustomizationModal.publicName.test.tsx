import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const checkPublicName = vi.fn();
vi.mock('@/lib/names/checkPublicName', () => ({ checkPublicName: (n: string) => checkPublicName(n) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));
vi.mock('@/hooks/useSocialCapabilities', () => ({ useSocialCapabilities: () => ({ tier: 'adult', caps: { customDisplayName: true } }) }));
vi.mock('@/components/join/AvatarSelectorButton', () => ({ default: () => null }));

import ProfileCustomizationModal from '../ProfileCustomizationModal';

describe('ProfileCustomizationModal public-name check', () => {
  beforeEach(() => checkPublicName.mockReset());

  it('Given a profane name, When saving, Then it is refused with a localized error and nothing is saved', async () => {
    checkPublicName.mockResolvedValue('profane');
    const onSave = vi.fn();
    render(<ProfileCustomizationModal isOpen onClose={vi.fn()} defaultName="shit" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('profile-save'));
    await waitFor(() => expect(screen.getByText('publicName.error.profane')).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Given a generated default name, When saving, Then it still saves (it only stays off public boards)', async () => {
    checkPublicName.mockResolvedValue('default');
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileCustomizationModal isOpen onClose={vi.fn()} defaultName="Turbo Salmon" onSave={onSave} />);
    fireEvent.click(screen.getByTestId('profile-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Turbo Salmon', expect.anything()));
  });
});
