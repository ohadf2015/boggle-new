'use client';

import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { X, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWordPackBuilder, type WordValidation } from '@/hooks/useWordPackBuilder';

interface WordPackBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const PREDEFINED_TAG_KEYS = [
  'ugc.pack.tags.animals',
  'ugc.pack.tags.food',
  'ugc.pack.tags.science',
  'ugc.pack.tags.sports',
  'ugc.pack.tags.travel',
  'ugc.pack.tags.music',
  'ugc.pack.tags.tech',
  'ugc.pack.tags.nature',
] as const;
const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'he', label: 'Hebrew' },
  { value: 'sv', label: 'Swedish' },
  { value: 'ja', label: 'Japanese' },
];

export default function WordPackBuilder({ isOpen, onClose }: WordPackBuilderProps) {
  const { t } = useLanguage();
  const hook = useWordPackBuilder();
  const [wordInput, setWordInput] = useState('');
  const [lastValidation, setLastValidation] = useState<WordValidation | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const wordInputRef = useRef<HTMLInputElement>(null);

  const handleAddWord = useCallback(async () => {
    const trimmed = wordInput.trim();
    if (!trimmed) return;
    const validation = await hook.addWord(trimmed);
    setLastValidation(validation);
    if (!validation.duplicate) setWordInput('');
    wordInputRef.current?.focus();
  }, [wordInput, hook]);

  const handleWordKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddWord();
      }
    },
    [handleAddWord]
  );

  const handleBulkPaste = useCallback(async () => {
    if (!bulkText.trim()) return;
    await hook.bulkAddWords(bulkText);
    setBulkText('');
    setShowBulk(false);
  }, [bulkText, hook]);

  if (!isOpen) return null;

  const wordCountColor =
    hook.words.length >= 10
      ? 'text-neo-lime'
      : hook.words.length >= 5
      ? 'text-neo-yellow'
      : 'text-neo-white';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-labelledby="word-pack-builder-title"
    >
      <div className="relative w-full max-w-lg max-h-[90dvh] flex flex-col bg-neo-navy border-neo border-black rounded-neo shadow-hard overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-black/30">
          <h2
            id="word-pack-builder-title"
            className="font-neo-display text-xl text-neo-white"
          >
            {t('ugc.pack.builder.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-neo hover:bg-white/10 transition-colors"
            aria-label={t('ugc.pack.builder.close')}
          >
            <X className="w-5 h-5 text-neo-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Pack name */}
          <div>
            <label className="block text-sm font-neo-body text-neo-white mb-1">
              {t('ugc.pack.builder.nameLabel')}
            </label>
            <input
              type="text"
              maxLength={50}
              value={hook.name}
              onChange={(e) => hook.setName(e.target.value)}
              placeholder={t('ugc.pack.builder.namePlaceholder')}
              className="w-full px-3 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-white placeholder-neo-white/40 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-neo-body text-neo-white mb-1">
              {t('ugc.pack.builder.descriptionLabel')}
            </label>
            <textarea
              maxLength={140}
              value={hook.description}
              onChange={(e) => hook.setDescription(e.target.value)}
              placeholder={t('ugc.pack.builder.descriptionPlaceholder')}
              rows={2}
              className="w-full px-3 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-white placeholder-neo-white/40 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow resize-none"
            />
          </div>

          {/* Language + Emoji row */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-neo-body text-neo-white mb-1">
                {t('ugc.pack.builder.languageLabel')}
              </label>
              <select
                value={hook.language}
                onChange={(e) => hook.setLanguage(e.target.value)}
                className="w-full px-3 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-white focus:outline-hidden focus:ring-2 focus:ring-neo-yellow"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-28">
              <label className="block text-sm font-neo-body text-neo-white mb-1">
                {t('ugc.pack.builder.emojiLabel')}
              </label>
              <input
                type="text"
                value={hook.themeEmoji}
                onChange={(e) => hook.setThemeEmoji(e.target.value)}
                placeholder="🎯"
                className="w-full px-3 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-white text-center text-xl placeholder-neo-white/40 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow"
                maxLength={2}
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-neo-body text-neo-white mb-2">
              {t('ugc.pack.builder.tagsLabel')}
            </label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_TAG_KEYS.map((tagKey) => {
                const tagLabel = t(tagKey);
                const active = hook.tags.includes(tagLabel);
                return (
                  <button
                    key={tagKey}
                    type="button"
                    onClick={() =>
                      hook.setTags(
                        active ? hook.tags.filter((existing) => existing !== tagLabel) : [...hook.tags, tagLabel]
                      )
                    }
                    className={`px-3 py-1 text-sm rounded-neo border-neo border-black font-neo-body transition-colors ${
                      active
                        ? 'bg-neo-yellow text-black'
                        : 'bg-neo-navy/60 text-neo-white hover:bg-neo-navy'
                    }`}
                  >
                    {tagLabel}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Word input */}
          <div>
            <label className="block text-sm font-neo-body text-neo-white mb-1">
              {t('ugc.pack.builder.wordsLabel')}
            </label>
            <div className="flex gap-2">
              <input
                ref={wordInputRef}
                type="text"
                value={wordInput}
                onChange={(e) => setWordInput(e.target.value)}
                onKeyDown={handleWordKeyDown}
                placeholder={t('ugc.pack.builder.wordPlaceholder')}
                className="flex-1 px-3 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-white placeholder-neo-white/40 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow uppercase"
              />
              <button
                type="button"
                onClick={handleAddWord}
                disabled={!wordInput.trim()}
                className="px-4 py-2 bg-neo-cyan text-black font-neo-display border-neo border-black rounded-neo shadow-hard-sm hover:shadow-hard-pressed active:animate-neo-press disabled:opacity-40"
              >
                {t('ugc.pack.builder.addWord')}
              </button>
            </div>

            {/* Validation feedback */}
            {lastValidation && (
              <p
                className={`mt-1 text-xs font-neo-body ${
                  lastValidation.duplicate
                    ? 'text-neo-yellow animate-neo-shake'
                    : lastValidation.valid
                    ? 'text-neo-lime'
                    : 'text-neo-orange animate-neo-shake'
                }`}
              >
                {lastValidation.duplicate
                  ? t('ugc.pack.builder.duplicate')
                  : lastValidation.valid
                  ? t('ugc.pack.builder.wordAdded')
                  : t('ugc.pack.builder.wordInvalid')}
              </p>
            )}

            {/* Word count progress */}
            <p className={`mt-1 text-xs font-neo-body ${wordCountColor}`}>
              {hook.words.length} / {t('ugc.pack.builder.minimum')} 10
            </p>

            {/* Word chips */}
            {hook.words.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3 max-h-32 overflow-y-auto">
                {hook.words.map((word) => (
                  <span
                    key={word}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-neo-lime/20 border border-neo-lime/40 rounded-neo text-neo-white text-xs font-neo-body"
                  >
                    {word}
                    <button
                      type="button"
                      onClick={() => hook.removeWord(word)}
                      aria-label={`Remove ${word}`}
                      className="text-neo-white hover:text-neo-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bulk paste */}
          <div>
            <button
              type="button"
              onClick={() => setShowBulk((v) => !v)}
              className="flex items-center gap-1 text-sm text-neo-cyan hover:text-neo-cyan/80 font-neo-body"
            >
              {showBulk ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {t('ugc.pack.builder.bulkPaste')}
            </button>

            {showBulk && (
              <div className="mt-2 space-y-2">
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={t('ugc.pack.builder.bulkPlaceholder')}
                  rows={5}
                  className="w-full px-3 py-2 bg-neo-navy border-neo border-black rounded-neo text-neo-white placeholder-neo-white/40 focus:outline-hidden focus:ring-2 focus:ring-neo-yellow resize-none uppercase text-sm font-mono"
                />
                <button
                  type="button"
                  onClick={handleBulkPaste}
                  disabled={!bulkText.trim()}
                  className="px-4 py-2 text-sm bg-neo-cyan text-black font-neo-display border-neo border-black rounded-neo shadow-hard-sm disabled:opacity-40"
                >
                  {t('ugc.pack.builder.addAll')}
                </button>
              </div>
            )}
          </div>

          {/* Error */}
          {hook.publishError && (
            <p className="text-sm text-neo-orange font-neo-body">{hook.publishError}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-black/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-neo-display text-neo-white border-neo border-black/40 rounded-neo hover:bg-white/10"
          >
            {t('ugc.pack.builder.cancel')}
          </button>
          <button
            type="button"
            onClick={hook.publishPack}
            disabled={!hook.canPublish || hook.isPublishing}
            className="px-6 py-2 font-neo-display text-black bg-neo-lime border-neo border-black rounded-neo shadow-hard hover:shadow-hard-pressed active:animate-neo-press disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {hook.isPublishing
              ? t('ugc.pack.builder.publishing')
              : t('ugc.pack.builder.publish')}
          </button>
        </div>
      </div>
    </div>
  );
}
