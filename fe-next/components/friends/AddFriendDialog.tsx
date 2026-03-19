'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, UserPlus, Link } from 'lucide-react';
import { Loader } from '@/components/ui/Loader';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
  isDark,
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
      <DialogContent
        noDescription
        className={cn('max-w-md', isDark ? 'bg-slate-800 text-white' : 'bg-white text-gray-900')}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            {t('friends.addFriend')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto p-4">
          {/* Copy invite link */}
          {profile?.username && (
            <button
              onClick={handleCopyInviteLink}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2 rounded-neo border-2 border-neo-black shadow-hard-sm font-bold text-sm transition-colors',
                linkCopied
                  ? 'bg-neo-lime text-neo-black'
                  : isDark
                    ? 'bg-slate-700 text-white hover:bg-slate-600'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
              )}
            >
              <Link className="w-4 h-4" />
              {linkCopied ? t('friends.linkCopied') : t('friends.copyInviteLink')}
            </button>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4',
              isDark ? 'text-gray-400' : 'text-gray-500'
            )} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('friends.searchByUsername')}
              className={cn(
                'w-full ps-10 pe-4 py-2 rounded-neo border-2 font-medium',
                isDark
                  ? 'bg-slate-700 border-white/10 text-white placeholder:text-gray-400'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder:text-gray-500'
              )}
            />
            {isSearching && (
              <Loader size="sm" className="absolute right-3 top-1/2 -translate-y-1/2" />
            )}
          </div>

          {/* Search results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {searchResults.map(searchUser => (
              <div
                key={searchUser.id}
                className={cn(
                  'flex items-center justify-between p-3 rounded-neo border-2',
                  isDark ? 'bg-slate-700/50 border-white/10' : 'bg-gray-50 border-gray-200'
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar avatarImage={searchUser.avatarImage} customAvatar={searchUser.customAvatar} size="md" />
                  <div>
                    <p className={cn('font-bold', isDark ? 'text-white' : 'text-gray-900')}>
                      {searchUser.displayName || searchUser.username}
                    </p>
                    <p className={cn('text-xs', isDark ? 'text-gray-400' : 'text-gray-500')}>
                      @{searchUser.username}
                    </p>
                  </div>
                </div>

                {searchUser.status === 'accepted' ? (
                  <span className={cn(
                    'text-xs font-bold px-2 py-1 rounded',
                    isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-600'
                  )}>
                    {t('friends.friend')}
                  </span>
                ) : searchUser.status === 'pending' ? (
                  <span className={cn(
                    'text-xs font-bold px-2 py-1 rounded',
                    isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-600'
                  )}>
                    {t('friends.pending')}
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(searchUser.odUserId)}
                    disabled={actionLoading === searchUser.odUserId}
                    className={cn(
                      'px-3 py-1 rounded-neo border-2 border-neo-black shadow-hard-sm',
                      'bg-neo-lime text-neo-black font-bold text-sm'
                    )}
                  >
                    {actionLoading === searchUser.odUserId ? (
                      <Loader size="sm" />
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 me-1" />
                        {t('friends.add')}
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}

            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className={cn('text-center py-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {t('friends.noUsersFound')}
              </p>
            )}

            {searchQuery.length < 2 && (
              <p className={cn('text-center py-4 text-sm', isDark ? 'text-gray-400' : 'text-gray-500')}>
                {t('friends.typeAtLeast2Chars')}
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
