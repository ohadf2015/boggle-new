type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Player-facing copy for an engine error code (`state.lastError`). */
export function wordCraftErrorText(e: string | null, t: TFn): string | null {
  if (!e) return null;
  if (e === 'DICT_LOADING') return t('wordcraft.error.dictLoading');
  if (e.startsWith('INVALID_WORD:')) return t('wordcraft.error.invalidWord', { word: e.slice('INVALID_WORD:'.length) });
  if (e === 'FIRST_MOVE_MUST_COVER_CENTER') return t('wordcraft.error.mustCoverCenter');
  if (e === 'FIRST_MOVE_TOO_SHORT') return t('wordcraft.error.tooShort');
  if (e === 'NOT_LINEAR') return t('wordcraft.error.notLinear');
  if (e === 'NOT_CONTIGUOUS') return t('wordcraft.error.notContiguous');
  if (e === 'DISCONNECTED') return t('wordcraft.error.disconnected');
  if (e === 'OUT_OF_BOUNDS') return t('wordcraft.error.outOfBounds');
  if (e === 'NO_TILES') return t('wordcraft.error.noTiles');
  if (e === 'BAG_TOO_SMALL_TO_SWAP') return t('wordcraft.error.bagTooSmallToSwap');
  if (e === 'BLANK_UNASSIGNED') return t('wordcraft.error.blankUnassigned');
  return e;
}
