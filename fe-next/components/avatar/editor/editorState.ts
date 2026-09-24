/**
 * Avatar editor draft state — PURE reducer, no React.
 *
 * Two layers, on purpose:
 *   - `committed` is the only thing DONE ever saves.
 *   - `tryOn` is a one-slot overlay the preview shows for a LOCKED part.
 * Ownership is not server-enforced (the client writes profiles.avatar_config
 * directly), so a tried-on part must never leak into `committed`, never become
 * an undo step, and never reach onSave.
 */
import {
  type CustomAvatarConfig,
  DEFAULT_FEMALE_HAIR,
  DEFAULT_MALE_HAIR,
  FEMALE_HAIR_STYLES,
  MALE_HAIR_STYLES,
} from '@/shared/types/customAvatar';

export const HISTORY_LIMIT = 20;

export type ConfigKey = keyof CustomAvatarConfig;

export interface TryOn {
  key: ConfigKey;
  value: string;
}

export interface EditorState {
  committed: CustomAvatarConfig;
  tryOn: TryOn | null;
  history: CustomAvatarConfig[];
  /** Increments on every visible change — keys the preview's equip pop. */
  changeCount: number;
}

export type EditorAction =
  | { type: 'set'; key: ConfigKey; value: unknown }
  | { type: 'tryOn'; key: ConfigKey; value: string }
  | { type: 'clearTryOn' }
  | { type: 'replace'; config: CustomAvatarConfig }
  | { type: 'undo' }
  | { type: 'reset'; config: CustomAvatarConfig };

export function initEditorState(config: CustomAvatarConfig): EditorState {
  return { committed: config, tryOn: null, history: [], changeCount: 0 };
}

function withHistory(state: EditorState, next: CustomAvatarConfig): EditorState {
  return {
    committed: next,
    tryOn: null,
    history: [...state.history, state.committed].slice(-HISTORY_LIMIT),
    changeCount: state.changeCount + 1,
  };
}

/** Gender switch keeps the avatar valid: hair from the right list, no beard on female. */
function applyGenderRule(prev: CustomAvatarConfig, next: CustomAvatarConfig): CustomAvatarConfig {
  if (next.gender === prev.gender) return next;
  const hairList = (next.gender === 'female' ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES) as readonly string[];
  const out = { ...next };
  if (!hairList.includes(out.hair)) {
    out.hair = (next.gender === 'female' ? DEFAULT_FEMALE_HAIR : DEFAULT_MALE_HAIR) as CustomAvatarConfig['hair'];
  }
  if (next.gender === 'female') out.facialHair = 'none' as CustomAvatarConfig['facialHair'];
  return out;
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'set': {
      if (state.committed[action.key] === action.value && !state.tryOn) return state;
      const next = applyGenderRule(state.committed, { ...state.committed, [action.key]: action.value } as CustomAvatarConfig);
      if (state.committed[action.key] === action.value) {
        // Same value but a try-on was showing: just drop the overlay.
        return { ...state, tryOn: null, changeCount: state.changeCount + 1 };
      }
      return withHistory(state, next);
    }
    case 'tryOn':
      if (state.tryOn?.key === action.key && state.tryOn.value === action.value) return state;
      return { ...state, tryOn: { key: action.key, value: action.value }, changeCount: state.changeCount + 1 };
    case 'clearTryOn':
      if (!state.tryOn) return state;
      return { ...state, tryOn: null, changeCount: state.changeCount + 1 };
    case 'replace':
      return withHistory(state, action.config);
    case 'undo': {
      if (state.history.length === 0) {
        return state.tryOn ? { ...state, tryOn: null, changeCount: state.changeCount + 1 } : state;
      }
      const history = state.history.slice(0, -1);
      return {
        committed: state.history[state.history.length - 1],
        tryOn: null,
        history,
        changeCount: state.changeCount + 1,
      };
    }
    case 'reset':
      return { ...initEditorState(action.config), changeCount: state.changeCount + 1 };
  }
}

/** What the big preview shows: committed + the try-on overlay. */
export function previewConfigOf(state: EditorState): CustomAvatarConfig {
  if (!state.tryOn) return state.committed;
  return { ...state.committed, [state.tryOn.key]: state.tryOn.value } as CustomAvatarConfig;
}

export function canUndo(state: EditorState): boolean {
  return state.history.length > 0;
}
