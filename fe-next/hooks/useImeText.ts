import {
  useCallback,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FormEvent,
  type Ref,
} from 'react';

/**
 * IME-resilient controlled text input.
 *
 * Why this exists: Android GBoard (and some iOS) Hebrew/RTL keyboards buffer
 * multi-keystroke composition and do NOT fire React's synthetic `onChange`
 * until the word commits. A plain controlled input (`value={state}`) keeps
 * forcing the DOM back to the stale (empty) state, so the value never "counts"
 * and any `disabled={!value.trim()}` submit button stays locked.
 *
 * The hook mirrors the raw DOM value into state via the lower-level `onInput`
 * and `compositionEnd` events, and exposes `getValue()` which reads the DOM
 * ref directly at submit time as a final fallback for stale state.
 *
 * Call sites should use `aria-disabled` (not real `disabled`) on the submit
 * button so a tap still flushes the IME buffer, and dim it with a conditional
 * className (Tailwind `disabled:` variants do NOT fire on `aria-disabled`).
 *
 * Mirrors the proven pattern in RoomChat.tsx and MessageComposer.tsx.
 */
interface UseImeTextOptions {
  /** Hard cap applied identically across change / input / compositionEnd paths. */
  maxLength?: number;
  initialValue?: string;
  /** Notified with the synced value on every change (e.g. typing indicators). */
  onValueChange?: (value: string) => void;
}

export function useImeText<T extends HTMLInputElement | HTMLTextAreaElement>(
  options: UseImeTextOptions = {}
) {
  const { maxLength, initialValue = '', onValueChange } = options;
  const ref = useRef<T>(null);
  const [value, setValue] = useState(initialValue);

  const cap = useCallback(
    (raw: string) => (maxLength != null ? raw.slice(0, maxLength) : raw),
    [maxLength]
  );

  const apply = useCallback(
    (raw: string) => {
      const next = cap(raw);
      setValue(next);
      onValueChange?.(next);
    },
    [cap, onValueChange]
  );

  const onChange = useCallback((e: ChangeEvent<T>) => apply(e.target.value), [apply]);
  const onInput = useCallback((e: FormEvent<T>) => apply(e.currentTarget.value), [apply]);
  const onCompositionEnd = useCallback(
    (e: CompositionEvent<T>) => apply(e.currentTarget.value),
    [apply]
  );

  /**
   * Read the live DOM value at submit time and trim it. React state can be
   * stale mid-composition, but the DOM input already holds the typed text.
   */
  const getValue = useCallback(() => cap(ref.current?.value ?? value).trim(), [cap, value]);

  const reset = useCallback(() => {
    setValue('');
    if (ref.current) ref.current.value = '';
  }, []);

  const isEmpty = value.trim().length === 0;

  return {
    ref,
    value,
    isEmpty,
    getValue,
    reset,
    setValue: apply,
    /** Spread onto the <input> / <textarea>. */
    inputProps: {
      ref: ref as Ref<T>,
      value,
      onChange,
      onInput,
      onCompositionEnd,
    },
  };
}
