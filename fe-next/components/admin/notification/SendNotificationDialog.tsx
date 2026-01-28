'use client';

/**
 * SendNotificationDialog Component
 * Multi-step dialog for sending push notifications to players
 */

import { useState, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Send, Users, MessageSquare, Eye } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlayerSelector } from '@/components/admin/gift/PlayerSelector';
import { NotificationTypeSelector } from './NotificationTypeSelector';
import {
  NOTIFICATION_TEMPLATES,
  type NotificationType,
  type NotificationStep,
  type NotificationRecipient,
} from './types';
import type { GiftRecipient } from '@/components/admin/gift/types';

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authToken: string;
  initialPlayerId?: string;
  onSuccess?: () => void;
}

export function SendNotificationDialog({
  open,
  onOpenChange,
  authToken,
  initialPlayerId,
  onSuccess,
}: SendNotificationDialogProps) {
  const { t } = useLanguage();

  // Form state
  const [currentStep, setCurrentStep] = useState<NotificationStep>('players');
  const [selectedPlayers, setSelectedPlayers] = useState<NotificationRecipient[]>([]);
  const [notificationType, setNotificationType] = useState<NotificationType>('system');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [actionUrl, setActionUrl] = useState('');

  // UI state
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Steps configuration
  const steps: { key: NotificationStep; label: string; icon: React.ReactNode }[] = [
    { key: 'players', label: t('notifications.admin.selectPlayers') || 'Select Players', icon: <Users size={16} /> },
    { key: 'type', label: t('notifications.admin.chooseType') || 'Choose Type', icon: <MessageSquare size={16} /> },
    { key: 'message', label: t('notifications.admin.writeMessage') || 'Write Message', icon: <MessageSquare size={16} /> },
    { key: 'preview', label: t('notifications.admin.preview') || 'Preview', icon: <Eye size={16} /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  // Reset form when dialog closes
  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setCurrentStep('players');
      setSelectedPlayers([]);
      setNotificationType('system');
      setTitle('');
      setBody('');
      setActionUrl('');
      setError(null);
    }
    onOpenChange(isOpen);
  }, [onOpenChange]);

  // Apply template defaults when type changes
  const handleTypeChange = (type: NotificationType) => {
    setNotificationType(type);
    const template = NOTIFICATION_TEMPLATES[type];
    if (!title) setTitle(template.defaultTitle);
    if (!body) setBody(template.defaultBody);
  };

  // Check if can proceed to next step
  const canProceed = (): boolean => {
    switch (currentStep) {
      case 'players':
        return selectedPlayers.length > 0;
      case 'type':
        return true;
      case 'message':
        return title.trim().length > 0 && body.trim().length > 0;
      case 'preview':
        return true;
      default:
        return false;
    }
  };

  // Navigation
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  };

  // Send notification
  const handleSend = useCallback(async () => {
    if (selectedPlayers.length === 0 || !title.trim() || !body.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/notification/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          recipientIds: selectedPlayers.map((p) => p.id),
          title: title.trim(),
          body: body.trim(),
          notificationType,
          actionUrl: actionUrl.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send notification');
      }

      const data = await response.json();
      console.log('Notification sent:', data);

      handleOpenChange(false);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  }, [selectedPlayers, title, body, notificationType, actionUrl, authToken, onSuccess, handleOpenChange]);

  // Map GiftRecipient to NotificationRecipient
  const handleSelectionChange = (players: GiftRecipient[]) => {
    setSelectedPlayers(players as NotificationRecipient[]);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg bg-neo-navy border-3 border-black shadow-hard-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="font-neo-display text-neo-white text-xl flex items-center gap-2">
            <Send size={20} className="text-neo-cyan" />
            {t('notifications.admin.sendTitle') || 'Send Notification'}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-between px-2 py-3 border-b border-white/10 flex-shrink-0">
          {steps.map((step, index) => (
            <div key={step.key} className="flex items-center">
              <div
                className={`
                  flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium
                  ${currentStepIndex >= index ? 'text-neo-yellow' : 'text-neo-white/40'}
                `}
              >
                {step.icon}
                <span className="hidden sm:inline">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <ChevronRight
                  size={14}
                  className={currentStepIndex > index ? 'text-neo-yellow' : 'text-neo-white/20'}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {/* Step 1: Select Players */}
          {currentStep === 'players' && (
            <PlayerSelector
              authToken={authToken}
              selectedPlayers={selectedPlayers as GiftRecipient[]}
              onSelectionChange={handleSelectionChange}
              maxSelection={100}
              initialPlayerId={initialPlayerId}
            />
          )}

          {/* Step 2: Choose Type */}
          {currentStep === 'type' && (
            <NotificationTypeSelector
              selectedType={notificationType}
              onSelect={handleTypeChange}
            />
          )}

          {/* Step 3: Write Message */}
          {currentStep === 'message' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-neo-display text-neo-white mb-1">
                  {t('notifications.admin.titleLabel') || 'Title'} *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t('notifications.admin.titlePlaceholder') || 'Notification title...'}
                  maxLength={100}
                  className="bg-neo-navy border-2 border-black text-neo-white"
                />
                <span className="text-xs text-neo-white/40 mt-1 block">
                  {title.length}/100
                </span>
              </div>

              <div>
                <label className="block text-sm font-neo-display text-neo-white mb-1">
                  {t('notifications.admin.bodyLabel') || 'Message'} *
                </label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={t('notifications.admin.bodyPlaceholder') || 'Notification message...'}
                  maxLength={500}
                  rows={4}
                  className="bg-neo-navy border-2 border-black text-neo-white resize-none"
                />
                <span className="text-xs text-neo-white/40 mt-1 block">
                  {body.length}/500
                </span>
              </div>

              <div>
                <label className="block text-sm font-neo-display text-neo-white mb-1">
                  {t('notifications.admin.actionUrlLabel') || 'Action URL'} ({t('common.optional') || 'optional'})
                </label>
                <Input
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="/daily, /profile, etc."
                  maxLength={200}
                  className="bg-neo-navy border-2 border-black text-neo-white"
                />
              </div>
            </div>
          )}

          {/* Step 4: Preview */}
          {currentStep === 'preview' && (
            <div className="space-y-4">
              {/* Preview card */}
              <div className="border-3 border-black rounded-lg overflow-hidden">
                <div className="bg-neo-navy p-4 flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-neo-yellow border-2 border-black flex items-center justify-center text-2xl">
                    {NOTIFICATION_TEMPLATES[notificationType].icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-neo-display text-neo-white font-bold">{title}</h4>
                    <p className="text-sm text-neo-white/70 mt-1">{body}</p>
                    {actionUrl && (
                      <span className="text-xs text-neo-cyan mt-2 block">
                        → {actionUrl}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-black/20 rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neo-white/60">{t('notifications.admin.recipients') || 'Recipients'}:</span>
                  <span className="text-neo-white font-bold">{selectedPlayers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neo-white/60">{t('notifications.admin.type') || 'Type'}:</span>
                  <span className="text-neo-white font-bold">
                    {NOTIFICATION_TEMPLATES[notificationType].icon}{' '}
                    {t(`notifications.types.${notificationType}`) || NOTIFICATION_TEMPLATES[notificationType].label}
                  </span>
                </div>
              </div>

              {/* Selected players */}
              {selectedPlayers.length > 0 && selectedPlayers.length <= 10 && (
                <div className="text-xs text-neo-white/50">
                  <span>{t('notifications.admin.sendingTo') || 'Sending to'}: </span>
                  {selectedPlayers.map((p) => p.username).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mb-2 p-2 bg-red-500/20 border border-red-500 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/10 flex-shrink-0">
          <Button
            variant="ghost"
            onClick={goToPreviousStep}
            disabled={currentStepIndex === 0}
            className="text-neo-white/60 hover:text-neo-white"
          >
            <ChevronLeft size={16} className="mr-1" />
            {t('common.back') || 'Back'}
          </Button>

          {currentStep === 'preview' ? (
            <Button
              onClick={handleSend}
              disabled={isSending || !canProceed()}
              className="bg-neo-yellow text-black border-2 border-black shadow-hard hover:shadow-hard-sm font-neo-display"
            >
              {isSending ? (
                <span className="animate-pulse">{t('common.sending') || 'Sending...'}</span>
              ) : (
                <>
                  <Send size={16} className="mr-1" />
                  {t('notifications.admin.send') || 'Send'}
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goToNextStep}
              disabled={!canProceed()}
              className="bg-neo-cyan text-black border-2 border-black shadow-hard hover:shadow-hard-sm font-neo-display"
            >
              {t('common.next') || 'Next'}
              <ChevronRight size={16} className="ml-1" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SendNotificationDialog;
