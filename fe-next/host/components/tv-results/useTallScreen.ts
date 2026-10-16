'use client';

import { useEffect, useState } from 'react';

/** True on walls with room to spare (1080p), false on 768p laptops and projectors. */
export function useTallScreen(): boolean {
  const [tall, setTall] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-height: 900px)');
    const update = () => setTall(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return tall;
}
