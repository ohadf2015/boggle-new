'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Pencil } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import { setStoredCustomAvatar } from '@/utils/profileStorage';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

const AvatarBuilderModal = dynamic(() => import('@/components/avatar/AvatarBuilderModal'), { ssr: false });

interface EditAvatarButtonProps {
  t: (key: string) => string;
  config: CustomAvatarConfig | null;
  onSaved: (config: CustomAvatarConfig) => void;
}

export function EditAvatarButton({ t, config, onSaved }: EditAvatarButtonProps) {
  const [open, setOpen] = useState(false);
  const { user, updateProfile, refreshProfile } = useAuth();
  const premium = useAvatarPremium();
  const label = t('profile.showcase.editAvatar');

  const handleSave = async (next: CustomAvatarConfig) => {
    if (user) {
      const { error } = await updateProfile({ avatar_config: next });
      if (error) {
        toast.error(t('profile.saveError'));
        return;
      }
      await refreshProfile();
    } else {
      setStoredCustomAvatar(next);
    }
    onSaved(next);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="hp-edit-avatar"
        className="flex h-9 w-9 items-center justify-center gap-1.5 rounded-full border-[3px] border-black bg-neo-cream font-neo-display text-sm font-bold text-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan lg:h-14 lg:w-auto lg:ps-4 lg:pe-5 lg:text-lg"
      >
        <Pencil className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" strokeWidth={3} aria-hidden="true" />
        <span className="sr-only lg:not-sr-only">{label}</span>
      </button>
      <AvatarBuilderModal
        isOpen={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        initialConfig={config ?? undefined}
        premium={premium}
      />
    </>
  );
}
