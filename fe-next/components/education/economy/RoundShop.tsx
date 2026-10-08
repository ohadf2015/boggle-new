'use client';

import { useClassroomEconomy } from './useClassroomEconomy';
import PowerUpShop from './PowerUpShop';

/** Between-round shop on the student results card. Shows only server-sent state. */
export default function RoundShop({ gameCode }: { gameCode: string }) {
  const econ = useClassroomEconomy(gameCode);
  if (!econ.snapshot) return null;
  return <PowerUpShop snapshot={econ.snapshot} onBuy={econ.buy} between />;
}
