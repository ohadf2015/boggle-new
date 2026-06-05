'use client';

import React, { useState, useCallback } from 'react';
import Image from 'next/image';
import { Send, Gift, Sparkles, Coins, Award, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/Loader';
import toast from 'react-hot-toast';

import { PlayerSelector } from './PlayerSelector';
import { GiftTemplateSelector } from './GiftTemplateSelector';
import { RewardAmountInput } from './RewardAmountInput';
import { BadgeSelector } from './BadgeSelector';
import {
  MAX_MESSAGE_LENGTH,
  MAX_TITLE_LENGTH,
  type GiftRecipient,
  type GiftTemplateType,
  type GiftTemplate,
  type GiftFormData,
  type BadgeOption,
} from './types';

interface PlayerGiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string;
  /** Pre-select a single recipient (e.g. from a player card's Gift button). */
  initialRecipient?: GiftRecipient;
  /** Pre-select many recipients at once (bulk gift from the players list). */
  initialRecipients?: GiftRecipient[];
  onSuccess?: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function PlayerGiftDialog({
  open,
  onOpenChange,
  authToken,
  initialRecipient,
  initialRecipients,
  onSuccess,
}: PlayerGiftDialogProps) {
  const [sending, setSending] = useState(false);
  const [badgeOpen, setBadgeOpen] = useState(false);

  const [selectedPlayers, setSelectedPlayers] = useState<GiftRecipient[]>([]);
  const [templateType, setTemplateType] = useState<GiftTemplateType>('top_player');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [xpAmount, setXpAmount] = useState(0);
  const [coinAmount, setCoinAmount] = useState(0);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeOption | null>(null);

  const handleTemplateSelect = useCallback((template: GiftTemplate) => {
    setTemplateType(template.id);
    if (template.id !== 'custom') {
      setTitle(template.defaultTitle);
      setMessage(template.defaultMessage);
      setXpAmount(template.suggestedXp);
      setCoinAmount(template.suggestedCoins);
    }
  }, []);

  const reset = () => {
    setSelectedPlayers([]);
    setTemplateType('top_player');
    setTitle('');
    setMessage('');
    setXpAmount(0);
    setCoinAmount(0);
    setSelectedBadgeId(null);
    setSelectedBadge(null);
    setBadgeOpen(false);
  };

  const canSend =
    selectedPlayers.length > 0 &&
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    !sending;

  const handleSend = async () => {
    if (!canSend) return;
    try {
      setSending(true);
      const formData: GiftFormData = {
        recipientIds: selectedPlayers.map(p => p.id),
        title: title.trim(),
        message: message.trim(),
        templateType,
        xpAmount,
        coinAmount,
        badgeId: selectedBadgeId || undefined,
      };

      const response = await fetch('/api/admin/gift/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send gift');
      }

      const result = await response.json();
      toast.success(`Gift sent to ${result.sentCount} player(s)!`);
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Send Gift Message
          </DialogTitle>
          <DialogDescription>
            Fill out any sections — a template fills most of it for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <Section title="Recipients">
            <PlayerSelector
              authToken={authToken}
              selectedPlayers={selectedPlayers}
              onSelectionChange={setSelectedPlayers}
              initialRecipient={initialRecipient}
              initialRecipients={initialRecipients}
            />
          </Section>

          <Section title="Template (fills title, message, rewards)">
            <GiftTemplateSelector
              selectedTemplate={templateType}
              onSelect={handleTemplateSelect}
            />
          </Section>

          <Section title="Message">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
              placeholder="Title..."
              className="bg-white dark:bg-neo-navy-light"
            />
            <div className="flex justify-end">
              <span className="text-xs text-slate-500">{title.length}/{MAX_TITLE_LENGTH}</span>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
              placeholder="Message to player(s)..."
              rows={4}
              className="bg-white dark:bg-neo-navy-light resize-none"
            />
            <div className="flex justify-end">
              <span className="text-xs text-slate-500">{message.length}/{MAX_MESSAGE_LENGTH}</span>
            </div>
          </Section>

          <Section title="Rewards">
            <RewardAmountInput
              xpAmount={xpAmount}
              coinAmount={coinAmount}
              onXpChange={setXpAmount}
              onCoinChange={setCoinAmount}
            />
          </Section>

          <section className="space-y-2">
            <button
              type="button"
              onClick={() => setBadgeOpen(v => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <span className="flex items-center gap-2">
                <Award className="w-3.5 h-3.5" />
                Badge (optional)
                {selectedBadge && (
                  <span className="ms-2 normal-case text-cyan-600 dark:text-cyan-400">
                    · {selectedBadge.name_key.split('.').pop()?.replace(/_/g, ' ')}
                  </span>
                )}
              </span>
              {badgeOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {badgeOpen && (
              <BadgeSelector
                authToken={authToken}
                selectedBadgeId={selectedBadgeId}
                onSelect={(badgeId, badge) => {
                  setSelectedBadgeId(badgeId);
                  setSelectedBadge(badge || null);
                }}
              />
            )}
          </section>
        </div>

        <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-1 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-neo-navy">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><strong>{selectedPlayers.length}</strong> recipient(s)</span>
              {xpAmount > 0 && (
                <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-3.5 h-3.5" />{xpAmount.toLocaleString()} XP
                </span>
              )}
              {coinAmount > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Coins className="w-3.5 h-3.5" />{coinAmount.toLocaleString()}
                </span>
              )}
              {selectedBadge && (
                <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                  {selectedBadge.image_url ? (
                    <Image
                      src={selectedBadge.image_url}
                      alt=""
                      width={14}
                      height={14}
                      className="object-contain"
                    />
                  ) : (
                    <Award className="w-3.5 h-3.5" />
                  )}
                  {selectedBadge.name_key.split('.').pop()?.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <Button
              onClick={handleSend}
              disabled={!canSend}
              className="bg-neo-lime text-black hover:bg-neo-lime/90 shadow-hard-sm"
            >
              {sending ? (
                <Loader size="sm" />
              ) : (
                <>
                  <Send className="w-4 h-4 me-1" />
                  Send Gift
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
