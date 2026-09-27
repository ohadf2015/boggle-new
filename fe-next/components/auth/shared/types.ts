import type { LucideIcon } from 'lucide-react';

/**
 * Shared types for auth modal components
 */

export interface OAuthProvider {
  id: 'google' | 'discord';
  icon: React.FC<{ className?: string }>;
  label: string;
  color: string;
}

export interface AuthBenefit {
  icon: LucideIcon;
  translationKey: string;
}

export interface AuthModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
}

export type AuthMode = 'signin' | 'signup';
