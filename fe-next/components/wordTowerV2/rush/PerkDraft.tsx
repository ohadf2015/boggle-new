"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { m, type Variants } from "framer-motion";
import type { Perk, PerkId, PerkRarity } from "@/lib/wordTowerV2/rush/types";
import { PerkGlyph } from "./perkGlyphs";

type T = (key: string, params?: Record<string, string | number>) => string;

const PICK_MS = 420;

interface RarityStyle {
  ring: string;
  tile: string;
  tag: string;
  shimmer: boolean;
}

const RARITY: Record<PerkRarity, RarityStyle> = {
  common: {
    ring: "",
    tile: "bg-neo-cyan text-neo-navy",
    tag: "bg-neo-cyan text-neo-navy",
    shimmer: false,
  },
  rare: {
    ring: "ring-4 ring-neo-purple",
    tile: "bg-neo-purple text-neo-white",
    tag: "bg-neo-purple text-neo-white",
    shimmer: false,
  },
  epic: {
    ring: "ring-4 ring-neo-yellow",
    tile: "bg-neo-yellow text-neo-navy",
    tag: "bg-neo-yellow text-neo-navy",
    shimmer: true,
  },
};

interface Custom {
  rm: boolean;
  i: number;
}

const cardVariants: Variants = {
  hidden: ({ rm }: Custom) =>
    rm ? { opacity: 0 } : { opacity: 0, rotateY: -100, y: 28, scale: 0.9 },
  shown: ({ rm, i }: Custom) => ({
    opacity: 1,
    rotateY: 0,
    y: 0,
    scale: 1,
    transition: rm
      ? { duration: 0.15 }
      : {
          type: "spring",
          stiffness: 300,
          damping: 17,
          mass: 0.9,
          delay: 0.12 + i * 0.11,
        },
  }),
  picked: ({ rm }: Custom) =>
    rm
      ? { opacity: 1 }
      : {
          scale: 1.08,
          y: -10,
          rotate: 0,
          transition: { type: "spring", stiffness: 420, damping: 14 },
        },
  dropped: ({ rm }: Custom) =>
    rm
      ? { opacity: 0.3 }
      : { opacity: 0.2, scale: 0.92, y: 12, transition: { duration: 0.25 } },
};

interface Props {
  t: T;
  perks: Perk[];
  onPick: (id: PerkId) => void;
  floor: number;
  reducedMotion?: boolean;
}

export function PerkDraft({
  t,
  perks,
  onPick,
  floor,
  reducedMotion = false,
}: Props) {
  const titleId = useId();
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [picked, setPicked] = useState<PerkId | null>(null);
  const pickedRef = useRef(false);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  const pick = useCallback(
    (id: PerkId | undefined) => {
      if (!id || pickedRef.current) return;
      pickedRef.current = true;
      setPicked(id);
      if (reducedMotion) onPickRef.current(id);
      else window.setTimeout(() => onPickRef.current(id), PICK_MS);
    },
    [reducedMotion],
  );

  useEffect(() => {
    cardRefs.current[0]?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= perks.length) {
        e.preventDefault();
        pick(perks[n - 1]?.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [perks, pick]);

  const trapTab = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const cards = cardRefs.current.filter((c): c is HTMLButtonElement => !!c);
    if (cards.length === 0) return;
    const at = cards.indexOf(document.activeElement as HTMLButtonElement);
    const next = e.shiftKey
      ? at <= 0
        ? cards.length - 1
        : at - 1
      : at === cards.length - 1
        ? 0
        : at + 1;
    e.preventDefault();
    cards[next]?.focus();
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={trapTab}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-3 overflow-y-auto bg-neo-navy/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] sm:gap-6"
    >
      <m.header
        className="flex flex-col items-center gap-1 text-center"
        initial={
          reducedMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.9 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reducedMotion
            ? { duration: 0.1 }
            : { type: "spring", stiffness: 380, damping: 16 }
        }
      >
        <h2
          id={titleId}
          className="-rotate-2 rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1 font-neo-display text-2xl font-black uppercase leading-none text-neo-navy shadow-hard-xl sm:text-4xl"
        >
          {t("wordTowerV2.rush.draft.title")}
        </h2>
        <p className="font-neo-display text-sm font-bold text-neo-cream sm:text-base">
          {t("wordTowerV2.rush.draft.subtitle", { n: floor })}
        </p>
      </m.header>

      <div className="flex w-full max-w-sm flex-col gap-3 [perspective:1100px] sm:max-w-3xl sm:flex-row sm:items-stretch sm:gap-5">
        {perks.map((perk, i) => (
          <PerkCard
            key={perk.id}
            t={t}
            perk={perk}
            index={i}
            state={
              picked === null
                ? "shown"
                : picked === perk.id
                  ? "picked"
                  : "dropped"
            }
            reducedMotion={reducedMotion}
            onPick={pick}
            buttonRef={(el) => {
              cardRefs.current[i] = el;
            }}
          />
        ))}
      </div>
    </div>,
    document.body,
  );
}

interface CardProps {
  t: T;
  perk: Perk;
  index: number;
  state: "shown" | "picked" | "dropped";
  reducedMotion: boolean;
  onPick: (id: PerkId) => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}

function PerkCard({
  t,
  perk,
  index,
  state,
  reducedMotion,
  onPick,
  buttonRef,
}: CardProps) {
  const style = RARITY[perk.rarity];
  const live = state === "shown";
  const tilt = index === 0 ? -1.5 : index === 2 ? 1.5 : 0;

  return (
    <m.button
      ref={buttonRef}
      type="button"
      data-perk={perk.id}
      data-rarity={perk.rarity}
      disabled={state === "dropped"}
      onClick={() => onPick(perk.id)}
      custom={{ rm: reducedMotion, i: index }}
      variants={cardVariants}
      initial="hidden"
      animate={state}
      whileHover={
        live && !reducedMotion
          ? {
              y: -8,
              rotate: tilt,
              transition: { type: "spring", stiffness: 400, damping: 15 },
            }
          : undefined
      }
      whileTap={live && !reducedMotion ? { scale: 0.96, y: 0 } : undefined}
      className={`relative flex min-h-[7.5rem] w-full flex-1 items-center gap-3 overflow-hidden rounded-neo-lg border-neo-thick border-black bg-neo-cream p-3 pe-10 text-start text-neo-navy shadow-hard-xl outline-none [transform-style:preserve-3d] focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-neo-white sm:min-h-[17rem] sm:flex-col sm:items-center sm:justify-start sm:gap-3 sm:p-5 sm:pe-5 sm:text-center ${style.ring}`}
    >
      {style.shimmer && !reducedMotion ? (
        <m.span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-neo-white/50"
          initial={{ x: "-150%" }}
          animate={{ x: ["-150%", "400%"] }}
          transition={{
            duration: 1.6,
            repeat: Infinity,
            repeatDelay: 1.2,
            ease: "easeInOut",
            delay: 0.6,
          }}
        />
      ) : null}

      <span
        aria-hidden
        className="absolute end-2 top-2 flex h-6 w-6 items-center justify-center rounded-neo-sm border-2 border-black bg-neo-navy font-neo-display text-xs font-black text-neo-cream shadow-hard-sm"
      >
        {index + 1}
      </span>

      <span
        className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black shadow-hard-lg sm:h-20 sm:w-20 ${style.tile}`}
      >
        <PerkGlyph id={perk.id} className="h-10 w-10 sm:h-12 sm:w-12" />
      </span>

      <span className="relative flex min-w-0 flex-col gap-1 sm:items-center">
        <span
          className={`w-fit rounded-neo-sm border-2 border-black px-1.5 py-px font-neo-display text-[11px] font-black uppercase leading-tight ${style.tag}`}
        >
          {t(`wordTowerV2.rush.rarity.${perk.rarity}`)}
        </span>
        <span className="font-neo-display text-lg font-black uppercase leading-tight sm:text-xl">
          {t(`wordTowerV2.rush.perk.${perk.id}.name`)}
        </span>
        <span className="text-sm font-semibold leading-snug text-neo-gray-600">
          {t(`wordTowerV2.rush.perk.${perk.id}.desc`)}
        </span>
      </span>
    </m.button>
  );
}
