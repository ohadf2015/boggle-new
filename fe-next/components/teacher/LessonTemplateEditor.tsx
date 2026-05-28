'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Save, Clock, Grid3X3, Type, Users, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import type { LessonTemplate, CreateTemplateData, UpdateTemplateData, Difficulty } from '@/hooks/useLessonTemplate';

interface LessonTemplateEditorProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  lessonName: string;
  existingTemplate?: LessonTemplate;
  onSave: (data: CreateTemplateData | { id: string } & UpdateTemplateData) => Promise<{ success: boolean; error?: string }>;
  isSaving?: boolean;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string; rows: number; cols: number }[] = [
  { value: 'EASY', label: '4x4', rows: 4, cols: 4 },
  { value: 'MEDIUM', label: '5x5', rows: 5, cols: 5 },
  { value: 'HARD', label: '6x6', rows: 6, cols: 6 },
];

const TIMER_OPTIONS = [
  { value: 60, label: '1 min' },
  { value: 120, label: '2 min' },
  { value: 180, label: '3 min' },
  { value: 240, label: '4 min' },
  { value: 300, label: '5 min' },
];

export default function LessonTemplateEditor({
  isOpen,
  onClose,
  lessonId,
  lessonName,
  existingTemplate,
  onSave,
  isSaving = false,
}: LessonTemplateEditorProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';

  // Form state
  const [name, setName] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(180);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [minWordLength, setMinWordLength] = useState(2);
  const [allowLateJoin, setAllowLateJoin] = useState(true);
  const [isDefault, setIsDefault] = useState(false);

  // Initialize form when template changes
  useEffect(() => {
    if (existingTemplate) {
      setName(existingTemplate.name);
      setTimerSeconds(existingTemplate.timer_seconds);
      setDifficulty(existingTemplate.difficulty);
      setMinWordLength(existingTemplate.min_word_length);
      setAllowLateJoin(existingTemplate.allow_late_join);
      setIsDefault(existingTemplate.is_default);
    } else {
      // Default values for new template
      setName(`${lessonName} - Default`);
      setTimerSeconds(180);
      setDifficulty('MEDIUM');
      setMinWordLength(2);
      setAllowLateJoin(true);
      setIsDefault(false);
    }
  }, [existingTemplate, lessonName, isOpen]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(t('education.template.nameRequired'));
      return;
    }

    const data = existingTemplate
      ? {
          id: existingTemplate.id,
          name: name.trim(),
          timerSeconds,
          difficulty,
          minWordLength,
          allowLateJoin,
          isDefault,
        }
      : {
          lessonId,
          name: name.trim(),
          timerSeconds,
          difficulty,
          minWordLength,
          allowLateJoin,
          isDefault,
        };

    const result = await onSave(data as CreateTemplateData);

    if (result.success) {
      toast.success(t('education.template.saved'));
      onClose();
    } else {
      toast.error(result.error || 'Failed to save template');
    }
  };

  const selectedDifficulty = DIFFICULTY_OPTIONS.find((d) => d.value === difficulty);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-neo-black/80 z-50" />
        <Dialog.Content
          className={cn(
            'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
            'w-full max-w-lg max-h-[90vh] overflow-y-auto p-6',
            'bg-neo-navy border-neo border-neo-black shadow-hard-lg z-50 rounded-neo'
          )}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <Dialog.Title className="text-2xl font-neo-display text-neo-white mb-6">
            {existingTemplate
              ? t('education.template.edit')
              : t('education.template.create')}
          </Dialog.Title>
          <Dialog.Description className="sr-only">
            {t('education.template.description')}
          </Dialog.Description>

          <div className="space-y-6">
            {/* Template Name */}
            <div className="space-y-2">
              <Label className="text-sm font-neo-body text-neo-white flex items-center gap-2">
                <Type className="w-4 h-4 text-neo-cyan" />
                {t('education.template.name')}
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('education.template.namePlaceholder')}
                className="border-neo border-neo-black shadow-hard-sm bg-neo-navy/50"
              />
            </div>

            {/* Timer */}
            <div className="space-y-3">
              <Label className="text-sm font-neo-body text-neo-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-neo-lime" />
                {t('education.template.timer')}
              </Label>
              <div className="flex gap-2 flex-wrap">
                {TIMER_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    onClick={() => setTimerSeconds(option.value)}
                    className={cn(
                      'border-neo border-neo-black transition-all',
                      timerSeconds === option.value
                        ? 'bg-neo-lime text-neo-black shadow-hard-pressed'
                        : 'bg-neo-navy/50 text-neo-white shadow-hard hover:shadow-hard-pressed'
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Difficulty / Board Size */}
            <div className="space-y-3">
              <Label className="text-sm font-neo-body text-neo-white flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-neo-orange" />
                {t('education.template.difficulty')}
              </Label>
              <div className="flex gap-2">
                {DIFFICULTY_OPTIONS.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    size="sm"
                    onClick={() => setDifficulty(option.value)}
                    className={cn(
                      'flex-1 border-neo border-neo-black transition-all',
                      difficulty === option.value
                        ? 'bg-neo-orange text-neo-black shadow-hard-pressed'
                        : 'bg-neo-navy/50 text-neo-white shadow-hard hover:shadow-hard-pressed'
                    )}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
              {selectedDifficulty && (
                <p className="text-xs text-neo-white">
                  {t('education.template.boardPreview')} {selectedDifficulty.rows}x{selectedDifficulty.cols}
                </p>
              )}
            </div>

            {/* Min Word Length */}
            <div className="space-y-3">
              <Label className="text-sm font-neo-body text-neo-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-neo-pink" />
                {t('education.template.minWordLength')}
              </Label>
              <div className="flex gap-2">
                {[2, 3, 4, 5].map((len) => (
                  <Button
                    key={len}
                    type="button"
                    size="sm"
                    onClick={() => setMinWordLength(len)}
                    className={cn(
                      'flex-1 border-neo border-neo-black transition-all',
                      minWordLength === len
                        ? 'bg-neo-pink text-neo-black shadow-hard-pressed'
                        : 'bg-neo-navy/50 text-neo-white shadow-hard hover:shadow-hard-pressed'
                    )}
                  >
                    {len}
                  </Button>
                ))}
              </div>
            </div>

            {/* Allow Late Join */}
            <div className="flex items-center justify-between p-4 bg-neo-black/30 rounded-neo border border-neo-black">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neo-cyan" />
                <div>
                  <Label className="text-sm font-neo-body text-neo-white">
                    {t('education.template.allowLateJoin')}
                  </Label>
                  <p className="text-xs text-neo-white">
                    {t('education.template.allowLateJoinDesc')}
                  </p>
                </div>
              </div>
              <Switch
                checked={allowLateJoin}
                onCheckedChange={setAllowLateJoin}
              />
            </div>

            {/* Set as Default */}
            <div className="flex items-center justify-between p-4 bg-neo-black/30 rounded-neo border border-neo-black">
              <div>
                <Label className="text-sm font-neo-body text-neo-white">
                  {t('education.template.setDefault')}
                </Label>
                <p className="text-xs text-neo-white">
                  {t('education.template.setDefaultDesc')}
                </p>
              </div>
              <Switch
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleSave}
                disabled={isSaving || !name.trim()}
                className={cn(
                  'flex-1 bg-neo-cyan text-neo-black font-bold',
                  'border-neo border-neo-black shadow-hard hover:shadow-hard-pressed',
                  'transition-all'
                )}
              >
                <Save className="w-4 h-4 me-2" />
                {isSaving
                  ? t('education.template.saving')
                  : t('education.template.save')}
              </Button>
              <Button
                variant="outline"
                onClick={onClose}
                className="border-neo-pink text-neo-pink hover:bg-neo-pink/20"
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>

          <Dialog.Close asChild>
            <button
              className={cn(
                'absolute top-4 text-neo-white hover:text-neo-white',
                isRTL ? 'left-4' : 'right-4'
              )}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
