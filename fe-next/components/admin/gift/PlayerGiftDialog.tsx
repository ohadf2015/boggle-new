'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { Send, Gift, Sparkles, Award, ChevronDown, ChevronUp } from 'lucide-react';
import { Coins } from '@/components/ui/CoinsIcon';
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
  GIFT_TEMPLATES,
} from './types';

const DEFAULT_TEMPLATE = GIFT_TEMPLATES[0];

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
  // The preselected template fills the form, so what looks chosen is what gets sent.
  const [templateType, setTemplateType] = useState<GiftTemplateType>(DEFAULT_TEMPLATE.id);
  const [title, setTitle] = useState(DEFAULT_TEMPLATE.defaultTitle);
  const [message, setMessage] = useState(DEFAULT_TEMPLATE.defaultMessage);
  const [xpAmount, setXpAmount] = useState(DEFAULT_TEMPLATE.suggestedXp);
  const [coinAmount, setCoinAmount] = useState(DEFAULT_TEMPLATE.suggestedCoins);
  const [selectedBadgeId, setSelectedBadgeId] = useState<string | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeOption | null>(null);

  const handleTemplateSelect = useCallback((template: GiftTemplate) => {
    setTemplateType(template.id);
    setTitle(template.defaultTitle);
    setMessage(template.defaultMessage);
    setXpAmount(template.suggestedXp);
    setCoinAmount(template.suggestedCoins);
  }, []);

  const reset = useCallback(() => {
    setSelectedPlayers([]);
    setTemplateType(DEFAULT_TEMPLATE.id);
    setTitle(DEFAULT_TEMPLATE.defaultTitle);
    setMessage(DEFAULT_TEMPLATE.defaultMessage);
    setXpAmount(DEFAULT_TEMPLATE.suggestedXp);
    setCoinAmount(DEFAULT_TEMPLATE.suggestedCoins);
    setSelectedBadgeId(null);
    setSelectedBadge(null);
    setBadgeOpen(false);
  }, []);

  // Every open starts clean: a dialog closed without sending must not carry the old recipients
  // or edits into the next player's gift.
  useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  const canSend =
    selectedPlayers.length > 0 &&
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    !sending;

  const disabledReason = sending
    ? null
    : selectedPlayers.length === 0
      ? 'Add a recipient to send'
      : !title.trim() || !message.trim()
        ? 'Add a title and message to send'
        : null;

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
            Pick a template to fill the message and rewards, then adjust.
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

          <Section title="Template">
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
              {disabledReason && <span role="status" className="text-amber-600 dark:text-amber-400">{disabledReason}</span>}
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
