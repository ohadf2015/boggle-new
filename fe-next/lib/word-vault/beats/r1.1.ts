import type { Room } from './types';

export const ROOM_R1_1: Room = {
  id: 'r1.1',
  beatOrder: 'sequential',
  exitCondition: 'all-beats',
  beats: [
    {
      id: 'open-door',
      hint: {
        ambient: 'דלת סדוקה. משב חמים מבעד לסדק.',
        objects: [
          {
            sceneObjectId: 'door',
            fragmentId: 'door-needs-name',
            onTap: { kind: 'whisper', text: 'הדלת מבקשת שם' },
          },
          {
            sceneObjectId: 'lantern',
            fragmentId: 'lantern-glyph-aleph',
            onTap: { kind: 'glyph', glyph: 'א' },
          },
        ],
        notebookHint: 'שם קצר, אות אחת מתגלה.',
      },
      grid: {
        size: 3,
        letterSource: 'pangram',
        traversal: 'anytap',
        targets: [{ word: 'אש' }],
        semanticGate: {
          class: 'name-male',
          acceptList: ['אש', 'אורי', 'אבי'],
          rareBonusList: ['להבה'],
        },
        bonusBucket: { baseCoinsPerWord: 2 },
      },
      onSolve: {
        cue: 'ember-bloom',
        unlocksDoor: true,
        storyBeats: ['r1.1.opened'],
      },
    },
  ],
};
