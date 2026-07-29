'use client';

import { useEffect, useRef, useState } from 'react';
import { useOfflineModeFlag } from '@/hooks/useOfflineModeFlag';
import { useLanguage } from '@/contexts/LanguageContext';
import { getOfflineStore } from '@/lib/offline';
import { queueDepth, peekQueue, type QueueRow } from '@/lib/offline/scoreQueue';

function rowStatus(row: QueueRow): 'queued' | 'rejected' {
  return row.attempts > 0 && row.last_error ? 'rejected' : 'queued';
}

function rowScore(row: QueueRow): number | null {
  const p = row.payload as Record<string, unknown>;
  return typeof p?.score === 'number' ? p.score : null;
}

function rowDate(row: QueueRow): string | null {
  const p = row.payload as Record<string, unknown>;
  return typeof p?.puzzleDate === 'string' ? p.puzzleDate : null;
}

interface DrawerProps {
  rows: QueueRow[];
  onClose: () => void;
}

function SyncFeedDrawer({ rows, onClose }: DrawerProps) {
  const { t } = useLanguage();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('offline.queue.title')}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
    >
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-sm mx-auto bg-neo-navy border-neo-thick border-black shadow-hard-lg rounded-t-neo sm:rounded-neo max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-neo-white/10">
          <h2 className="font-neo-display font-bold text-neo-white text-lg">
            {t('offline.queue.title')}
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label={t('offline.queue.close')}
            className="text-neo-white hover:text-neo-white transition-colors p-1"
          >
            ✕
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto divide-y divide-neo-white/10 px-4">
          {rows.map((row) => {
            const status = rowStatus(row);
            const score = rowScore(row);
            const date = rowDate(row);
            return (
              <li key={row.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-neo-body text-neo-white text-sm truncate">
                    {row.mode}
                  </span>
                  {date && (
                    <span className="font-neo-body text-neo-white text-xs">{date}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {score !== null && (
                    <span className="font-neo-display text-neo-cyan text-sm font-bold">
                      {score}
                    </span>
                  )}
                  <span
                    className={`text-xs font-neo-body px-2 py-0.5 rounded-full border ${
                      status === 'rejected'
                        ? 'border-neo-red/40 text-neo-red bg-neo-red/10'
                        : 'border-neo-white/20 text-neo-white bg-neo-white/5'
                    }`}
                  >
                    {t(`offline.queue.status.${status}`)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function PendingSyncBadge(){
  const offlineFlag = useOfflineModeFlag();
  const { t } = useLanguage();
  const [count, setCount] = useState(0);
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!offlineFlag) return;

    let cancelled = false;

    async function refresh() {
      const store = await getOfflineStore();
      const [n, queued] = await Promise.all([queueDepth(store), peekQueue(store)]);
      if (!cancelled) {
        setCount(n);
        setRows(queued);
      }
    }

    refresh().catch(() => {});

    window.addEventListener('online', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('online', refresh);
    };
  }, [offlineFlag]);

  if (!offlineFlag || count === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t('offline.pending.badge', { count })}
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neo-navy-light border border-neo-white/20 text-neo-white text-xs font-neo-body hover:border-neo-white/40 transition-colors cursor-pointer"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neo-yellow animate-pulse" aria-hidden="true" />
        {t('offline.pending.badge', { count })}
      </button>
      {open && (
        <SyncFeedDrawer rows={rows} onClose={() => setOpen(false)} />
      )}
    </>
  );
}
