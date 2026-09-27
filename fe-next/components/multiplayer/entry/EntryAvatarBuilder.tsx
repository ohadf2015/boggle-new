'use client';

import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { useAvatarPremium } from '@/hooks/useAvatarPremium';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

/**
 * The avatar builder behind the entry identity's avatar tap. Its own module so
 * the builder and the premium/coins hooks load only when a player opens it.
 * Guests get free parts only (`premium=null`).
 */
export default function EntryAvatarBuilder({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  isAuthenticated,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CustomAvatarConfig) => void;
  initialConfig: CustomAvatarConfig;
  isAuthenticated: boolean;
}) {
  const premium = useAvatarPremium();
  return (
    <AvatarBuilderModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={(config) => {
        onSave(config);
        onClose();
      }}
      initialConfig={initialConfig}
      premium={isAuthenticated ? premium : null}
    />
  );
}
