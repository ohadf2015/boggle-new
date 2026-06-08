'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Ban, Trash2, ShieldOff, User, UserRound, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import { Loader } from '@/components/ui/Loader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';

type BlockType = 'auth_user' | 'guest_session' | 'ip';

interface BlockRow {
  id: string;
  block_type: BlockType;
  value: string;
  reason: string | null;
  blocked_by: string | null;
  created_at: string;
  expires_at: string | null;
}

const DURATIONS: { key: string; ms: number | null }[] = [
  { key: 'permanent', ms: null },
  { key: '1h', ms: 60 * 60 * 1000 },
  { key: '24h', ms: 24 * 60 * 60 * 1000 },
  { key: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '30d', ms: 30 * 24 * 60 * 60 * 1000 },
];

const TYPE_META: Record<BlockType, { icon: React.ReactNode; labelKey: string }> = {
  auth_user: { icon: <User className="w-3.5 h-3.5" />, labelKey: 'admin.blocklist.type.authUser' },
  guest_session: { icon: <UserRound className="w-3.5 h-3.5" />, labelKey: 'admin.blocklist.type.guest' },
  ip: { icon: <Globe className="w-3.5 h-3.5" />, labelKey: 'admin.blocklist.type.ip' },
};

export function BlockListManager({ authToken }: { authToken: string }) {
  const { t } = useLanguage();
  const [blocks, setBlocks] = useState<BlockRow[] | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const [blockType, setBlockType] = useState<BlockType>('auth_user');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState<string>('permanent');

  const authHeaders = useCallback(
    (json = false): Record<string, string> => ({
      Authorization: `Bearer ${authToken}`,
      ...(json ? { 'Content-Type': 'application/json' } : {}),
    }),
    [authToken],
  );

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/blocks?activeOnly=true', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load blocks');
      const json = await res.json();
      setBlocks(json.blocks ?? []);
    } catch {
      setBlocks([]);
    }
  }, [authHeaders]);

  useEffect(() => { fetchBlocks(); }, [fetchBlocks]);

  const handleCreate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const ms = DURATIONS.find((d) => d.key === duration)?.ms ?? null;
      const res = await fetch('/api/admin/blocks', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          blockType,
          value: trimmed,
          reason: reason.trim() || undefined,
          durationMs: ms ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || `Failed (HTTP ${res.status})`);
      }
      toast.success(t('admin.blocklist.blockedToast'));
      setValue('');
      setReason('');
      fetchBlocks();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to block');
    } finally {
      setSubmitting(false);
    }
  }, [authHeaders, blockType, value, reason, duration, submitting, fetchBlocks, t]);

  const handleRemove = useCallback(async (id: string) => {
    if (removingId) return;
    setRemovingId(id);
    try {
      const res = await fetch(`/api/admin/blocks?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to unblock');
      setBlocks((prev) => prev?.filter((b) => b.id !== id) ?? []);
      toast.success(t('admin.blocklist.unblockedToast'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to unblock');
    } finally {
      setRemovingId(null);
    }
  }, [authHeaders, removingId, t]);

  return (
    <div className="space-y-6">
      {/* Create block form */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 uppercase">{t('admin.blocklist.typeLabel')}</label>
              <Select value={blockType} onValueChange={(v) => setBlockType(v as BlockType)}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="auth_user">{t('admin.blocklist.type.authUser')}</SelectItem>
                  <SelectItem value="guest_session">{t('admin.blocklist.type.guest')}</SelectItem>
                  <SelectItem value="ip">{t('admin.blocklist.type.ip')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
              <label className="text-xs text-slate-400 uppercase">{t('admin.blocklist.valueLabel')}</label>
              <Input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={t('admin.blocklist.valuePlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
              <label className="text-xs text-slate-400 uppercase">{t('admin.blocklist.reasonLabel')}</label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('admin.blocklist.reasonPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-400 uppercase">{t('admin.blocklist.durationLabel')}</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATIONS.map((d) => (
                    <SelectItem key={d.key} value={d.key}>{t(`admin.blocklist.duration.${d.key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={submitting || !value.trim()} className="bg-red-600 hover:bg-red-700 text-white">
              <Ban className="w-4 h-4 me-1" />
              {t('admin.blocklist.blockButton')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active blocks list */}
      {blocks === null ? (
        <div className="flex justify-center py-12"><Loader size="md" /></div>
      ) : blocks.length === 0 ? (
        <div className="text-center py-12 text-slate-500 flex flex-col items-center gap-2">
          <ShieldOff className="w-8 h-8 opacity-50" />
          {t('admin.blocklist.empty')}
        </div>
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => {
            const meta = TYPE_META[b.block_type];
            return (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-slate-600/30 text-slate-300">
                        {meta.icon}
                        {t(meta.labelKey)}
                      </span>
                      <span className="font-mono font-bold truncate">{b.value}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                      {b.reason && <span>{b.reason}</span>}
                      <span>{t('admin.blocklist.addedOn')} {new Date(b.created_at).toLocaleDateString()}</span>
                      <span>
                        {b.expires_at
                          ? `${t('admin.blocklist.expires')} ${new Date(b.expires_at).toLocaleString()}`
                          : t('admin.blocklist.duration.permanent')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(b.id)}
                    disabled={removingId === b.id}
                    className="text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 me-1" />
                    {t('admin.blocklist.unblockButton')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
