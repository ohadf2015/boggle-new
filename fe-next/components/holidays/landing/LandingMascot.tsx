'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './landing.module.css';

interface Props {
  src: string;
  label: string;
  sparkSrc: string;
}

export default function LandingMascot({ src, label, sparkSrc }: Props) {
  const [hop, setHop] = useState(false);
  return (
    <div className="relative h-36 w-32 shrink-0 sm:h-48 sm:w-44">
      <button
        type="button"
        aria-label={label}
        onClick={() => setHop(true)}
        onAnimationEnd={(e) => e.animationName.includes('hop') && setHop(false)}
        className={`${hop ? styles.mascotHop : styles.mascot} relative block h-full w-full rounded-neo focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cream`}
      >
        <Image src={src} alt="" fill sizes="(min-width: 640px) 176px, 128px" priority className="object-contain drop-shadow-[4px_4px_0_rgb(var(--neo-black))]" />
      </button>
      <Image src={sparkSrc} alt="" width={64} height={64} aria-hidden className={`${styles.spark} m-auto h-16 w-16 object-contain`} />
    </div>
  );
}
