import { usePostHogFlag } from './usePostHogFlag';

const FLAG_KEY = 'wordcraft-run-mode';

export function useWordCraftRunFlag(): boolean {
  const remote = usePostHogFlag<boolean>(FLAG_KEY, false);
  const devOverride = process.env.NEXT_PUBLIC_WORDCRAFT_RUN_DEV === '1';
  return devOverride || remote === true;
}
