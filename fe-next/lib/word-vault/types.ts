export type Locale = 'he' | 'en';

export type LocalizedText = {
  he: string;
  en?: string;
};

export type RiddleEngineId = 'word-constraint' | 'cipher' | 'logic-sequence';

export type CousinId = 'cinder' | 'frost-mute' | 'forgotten' | 'ciphermaster';

export type ItemId =
  | 'melo-lantern'
  | 'defrost-candle'
  | 'brass-key'
  | 'cael-recipe-book'
  | 'family-photo'
  | 'cinder-charm'
  | 'broom';

export type RoomId = string;

export type Tile = {
  id: string;
  letter: string;
  position?: number;
};

export type WordConstraintRiddle = {
  engine: 'word-constraint';
  tiles: Tile[];
  minLength: number;
  targetWords: string[];
};

export type CipherJar = {
  id: string;
  scrambled: string;
  answer: string;
  isRedHerring?: boolean;
  /** Category hint shown when player opens the jar (e.g. "מצרך אפייה") */
  hint?: LocalizedText;
};

export type CipherRiddle = {
  engine: 'cipher';
  jars: CipherJar[];
};

export type LogicStep = {
  id: string;
  label: LocalizedText;
};

export type LogicSequenceRiddle = {
  engine: 'logic-sequence';
  steps: LogicStep[];
  correctOrder: string[];
  hintRhyme: LocalizedText;
};

export type Riddle = WordConstraintRiddle | CipherRiddle | LogicSequenceRiddle;

export type RoomReward = {
  coins: number;
  items?: ItemId[];
  letterFragment?: number;
};

export type TwinVoiceTease = {
  text: LocalizedText;
  trigger: 'on-enter' | 'on-solve' | 'cinematic';
};

export type RoomConfig = {
  id: RoomId;
  chapter: number;
  title: LocalizedText;
  storyBeat: LocalizedText;
  riddle: Riddle | null;
  rewards: RoomReward;
  twinVoiceTease?: TwinVoiceTease;
  isStoryOnly?: boolean;
};

export type Item = {
  id: ItemId;
  name: LocalizedText;
  description: LocalizedText;
  passive?: string;
};

export type Cousin = {
  id: CousinId;
  nameHe: string;
  nameEn: string;
  was: string;
  is: string;
  domain: string;
};

export type PlayerChoice = {
  room4_burnRecipe: boolean | null;
  room6_finalLine: 'forgive' | 'remember' | 'farewell' | null;
};

export type GameProgress = {
  currentRoom: RoomId | null;
  solvedRooms: RoomId[];
  redeemedCousins: CousinId[];
  memoryCoins: number;
  hintTokens: number;
  permanentItems: ItemId[];
  choices: PlayerChoice;
  uniqueWordsSpelled: string[];
};

export type AudioVolume = {
  music: number;
  sfx: number;
};

export type GameSettings = {
  locale: Locale;
  reduceMotion: boolean;
  largeText: boolean;
  audioVolume: AudioVolume;
};

export const INITIAL_HINT_TOKENS = 3;
export const HINT_TOKEN_COST = 50;
export const FREE_HINT_TOKENS_PER_CHAPTER = 3;
