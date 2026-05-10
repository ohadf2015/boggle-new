'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Link, Check } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import Avatar from '@/components/Avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Friend } from '@/utils/friends';

interface AddFriendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDark: boolean;
  t: (key: string) => string;
  search: (query: string) => Promise<Friend[]>;
  sendRequest: (userId: string) => Promise<{ success: boolean; error?: string } | void>;
}

export function AddFriendDialog({
  open,
  onOpenChange,
  isDark: _isDark,
  t,
  search,
  sendRequest,
}: AddFriendDialogProps): React.JSX.Element {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Friend[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyInviteLink = useCallback(async () => {
    if (!profile?.username) return;
    const link = `${window.location.origin}/${language}/friends?ref=${profile.username}`;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = link;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  }, [profile, language]);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      const results = await search(searchQuery);
      setSearchResults(results);
      setIsSearching(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, search]);

  const handleSendRequest = useCallback(async (userId: string) => {
    setActionLoading(userId);
    await sendRequest(userId);
    setActionLoading(null);
    setSearchQuery('');
    setSearchResults([]);
  }, [sendRequest]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent noDescription closeButtonLabel={t('common.close')} className="max-w-md">
        <DialogHeader variant="cyan">
          <DialogTitle className="flex items-center justify-center gap-2">
            <UserPlus className="w-6 h-6" aria-hidden="true" />
            {t('friends.addFriend')}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="space-y-5">
          {/* Copy invite link — primary CTA, refined neo styling */}
          {profile?.username && (
            <button
              onClick={handleCopyInviteLink}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-3 px-4',
                'rounded-neo border-3 border-neo-black font-black uppercase tracking-wide text-sm',
                'transition-all duration-100',
                linkCopied
                  ? 'bg-neo-lime text-neo-black shadow-hard-pressed translate-x-px translate-y-px'
                  : 'bg-neo-yellow text-neo-black shadow-hard hover:shadow-hard-lg hover:-translate-y-0.5'
              )}
              style={!linkCopied ? { backgroundImage: 'var(--halftone-pattern)' } : undefined}
            >
              {linkCopied ? (
                <>
                  <Check className="w-4 h-4 stroke-3" aria-hidden="true" />
                  {t('friends.linkCopied')}
                </>
              ) : (
                <>
                  <Link className="w-4 h-4 stroke-3" aria-hidden="true" />
                  {t('friends.copyInviteLink')}
                </>
              )}
            </button>
          )}

          {/* Search input — neo input */}
          <div className="relative">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-current/60 stroke-3"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('friends.searchByUsername')}
              className={cn(
                'w-full ps-11 pe-10 py-2.5 rounded-neo border-3 border-neo-black',
                'font-bold text-sm',
                'bg-neo-cream dark:bg-neo-navy-light text-neo-black dark:text-neo-white',
                'shadow-hard-sm focus:shadow-hard focus:outline-none',
                'placeholder:text-current/50'
              )}
            />
            {isSearching && (
              <Loader size="sm" className="absolute end-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Search results */}
          <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
            {searchResults.map((searchUser) => (
              <div
                key={searchUser.id}
                className={cn(
                  'flex items-center justify-between gap-3 p-3 rounded-neo border-2 border-neo-black',
                  'bg-neo-cream/80 dark:bg-neo-navy-light shadow-hard-sm'
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar
                    avatarImage={searchUser.avatarImage}
                    customAvatar={searchUser.customAvatar}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-black truncate text-neo-black dark:text-neo-white">
                      {searchUser.displayName || searchUser.username}
                    </p>
                    <p className="text-xs font-bold text-current/60 truncate">
                      @{searchUser.username}
                    </p>
                  </div>
                </div>

                {searchUser.status === 'accepted' ? (
                  <span className="text-xs font-black uppercase tracking-wide px-2 py-1 rounded-neo border-2 border-neo-black bg-neo-lime text-neo-black shrink-0">
                    {t('friends.friend')}
                  </span>
                ) : searchUser.status === 'pending' ? (
                  <span className="text-xs font-black uppercase tracking-wide px-2 py-1 rounded-neo border-2 border-neo-black bg-neo-yellow text-neo-black shrink-0">
                    {t('friends.pending')}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(searchUser.odUserId)}
                    disabled={actionLoading === searchUser.odUserId}
                    className={cn(
                      'shrink-0 px-3 py-1.5 rounded-neo border-2 border-neo-black shadow-hard-sm',
                      'bg-neo-lime text-neo-black font-black uppercase tracking-wide text-xs',
                      'hover:shadow-hard hover:-translate-y-0.5 transition-all'
                    )}
                  >
                    {actionLoading === searchUser.odUserId ? (
                      <Loader size="sm" />
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 me-1 stroke-3" aria-hidden="true" />
                        {t('friends.add')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-center py-6 text-sm font-bold text-current/60">
                {t('friends.noUsersFound')}
              </p>
            )}

            {searchQuery.length < 2 && (
              <p className="text-center py-6 text-sm font-bold text-current/60">
                {t('friends.typeAtLeast2Chars')}
              </p>
            )}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
