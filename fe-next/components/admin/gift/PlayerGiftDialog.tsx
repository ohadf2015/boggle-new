'use client';

import React, { useState, useCallback } from 'react';
import { Send, ArrowLeft, ArrowRight, Gift, Sparkles, Coins } from 'lucide-react';
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
import { NeoLoader } from '@/components/ui/NeoLoader';
import toast from 'react-hot-toast';

import { PlayerSelector } from './PlayerSelector';
import { GiftTemplateSelector } from './GiftTemplateSelector';
import { RewardAmountInput } from './RewardAmountInput';
import {
  GIFT_TEMPLATES,
  MAX_MESSAGE_LENGTH,
  MAX_TITLE_LENGTH,
  type GiftRecipient,
  type GiftTemplateType,
  type GiftTemplate,
  type GiftFormData,
} from './types';

interface PlayerGiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string;
  initialPlayerId?: string;
  onSuccess?: () => void;
}

type Step = 'players' | 'template' | 'message' | 'rewards' | 'preview';

const STEPS: Step[] = ['players', 'template', 'message', 'rewards', 'preview'];

export function PlayerGiftDialog({
  open,
  onOpenChange,
  authToken,
  initialPlayerId,
  onSuccess,
}: PlayerGiftDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>('players');
  const [sending, setSending] = useState(false);

  // Form state
  const [selectedPlayers, setSelectedPlayers] = useState<GiftRecipient[]>([]);
  const [templateType, setTemplateType] = useState<GiftTemplateType>('top_player');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [xpAmount, setXpAmount] = useState(0);
  const [coinAmount, setCoinAmount] = useState(0);

  const currentStepIndex = STEPS.indexOf(currentStep);

  const handleTemplateSelect = useCallback((template: GiftTemplate) => {
    setTemplateType(template.id);
    if (template.id !== 'custom') {
      setTitle(template.defaultTitle);
      setMessage(template.defaultMessage);
      setXpAmount(template.suggestedXp);
      setCoinAmount(template.suggestedCoins);
    }
  }, []);

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  };

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'players':
        return selectedPlayers.length > 0;
      case 'template':
        return true;
      case 'message':
        return title.trim().length > 0 && message.trim().length > 0;
      case 'rewards':
        return xpAmount >= 0 && coinAmount >= 0;
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  const handleSend = async () => {
    if (!canProceed()) return;

    try {
      setSending(true);

      const formData: GiftFormData = {
        recipientIds: selectedPlayers.map(p => p.id),
        title: title.trim(),
        message: message.trim(),
        templateType,
        xpAmount,
        coinAmount,
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

      // Reset form
      setSelectedPlayers([]);
      setTemplateType('top_player');
      setTitle('');
      setMessage('');
      setXpAmount(0);
      setCoinAmount(0);
      setCurrentStep('players');

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error sending gift:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send gift');
    } finally {
      setSending(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'players':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Search and select players to send a gift message to.
            </p>
            <PlayerSelector
              authToken={authToken}
              selectedPlayers={selectedPlayers}
              onSelectionChange={setSelectedPlayers}
              initialPlayerId={initialPlayerId}
            />
          </div>
        );

      case 'template':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Choose a message template or create a custom one.
            </p>
            <GiftTemplateSelector
              selectedTemplate={templateType}
              onSelect={handleTemplateSelect}
            />
          </div>
        );

      case 'message':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                placeholder="Enter gift message title..."
                className="bg-white dark:bg-slate-800"
              />
              <p className="text-xs text-slate-500">{title.length}/{MAX_TITLE_LENGTH}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE_LENGTH))}
                placeholder="Write your message to the player(s)..."
                rows={5}
                className="bg-white dark:bg-slate-800 resize-none"
              />
              <p className="text-xs text-slate-500">{message.length}/{MAX_MESSAGE_LENGTH}</p>
            </div>
          </div>
        );

      case 'rewards':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Set the XP and coin rewards for this gift.
            </p>
            <RewardAmountInput
              xpAmount={xpAmount}
              coinAmount={coinAmount}
              onXpChange={setXpAmount}
              onCoinChange={setCoinAmount}
            />
          </div>
        );

      case 'preview':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-purple-50 dark:from-amber-900/20 dark:to-purple-900/20 rounded-lg border-2 border-amber-200 dark:border-amber-800">
              {/* Preview Header */}
              <div className="text-center mb-4">
                <Gift className="w-12 h-12 text-amber-500 mx-auto mb-2" />
                <div className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                  {GIFT_TEMPLATES.find(t => t.id === templateType)?.headerLine}
                </div>
              </div>

              {/* Preview Content */}
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 shadow-sm">
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                  {message}
                </p>

                {/* Rewards */}
                {(xpAmount > 0 || coinAmount > 0) && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-xs text-slate-500 mb-2">Rewards:</p>
                    <div className="flex gap-4">
                      {xpAmount > 0 && (
                        <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                          <Sparkles className="w-4 h-4" />
                          <span className="font-bold">{xpAmount.toLocaleString()}</span>
                          <span className="text-xs">XP</span>
                        </div>
                      )}
                      {coinAmount > 0 && (
                        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                          <Coins className="w-4 h-4" />
                          <span className="font-bold">{coinAmount.toLocaleString()}</span>
                          <span className="text-xs">Coins</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Recipients Summary */}
              <div className="mt-4 text-center text-sm text-slate-600 dark:text-slate-400">
                Sending to <strong>{selectedPlayers.length}</strong> player(s)
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'players':
        return 'Select Players';
      case 'template':
        return 'Choose Template';
      case 'message':
        return 'Write Message';
      case 'rewards':
        return 'Set Rewards';
      case 'preview':
        return 'Preview & Send';
      default:
        return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-amber-500" />
            Send Gift Message
          </DialogTitle>
          <DialogDescription>
            Step {currentStepIndex + 1} of {STEPS.length}: {getStepTitle()}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex gap-1 mb-4">
          {STEPS.map((step, index) => (
            <div
              key={step}
              className={`flex-1 h-1.5 rounded-full transition-colors ${
                index <= currentStepIndex
                  ? 'bg-neo-lime'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[200px]">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStepIndex === 0 || sending}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>

          {currentStep === 'preview' ? (
            <Button
              onClick={handleSend}
              disabled={!canProceed() || sending}
              className="bg-neo-lime text-black hover:bg-neo-lime/90 shadow-hard-sm"
            >
              {sending ? (
                <NeoLoader variant="dots" size="sm" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-1" />
                  Send Gift
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-neo-lime text-black hover:bg-neo-lime/90"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
