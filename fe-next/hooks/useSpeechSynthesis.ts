import { useState, useCallback, useEffect, useRef } from 'react';
import { speakWord, cancelSpeech, getAvailableVoices } from '../lib/speech/textToSpeech';
import { useSoundEffects } from '../contexts/SoundEffectsContext';

/**
 * Hook for Text-to-Speech integration
 *
 * Provides React-friendly interface to Web Speech API.
 *
 * @param defaultLang - Default language code (e.g., 'en-US')
 * @returns Speech synthesis interface
 *
 * @example
 * ```typescript
 * function VocabularyWord({ word, language }) {
 *   const { speak, isSpeaking, isSupported } = useSpeechSynthesis(language);
 *
 *   if (!isSupported) {
 *     return <IpaFallback word={word} />;
 *   }
 *
 *   return (
 *     <button onClick={() => speak(word)} disabled={isSpeaking}>
 *       🔊 Listen
 *     </button>
 *   );
 * }
 * ```
 */
export function useSpeechSynthesis(defaultLang: string = 'en-US') {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const isMountedRef = useRef(true);

  // Mirror SFX mute/volume into refs so speak() always reads the latest values
  // without forcing the callback to re-create on every settings change.
  const { sfxMuted, sfxVolume } = useSoundEffects();
  const sfxMutedRef = useRef(sfxMuted);
  const sfxVolumeRef = useRef(sfxVolume);
  useEffect(() => { sfxMutedRef.current = sfxMuted; }, [sfxMuted]);
  useEffect(() => { sfxVolumeRef.current = sfxVolume; }, [sfxVolume]);

  // Check if Web Speech API is supported
  useEffect(() => {
    const voices = getAvailableVoices();
    setIsSupported(voices.length > 0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      cancelSpeech();
    };
  }, []);

  /**
   * Speak a word
   *
   * @param word - Word to pronounce
   * @param lang - Language code (optional, uses defaultLang if not provided)
   */
  const speak = useCallback(
    async (word: string, lang?: string): Promise<boolean> => {
      const targetLang = lang || defaultLang;

      // Respect global SFX mute — TTS is part of the SFX channel
      if (sfxMutedRef.current) {
        return false;
      }

      // Cancel any ongoing speech
      cancelSpeech();

      // Set speaking state
      setIsSpeaking(true);

      try {
        await speakWord(word, targetLang, sfxVolumeRef.current);
        return true;
      } catch (error) {
        console.error('Speech synthesis error:', error);
        return false;
      } finally {
        // Only update state if component still mounted
        if (isMountedRef.current) {
          setIsSpeaking(false);
        }
      }
    },
    [defaultLang]
  );

  /**
   * Cancel current speech
   */
  const cancel = useCallback(() => {
    cancelSpeech();
    setIsSpeaking(false);
  }, []);

  return {
    speak,
    cancel,
    isSpeaking,
    isSupported,
  };
}
