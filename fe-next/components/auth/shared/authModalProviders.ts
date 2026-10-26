import type React from 'react';
import { GoogleIcon, DiscordIcon, MicrosoftIcon } from './icons/BrandIcons';

export type AuthModalProviderId = 'google' | 'discord' | 'microsoft';

export interface AuthModalProvider {
  id: AuthModalProviderId;
  icon: React.FC<{ className?: string }>;
  label: string;
  className: string;
}

export function isMicrosoftSsoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_MICROSOFT_SSO_ENABLED === 'true';
}

const RAISED = 'shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed';

const GOOGLE: AuthModalProvider = {
  id: 'google',
  icon: GoogleIcon,
  label: 'Google',
  className: `bg-white text-gray-800 border-3 border-neo-black hover:bg-gray-50 ${RAISED}`,
};

const DISCORD: AuthModalProvider = {
  id: 'discord',
  icon: DiscordIcon,
  label: 'Discord',
  className: `bg-brand-discord text-white border-3 border-neo-black hover:bg-brand-discord-hover ${RAISED}`,
};

const MICROSOFT: AuthModalProvider = {
  id: 'microsoft',
  icon: MicrosoftIcon,
  label: 'Microsoft',
  className: 'bg-transparent text-neo-cream border-3 border-neo-cream/60 hover:border-neo-cream hover:bg-neo-cream/10',
};

/** Discord needs a browser hop out of the native app; teachers sign in with a school account or email. */
export function authModalProviders({ native, teacher }: { native: boolean; teacher: boolean }): AuthModalProvider[] {
  if (native) return [GOOGLE];
  if (teacher) return isMicrosoftSsoEnabled() ? [GOOGLE, MICROSOFT] : [GOOGLE];
  return [GOOGLE, DISCORD];
}
