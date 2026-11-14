'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';
import { AdminBadge } from '@/components/admin/sidebar/AdminBadge';

const POLL_MS = 60_000;

interface Notice {
  id: string;
  kind: string;
  severity: 'normal' | 'high';
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

function timeAgo(iso: string, language: string, now = Date.now()): string {
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  const rtf = new Intl.RelativeTimeFormat(language, { numeric: 'auto', style: 'short' });
  if (minutes < 60) return rtf.format(-Math.max(minutes, 0), 'minute');
  if (minutes < 1440) return rtf.format(-Math.round(minutes / 60), 'hour');
  return rtf.format(-Math.round(minutes / 1440), 'day');
}

/**
 * Floating admin-only bell on every /admin page (the shell only mounts for admins and the
 * API re-checks). Polls while the tab is visible; the table is deliberately not realtime.
 * Opening it marks everything shown as seen for this admin; new dots stay until the next poll.
 */
export function AdminNotificationBell() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<Notice[]>([]);
  const [unread, setUnread] = useState(0);
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth('/api/admin/notifications');
      if (!res.ok) return;
      const json = (await res.json()) as { items: Notice[]; unread: number; available: boolean };
      setItems(json.items);
      setUnread(json.unread);
      setAvailable(json.available);
    } catch {
      /* a missed poll is retried on the next tick */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') void load();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const openItem = (n: Notice) => {
    setOpen(false);
    if (n.link) router.push(`/${language}${n.link}`);
  };

  const toggle = async () => {
    const opening = !open;
    setOpen(opening);
    if (!opening || unread === 0 || items.length === 0) return;
    setUnread(0);
    try {
      const res = await fetchWithAuth('/api/admin/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seenAt: items[0].created_at }),
      });
      if (!res.ok) void load();
    } catch {
      void load();
    }
  };

  if (!available) return null;

  return (
    <div className="fixed bottom-20 end-3 z-40 sm:bottom-6">
      {open && (
        <div
          role="dialog"
          aria-label={t('admin.notifications.title', 'Notifications')}
          className="absolute bottom-14 end-0 w-[min(22rem,calc(100vw-1.5rem))] rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light shadow-hard"
        >
          <div className="flex items-center justify-between gap-2 border-b border-neo-cream/20 p-3">
            <h2 className="text-sm font-bold text-neo-cream">{t('admin.notifications.title', 'Notifications')}</h2>
          </div>
          {items.length === 0 ? (
            <p className="p-4 text-sm text-neo-cream/70">{t('admin.notifications.empty', 'Nothing yet. Interesting events show up here.')}</p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {items.map((n) => (
                <li key={n.id} className="border-b border-neo-cream/10 last:border-b-0">
                  <button type="button" onClick={() => openItem(n)} className="flex w-full items-start gap-2 p-3 text-start hover:bg-neo-cream/5">
                    <span
                      aria-hidden="true"
                      className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read_at ? 'bg-transparent' : n.severity === 'high' ? 'bg-neo-pink' : 'bg-neo-cyan')}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-sm text-neo-cream', !n.read_at && 'font-bold')}>{n.title}</span>
                      {n.body && <span className="block truncate text-xs text-neo-cream/70">{n.body}</span>}
                      <span className="block text-xs text-neo-cream/50">{timeAgo(n.created_at, language)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <button
        type="button"
        aria-label={t('admin.notifications.title', 'Notifications')}
        aria-expanded={open}
        onClick={() => void toggle()}
        className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-neo-cream/40 bg-neo-navy-light text-neo-cream shadow-hard focus-visible:outline-2 focus-visible:outline-neo-cyan"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        <AdminBadge count={unread} className="absolute -top-1 -inset-e-1 min-w-[18px] px-1 text-[11px]" />
      </button>
    </div>
  );
}
