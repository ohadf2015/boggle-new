export const FIELD = { w: 1920, h: 1080 } as const;

export const CATCH_FIELD = { plateY: 900, floorY: 1040, halfPlate: 130, minX: 150, maxX: 1770 } as const;

export const DASH_FIELD = { ceiling: 230, floor: 850, roofY: 910, spawnX: 2040, startX: 240, gapX: 210 } as const;

export interface PartyHole {
  x: number;
  y: number;
  scale: number;
}

export const PARTY_HOLES: PartyHole[] = [
  { x: 224, y: 600, scale: 0.8 },
  { x: 510, y: 600, scale: 0.8 },
  { x: 780, y: 600, scale: 0.8 },
  { x: 1140, y: 600, scale: 0.8 },
  { x: 1420, y: 600, scale: 0.8 },
  { x: 1700, y: 600, scale: 0.8 },
  { x: 230, y: 810, scale: 1.1 },
  { x: 660, y: 810, scale: 1.1 },
  { x: 1190, y: 810, scale: 1.1 },
  { x: 1690, y: 810, scale: 1.1 },
];
