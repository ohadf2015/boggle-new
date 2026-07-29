'use client';

import { useEffect, useState, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import {
  Home, Swords, ScrollText, Users, User, Settings, Trophy,
  Gamepad2, BookOpen, ShieldCheck, Globe, Zap,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  href: string;
  group: string;
}

const NAV_ITEMS: CommandItem[] = [
  { id: 'home', labelKey: 'nav.home', icon: Home, href: '/', group: 'navigation' },
  { id: 'multiplayer', labelKey: 'nav.play', icon: Swords, href: '/multiplayer', group: 'navigation' },
  { id: 'singleplayer', labelKey: 'nav.singleplayer', icon: Gamepad2, href: '/singleplayer', group: 'navigation' },
  { id: 'daily', labelKey: 'nav.daily', icon: Zap, href: '/daily', group: 'navigation' },
  { id: 'adventure', labelKey: 'nav.adventure', icon: Globe, href: '/adventure', group: 'navigation' },
  { id: 'quests', labelKey: 'nav.quests', icon: ScrollText, href: '/quests', group: 'navigation' },
  { id: 'friends', labelKey: 'nav.friends', icon: Users, href: '/friends', group: 'navigation' },
  { id: 'profile', labelKey: 'nav.profile', icon: User, href: '/profile', group: 'account' },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings, href: '/settings', group: 'account' },
  { id: 'leaderboard', labelKey: 'nav.leaderboard', icon: Trophy, href: '/leaderboard', group: 'navigation' },
  { id: 'glossary', labelKey: 'nav.glossary', icon: BookOpen, href: '/glossary', group: 'navigation' },
  { id: 'admin', labelKey: 'nav.admin', icon: ShieldCheck, href: '/admin', group: 'admin' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { t, language } = useLanguage();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(`/${language}${href}`);
    },
    [router, language],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neo-black/60 backdrop-blur-xs"
        onClick={() => setOpen(false)}
      />

      {/* Command dialog */}
      <div className="absolute left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <Command
          className={cn(
            'rounded-neo border-4 border-neo-black bg-neo-cream shadow-hard-lg overflow-hidden',
            'font-neo-body text-neo-black',
          )}
          label={t('common.search')}
        >
          <Command.Input
            placeholder={t('common.searchPlaceholder') || 'Search...'}
            className="w-full border-b-4 border-neo-black bg-neo-white px-4 py-3 text-base font-bold outline-hidden placeholder:text-neo-black/40"
          />
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-neo-black/50">
              {t('common.noResults') || 'No results found.'}
            </Command.Empty>

            <Command.Group
              heading={t('common.navigation') || 'Navigation'}
              className="mb-1 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-black **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:text-neo-black/50"
            >
              {NAV_ITEMS.filter((i) => i.group === 'navigation').map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.id} ${t(item.labelKey)}`}
                  onSelect={() => handleSelect(item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors data-[selected=true]:bg-neo-lime data-[selected=true]:text-neo-black"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.labelKey)}
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group
              heading={t('common.account') || 'Account'}
              className="mb-1 **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-black **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:text-neo-black/50"
            >
              {NAV_ITEMS.filter((i) => i.group === 'account').map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.id} ${t(item.labelKey)}`}
                  onSelect={() => handleSelect(item.href)}
                  className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors data-[selected=true]:bg-neo-lime data-[selected=true]:text-neo-black"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {t(item.labelKey)}
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="border-t-2 border-neo-black/10 px-4 py-2 text-xs text-neo-black/40">
            <kbd className="rounded border border-neo-black/20 px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>
            {' '}{t('common.toClose') || 'to close'}
          </div>
        </Command>
      </div>
    </div>
  );
}

export default CommandPalette;
