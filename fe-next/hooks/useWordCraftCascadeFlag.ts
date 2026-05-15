import { usePostHogFlag } from './usePostHogFlag';

const FLAG_KEY = 'wordcraft-cascade-mode';

export function useWordCraftCascadeFlag(): boolean {
  const remote = usePostHogFlag<boolean>(FLAG_KEY, false);
  const devOverride = process.env.NEXT_PUBLIC_WORDCRAFT_CASCADE_DEV === '1';
  return devOverride || remote === true;
}
