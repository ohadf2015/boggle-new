'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronsUpDown, Crown, DoorOpen, HelpCircle, LogOut, Sparkles, UserRound } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TeacherWhatsNewDialog } from '@/components/teacher/TeacherWhatsNew';
import AvatarLite from '@/components/AvatarLite';

export interface TeacherAccountMenuProps {
  proHref: string;
  profileHref: string;
  /** `row` = sidebar footer (avatar + name); `icon` = phone top bar (avatar only). */
  variant?: 'row' | 'icon';
}

const ITEM = 'min-h-[44px] font-neo-body font-semibold text-neo-cream';

export function TeacherAccountMenu({ proHref, profileHref, variant = 'row' }: TeacherAccountMenuProps) {
  const { t, language } = useLanguage();
  const { profile, user } = useAuth();
  const router = useRouter();
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  const name = profile?.display_name ?? '';

  const handleSignOut = useCallback(async () => {
    await signOut();
    router.push(`/${language}/education`);
  }, [router, language]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          data-testid="teacher-account-trigger"
          aria-label={t('eduShell.account.menuLabel')}
          className={cn(
            'flex items-center gap-2.5 rounded-neo text-start transition-[colors,transform] duration-150 active:scale-[0.97]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy',
            variant === 'row' ? 'min-h-[48px] w-full px-2 py-1.5 hover:bg-neo-navy-light' : 'size-11 justify-center',
          )}
        >
          <AvatarLite
            userId={user?.id}
            customAvatar={profile?.avatar_config}
            pixelSize={36}
          />
          {variant === 'row' ? (
            <>
              <span dir="auto" className="min-w-0 flex-1 truncate font-neo-body text-sm font-bold text-neo-cream">
                {name || t('eduShell.account.fallbackName')}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 text-neo-cream/70" aria-hidden="true" />
            </>
          ) : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          side={variant === 'row' ? 'top' : 'bottom'}
          className="w-64 rounded-neo border-[3px] border-neo-cream bg-neo-navy-light p-1 shadow-hard"
        >
          <DropdownMenuItem asChild className={ITEM}>
            <Link href={profileHref}>
              <UserRound className="size-4" aria-hidden="true" />
              {t('eduShell.account.profile')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={cn(ITEM, 'lg:hidden')}>
            <Link href={proHref}>
              <Crown className="size-4" aria-hidden="true" />
              {t('eduShell.account.plans')}
              <span data-testid="teacher-account-pro-badge" className="ms-auto rounded-neo bg-neo-yellow px-1.5 py-px text-[11px] font-black text-neo-black">
                {t('eduShell.nav.pro')}
              </span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={ITEM}>
            <Link href={`/${language}/education/help`}>
              <HelpCircle className="size-4" aria-hidden="true" />
              {t('eduShell.account.help')}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM} onSelect={() => setWhatsNewOpen(true)}>
            <Sparkles className="size-4" aria-hidden="true" />
            {t('eduShell.account.whatsNew')}
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-neo-cream/15" />
          <DropdownMenuItem className={ITEM} onSelect={() => void handleSignOut()}>
            <LogOut className="size-4" aria-hidden="true" />
            {t('auth.signOut')}
          </DropdownMenuItem>
          <DropdownMenuItem asChild className={cn(ITEM, 'text-neo-cream/75')}>
            <Link href={`/${language}`}>
              <DoorOpen className="size-4" aria-hidden="true" />
              {t('education.header.exitEducation')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <TeacherWhatsNewDialog open={whatsNewOpen} onOpenChange={setWhatsNewOpen} />
    </>
  );
}

export default TeacherAccountMenu;
