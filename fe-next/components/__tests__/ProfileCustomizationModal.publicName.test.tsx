import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const checkPublicName = vi.fn();
vi.mock('@/lib/names/checkPublicName', () => ({ checkPublicName: (n: string) => checkPublicName(n) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));
vi.mock('@/hooks/useSocialCapabilities', () => ({ useSocialCapabilities: () => ({ tier: 'adult', caps: { customDisplayName: true } }) }));
vi.mock('@/components/join/AvatarSelectorButton', () => ({ default: () => null }));

import ProfileCustomizationModal from '../ProfileCustomizationModal';

const typeName = (name: string) =>
  fireEvent.change(screen.getByLabelText('profileCustomization.namePlaceholder'), { target: { value: name } });

describe('ProfileCustomizationModal public-name check', () => {
  beforeEach(() => checkPublicName.mockReset());

  it('Given a profane name, When saving, Then it is refused with a localized error and nothing is saved', async () => {
    checkPublicName.mockResolvedValue('profane');
    const onSave = vi.fn();
    render(<ProfileCustomizationModal isOpen onClose={vi.fn()} onSave={onSave} />);
    typeName('shit');
    fireEvent.click(screen.getByTestId('profile-save'));
    await waitFor(() => expect(screen.getByText('publicName.error.profane')).toBeTruthy());
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Given a generated default name, When saving, Then it still saves (it only stays off public boards)', async () => {
    checkPublicName.mockResolvedValue('default');
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProfileCustomizationModal isOpen onClose={vi.fn()} onSave={onSave} />);
    typeName('Turbo Salmon');
    fireEvent.click(screen.getByTestId('profile-save'));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith('Turbo Salmon', expect.anything()));
  });

  it('Given the required name step opens, Then the name box is empty (no prefilled default) and saving an empty name does nothing', async () => {
    const onSave = vi.fn();
    render(<ProfileCustomizationModal isOpen onClose={vi.fn()} onSave={onSave} />);
    expect((screen.getByLabelText('profileCustomization.namePlaceholder') as HTMLInputElement).value).toBe('');
    fireEvent.click(screen.getByTestId('profile-save'));
    await new Promise((r) => setTimeout(r, 0));
    expect(onSave).not.toHaveBeenCalled();
    expect(checkPublicName).not.toHaveBeenCalled();
  });
});
