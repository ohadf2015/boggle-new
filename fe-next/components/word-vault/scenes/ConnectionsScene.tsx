'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

interface Props {
  onSolved: () => void;
  onExit: () => void;
}

type ZoneId = 'before' | 'night' | 'gift' | 'journey';
type Location = 'table' | ZoneId;

const ZONES: Record<ZoneId, { word: string; gloss: string; tone: string; bg: string; border: string; ink: string }> = {
  before: {
    word: 'יחד',
    gloss: 'לפני שהאש קיפלה אותם',
    tone: 'amber',
    bg: '#e9c477',
    border: '#a8731f',
    ink: '#1a0e08',
  },
  night: {
    word: 'הלילה',
    gloss: 'מה שאירע כשכולם ישנו',
    tone: 'red',
    bg: '#9c4236',
    border: '#5a1f15',
    ink: '#1a0808',
  },
  gift: {
    word: 'מתנה',
    gloss: 'מה שהוא השאיר אחריו',
    tone: 'gold',
    bg: '#d8a850',
    border: '#8a5a14',
    ink: '#1a1208',
  },
  journey: {
    word: 'מסע',
    gloss: 'מה שמלו מוצא בדרך',
    tone: 'cyan',
    bg: '#6ba0b8',
    border: '#2c5168',
    ink: '#0a141a',
  },
};

type GlyphKind =
  | 'photo' | 'apron' | 'toy' | 'drawing'
  | 'ash' | 'bread' | 'book' | 'cup'
  | 'letter' | 'key' | 'bracelet' | 'recipe'
  | 'lantern' | 'coin' | 'map' | 'stone';

interface ItemDef {
  id: string;
  labelHe: string;
  zone: ZoneId;
  glyph: GlyphKind;
  /** Initial scattered table coords (0..1 each) */
  x: number;
  y: number;
  rot: number;
  story: string;
}

const ITEMS: ItemDef[] = [
  // BEFORE (יחד) — pre-corruption family
  { id: 'photo',     labelHe: 'תצלום משפחתי',  zone: 'before',  glyph: 'photo',    x: 0.18, y: 0.30, rot: -6, story: 'חמישה בני דודים מחבקים. אחד הם איבדו.' },
  { id: 'apron',     labelHe: 'סינר נקי',      zone: 'before',  glyph: 'apron',    x: 0.62, y: 0.27, rot: 4,  story: 'הוא לבש אותו כל יום, גם כשבישל לעצמו.' },
  { id: 'toy',       labelHe: 'צעצוע ישן',     zone: 'before',  glyph: 'toy',      x: 0.78, y: 0.45, rot: -10, story: 'מהזמן שכולם היו קטנים.' },
  { id: 'drawing',   labelHe: 'ציור ילדה',     zone: 'before',  glyph: 'drawing',  x: 0.10, y: 0.55, rot: 8,  story: 'בת דודה ציירה את כולנו. עם שמש.' },
  // NIGHT (הלילה) — the night corruption struck
  { id: 'ash',       labelHe: 'אפר חתום',      zone: 'night',   glyph: 'ash',      x: 0.42, y: 0.20, rot: -3, story: 'משהו נשרף שם. מישהו.' },
  { id: 'bread',     labelHe: 'חצי לחם',       zone: 'night',   glyph: 'bread',    x: 0.30, y: 0.42, rot: 12, story: 'נשאר על השולחן. אף אחד לא חזר.' },
  { id: 'book',      labelHe: 'ספר מקופל',     zone: 'night',   glyph: 'book',     x: 0.55, y: 0.55, rot: -7, story: 'הוא דיבר. עם שני קולות.' },
  { id: 'cup',       labelHe: 'כוס שבורה',     zone: 'night',   glyph: 'cup',      x: 0.85, y: 0.30, rot: 5,  story: 'מים שפך — או שהוא ברח.' },
  // GIFT (מתנה) — what Cael gave / left behind
  { id: 'letter',    labelHe: 'מכתב כתב יד',   zone: 'gift',    glyph: 'letter',   x: 0.22, y: 0.72, rot: -4, story: '"אם תמצא את זה — אני הייתי בסדר."' },
  { id: 'key',       labelHe: 'מפתח קטן',      zone: 'gift',    glyph: 'key',      x: 0.50, y: 0.70, rot: 14, story: 'לא ידוע למה. אבל הוא חתם עליו.' },
  { id: 'bracelet',  labelHe: 'צמיד שזור',     zone: 'gift',    glyph: 'bracelet', x: 0.40, y: 0.85, rot: -8, story: 'הוא אמר: "תני אותו, מי שצריך."' },
  { id: 'recipe',    labelHe: 'מתכון לחם',     zone: 'gift',    glyph: 'recipe',   x: 0.68, y: 0.85, rot: 6,  story: 'הוא לימד אותך אותו פעם. אתה זוכר?' },
  // JOURNEY (מסע) — what Melo collects in Book 1
  { id: 'lantern',   labelHe: 'פנס מלו',       zone: 'journey', glyph: 'lantern',  x: 0.06, y: 0.18, rot: -2, story: 'מאיר את המילים. רק את שלך.' },
  { id: 'coin',      labelHe: 'מטבע זיכרון',   zone: 'journey', glyph: 'coin',     x: 0.92, y: 0.65, rot: 11, story: 'נמצא בחדר הראשון. עוד יבוא.' },
  { id: 'map',       labelHe: 'מפת המרתף',     zone: 'journey', glyph: 'map',      x: 0.05, y: 0.80, rot: 7,  story: 'מסומנת בידיים שלו.' },
  { id: 'stone',     labelHe: 'אבן זיק',       zone: 'journey', glyph: 'stone',    x: 0.92, y: 0.85, rot: -12, story: 'חמה לרגע, אז קרה. שוב.' },
];

const MAX_MISTAKES = 4;
const FINAL_PHRASE_HE = 'יחד · הלילה · מתנה · מסע';
const FINAL_LINE_HE = 'הוא לא נעלם. הוא רק התחבא בכלים.';

export function ConnectionsScene({ onSolved, onExit }: Props) {
  const [locations, setLocations] = useState<Record<string, Location>>(() =>
    Object.fromEntries(ITEMS.map((it) => [it.id, 'table' as Location])),
  );
  const [solvedZones, setSolvedZones] = useState<ZoneId[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState<'win' | 'fail' | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverZone, setHoverZone] = useState<ZoneId | null>(null);
  const [showBrief, setShowBrief] = useState(true);
  const [storyToast, setStoryToast] = useState<string | null>(null);
  const [shakeZone, setShakeZone] = useState<ZoneId | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const itemsInZone = useCallback(
    (z: ZoneId) => ITEMS.filter((it) => locations[it.id] === z),
    [locations],
  );

  const itemsOnTable = useMemo(
    () => ITEMS.filter((it) => locations[it.id] === 'table'),
    [locations],
  );

  const showStoryFor = useCallback((id: string) => {
    const item = ITEMS.find((it) => it.id === id);
    if (!item) return;
    setStoryToast(`"${item.story}"`);
    setTimeout(() => setStoryToast((s) => (s === `"${item.story}"` ? null : s)), 3500);
  }, []);

  const handlePointerDown = useCallback(
    (id: string, e: React.PointerEvent<HTMLDivElement>) => {
      if (done || solvedZones.includes(locations[id] as ZoneId)) return;
      e.preventDefault();
      // Don't capture — let pointermove bubble up to scene root
      const rect = e.currentTarget.getBoundingClientRect();
      dragOffset.current = {
        dx: e.clientX - rect.left - rect.width / 2,
        dy: e.clientY - rect.top - rect.height / 2,
      };
      setDraggingId(id);
      setDragPos({ x: e.clientX, y: e.clientY });
    },
    [done, solvedZones, locations],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingId) return;
      setDragPos({ x: e.clientX, y: e.clientY });
      // detect hovered zone — bigger, more forgiving zones
      const sceneRect = sceneRef.current?.getBoundingClientRect();
      if (!sceneRect) return;
      const xPct = (e.clientX - sceneRect.left) / sceneRect.width;
      const yPct = (e.clientY - sceneRect.top) / sceneRect.height;
      let hover: ZoneId | null = null;
      if (xPct < 0.25 && yPct < 0.55) hover = 'before';
      else if (xPct > 0.75 && yPct < 0.55) hover = 'night';
      else if (xPct < 0.25 && yPct > 0.55) hover = 'gift';
      else if (xPct > 0.75 && yPct > 0.55) hover = 'journey';
      setHoverZone(hover);
    },
    [draggingId],
  );

  const checkZoneCompletion = useCallback(
    (z: ZoneId, items: ItemDef[]) => {
      // All 4 items in this zone, all matching this zone's category
      if (items.length !== 4) return;
      const allCorrect = items.every((it) => it.zone === z);
      if (allCorrect) {
        const next = [...solvedZones, z];
        setSolvedZones(next);
        if (next.length === 4) {
          setTimeout(() => setDone('win'), 700);
        }
      } else {
        // Send misplaced items back to table
        setShakeZone(z);
        setTimeout(() => setShakeZone(null), 400);
        setLocations((prev) => {
          const next = { ...prev };
          for (const it of items) {
            if (it.zone !== z) next[it.id] = 'table';
          }
          return next;
        });
        const m = mistakes + 1;
        setMistakes(m);
        if (m >= MAX_MISTAKES) setTimeout(() => setDone('fail'), 600);
      }
    },
    [solvedZones, mistakes],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!draggingId) return;
      const id = draggingId;
      const targetZone = hoverZone;
      setDraggingId(null);
      setDragPos(null);
      setHoverZone(null);

      // Tap (no actual drag distance) → show story
      const sceneRect = sceneRef.current?.getBoundingClientRect();
      const startedFromTable = locations[id] === 'table';

      if (targetZone && !solvedZones.includes(targetZone)) {
        const newLocations = { ...locations, [id]: targetZone as Location };
        setLocations(newLocations);
        // Check zone completion
        const itemsNow = ITEMS.filter((it) => newLocations[it.id] === targetZone);
        if (itemsNow.length === 4) {
          checkZoneCompletion(targetZone, itemsNow);
        }
      } else if (!targetZone && startedFromTable) {
        // Click without drag = show story
        showStoryFor(id);
      } else if (!targetZone && !startedFromTable) {
        // Drag back to table from a zone (only if zone not yet solved)
        const fromZone = locations[id] as ZoneId;
        if (!solvedZones.includes(fromZone)) {
          setLocations((prev) => ({ ...prev, [id]: 'table' }));
        }
      }
    },
    [draggingId, hoverZone, locations, solvedZones, checkZoneCompletion, showStoryFor],
  );

  return (
    <div
      ref={sceneRef}
      className="relative min-h-[100dvh] w-full overflow-hidden"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        background:
          "radial-gradient(ellipse at 50% 40%, rgba(80,55,32,0.6) 0%, rgba(20,12,8,0.95) 80%), #0a0604",
      }}
    >
      {/* Wood-grain table texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 800'%3E%3Cfilter id='w'%3E%3CfeTurbulence baseFrequency='0.014 0.45' numOctaves='3'/%3E%3CfeColorMatrix values='0 0 0 0 0.36  0 0 0 0 0.22  0 0 0 0 0.13  0 0 0 1 0'/%3E%3C/filter%3E%3Crect width='800' height='800' filter='url(%23w)'/%3E%3C/svg%3E\")",
          backgroundSize: 'cover',
        }}
      />

      {/* Edge vignette + lamp glow from above */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 5%, rgba(255,200,120,0.22) 0%, transparent 30%), radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0,0,0,0.78) 95%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 px-6 pt-5 text-center" dir="rtl">
        <p className="font-fredoka text-[11px] uppercase tracking-[0.4em]" style={{ color: 'rgba(220,200,180,0.4)' }}>
          המרתף של קאל · השולחן
        </p>
        <h2
          className="mt-1 font-fredoka text-2xl font-black"
          style={{ color: 'rgba(255,225,180,0.92)', textShadow: '2px 2px 0 #000' }}
        >
          {done === 'win' ? 'הסיפור הורכב.' : done === 'fail' ? 'הזיכרון נמלט.' : 'סדר לפי משפחה'}
        </h2>
        {!done && (
          <div className="mt-2 flex items-center justify-center gap-3 text-xs font-bold" dir="rtl">
            <span style={{ color: solvedZones.length === 4 ? 'rgba(255,200,120,0.95)' : 'rgba(220,200,180,0.6)' }}>
              {solvedZones.length} / 4 קבוצות
            </span>
            <span className="text-white">·</span>
            <span style={{ color: mistakes >= 3 ? 'rgba(255,80,80,0.9)' : 'rgba(220,200,180,0.6)' }}>
              {mistakes} / {MAX_MISTAKES} טעויות
            </span>
          </div>
        )}
      </div>

      {/* 4 corner drop zones */}
      {(['before', 'night', 'gift', 'journey'] as ZoneId[]).map((z) => (
        <DropZone
          key={z}
          zone={z}
          items={itemsInZone(z)}
          solved={solvedZones.includes(z)}
          hover={hoverZone === z && !!draggingId}
          shake={shakeZone === z}
        />
      ))}

      {/* Items on table */}
      <div className="absolute inset-x-0 top-[18%] bottom-[6%]">
        {itemsOnTable.map((it) => (
          <ItemOnTable
            key={it.id}
            item={it}
            isDragging={draggingId === it.id}
            dragPos={draggingId === it.id ? dragPos : null}
            offset={dragOffset.current}
            onPointerDown={(e) => handlePointerDown(it.id, e)}
          />
        ))}
      </div>

      {/* Items in zones (rendered inside DropZone via reference)... actually let's render them here too */}
      {(['before', 'night', 'gift', 'journey'] as ZoneId[]).flatMap((z) =>
        itemsInZone(z).map((it) => (
          <ItemInZone
            key={it.id}
            item={it}
            zone={z}
            indexInZone={itemsInZone(z).indexOf(it)}
            isDragging={draggingId === it.id}
            dragPos={draggingId === it.id ? dragPos : null}
            offset={dragOffset.current}
            locked={solvedZones.includes(z)}
            onPointerDown={(e) => handlePointerDown(it.id, e)}
          />
        )),
      )}

      {/* Story toast */}
      {storyToast && (
        <div className="pointer-events-none absolute inset-x-0 top-[14%] z-30 flex justify-center px-6" dir="rtl">
          <p
            className="rounded-md border-2 border-amber-300/40 bg-[#1a0e08]/90 px-4 py-2 font-rubik text-base"
            style={{
              color: 'rgba(255,225,180,0.95)',
              textShadow: '0 0 12px rgba(255,140,60,0.4)',
              animation: 'wv-toast 3.5s ease-out forwards',
            }}
          >
            {storyToast}
          </p>
        </div>
      )}

      {/* Pause */}
      <button
        type="button"
        onClick={onExit}
        aria-label="חזרה"
        className="absolute left-3 top-3 z-30 rounded border border-white/10 px-2 py-1 text-xs text-white hover:text-white"
      >
        ←
      </button>

      {/* Brief overlay */}
      {showBrief && !done && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/85 px-6">
          <div
            className="w-full max-w-md rounded-md border-4 border-amber-300 p-6 text-center shadow-[6px_6px_0_0_#000]"
            style={{ background: 'linear-gradient(180deg, #2a1f14 0%, #1a1208 100%)' }}
            dir="rtl"
          >
            <p className="font-fredoka text-xs uppercase tracking-[0.4em] text-amber-200/60">
              המרתף של קאל
            </p>
            <h2 className="mt-2 font-fredoka text-3xl font-black text-amber-200" style={{ textShadow: '2px 2px 0 #000' }}>
              ארבע משפחות. סיפור אחד.
            </h2>
            <p className="mt-4 font-rubik text-base leading-relaxed text-white">
              ששה־עשר דברים על השולחן. קאל הסתיר בהם את הסיפור שלו —
              מה היה <em>לפני</em>, מה קרה <em>בלילה</em>, מה הוא <em>נתן</em>,
              ומה <em>מלו</em> מוצא בדרך.
            </p>
            <p className="mt-4 font-rubik text-sm text-white">
              גרור כל פריט לפינה הנכונה. ארבעה בכל פינה. טעות ארבע פעמים — והסיפור נשרף.
            </p>
            <p className="mt-3 font-rubik text-xs text-amber-300/70">
              לחץ ארוך על פריט לקרוא את סיפורו.
            </p>
            <button
              type="button"
              onClick={() => setShowBrief(false)}
              className="mt-6 rounded-md border-4 border-amber-300 bg-amber-200 px-6 py-2 font-fredoka text-lg font-black text-[#1a0e08] shadow-[3px_3px_0_0_#000] transition active:translate-y-[2px] active:shadow-[1px_1px_0_0_#000]"
            >
              להתחיל
            </button>
          </div>
        </div>
      )}

      {/* Win overlay */}
      {done === 'win' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(255,200,120,0.4) 0%, rgba(11,18,32,0.96) 70%)',
            animation: 'wv-bloom 1.4s ease-out forwards',
          }}
        >
          <p className="font-rubik text-sm tracking-wide text-white" dir="rtl">
            ארבע מילים. בסדר.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-3" dir="rtl">
            {(['before', 'night', 'gift', 'journey'] as ZoneId[]).map((z) => (
              <span
                key={z}
                className="rounded-md border-4 px-4 py-2 font-fredoka text-2xl font-black shadow-[3px_3px_0_0_#000]"
                style={{ color: ZONES[z].ink, background: ZONES[z].bg, borderColor: ZONES[z].border }}
              >
                {ZONES[z].word}
              </span>
            ))}
          </div>
          <p
            className="mt-6 max-w-md font-fredoka text-xl font-bold leading-relaxed"
            style={{
              color: 'rgba(255,225,160,0.95)',
              textShadow: '2px 2px 0 #000, 0 0 20px rgba(255,140,60,0.65)',
            }}
            dir="rtl"
          >
            “{FINAL_LINE_HE}”
          </p>
          <p className="mt-2 font-rubik text-xs text-white" dir="rtl">{FINAL_PHRASE_HE}</p>
          <button
            type="button"
            onClick={onSolved}
            className="mt-8 rounded-md border-4 border-amber-300 bg-amber-200 px-8 py-3 font-fredoka text-xl font-black text-[#1a0e08] shadow-[4px_4px_0_0_#000] transition active:translate-y-[2px] active:shadow-[2px_2px_0_0_#000]"
          >
            המשך &nbsp;→
          </button>
        </div>
      )}

      {/* Fail overlay */}
      {done === 'fail' && (
        <div
          className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-6 px-6 text-center"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(60,20,20,0.6) 0%, rgba(0,0,0,0.95) 70%)',
            animation: 'wv-bloom 1.2s ease-out forwards',
          }}
        >
          <p className="font-fredoka text-2xl font-black text-pink-300" dir="rtl">הסיפור נשרף.</p>
          <p className="max-w-md font-rubik text-base text-white" dir="rtl">
            פעם אחרת, קאל. אולי הפעם תקשיב לכלים יותר.
          </p>
          <button
            type="button"
            onClick={() => {
              setLocations(Object.fromEntries(ITEMS.map((it) => [it.id, 'table' as Location])));
              setSolvedZones([]);
              setMistakes(0);
              setDone(null);
            }}
            className="rounded-md border-4 border-pink-300 bg-pink-300 px-6 py-2 font-fredoka text-lg font-black text-[#1a0e08] shadow-[3px_3px_0_0_#000]"
          >
            נסה שוב
          </button>
        </div>
      )}

      <style jsx global>{`
        @keyframes wv-toast {
          0% { opacity: 0; transform: translateY(8px); }
          15%, 80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-12px); }
        }
        @keyframes wv-bloom {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes wv-zoneShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-6px); }
          75% { transform: translateX(6px); }
        }
        @keyframes wv-zoneSolve {
          0% { transform: scale(1); }
          50% { transform: scale(1.06); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

function DropZone({
  zone,
  items,
  solved,
  hover,
  shake,
}: {
  zone: ZoneId;
  items: ItemDef[];
  solved: boolean;
  hover: boolean;
  shake: boolean;
}) {
  const cfg = ZONES[zone];
  const isLeft = zone === 'before' || zone === 'gift';
  const isTop = zone === 'before' || zone === 'night';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute z-0 flex flex-col items-center justify-center"
      style={{
        width: '17%',
        height: '46%',
        [isLeft ? 'left' : 'right']: '0.5%',
        [isTop ? 'top' : 'bottom']: '14%',
        animation: shake
          ? 'wv-zoneShake 0.4s'
          : solved
          ? 'wv-zoneSolve 0.7s ease-out'
          : undefined,
      }}
    >
      {/* Chalk circle / cloth */}
      <div
        className="relative flex h-full w-full flex-col items-center justify-center rounded-[28px] border-2 border-dashed transition-all"
        style={{
          background: solved
            ? `linear-gradient(180deg, ${cfg.bg}aa 0%, ${cfg.border}cc 100%)`
            : hover
            ? 'rgba(255,200,120,0.12)'
            : 'rgba(0,0,0,0.32)',
          borderColor: solved
            ? cfg.border
            : hover
            ? 'rgba(255,200,120,0.6)'
            : 'rgba(255,255,255,0.18)',
          boxShadow: solved
            ? `0 0 36px ${cfg.bg}99, inset 0 1px 0 rgba(255,255,255,0.2)`
            : hover
            ? '0 0 28px rgba(255,180,80,0.35)'
            : 'inset 0 0 30px rgba(0,0,0,0.6)',
        }}
      >
        {!solved && (
          <span
            className="font-fredoka text-3xl font-black"
            style={{ color: 'rgba(255,255,255,0.18)', textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}
            dir="rtl"
          >
            ?
          </span>
        )}

        {solved && (
          <div className="z-10 flex flex-col items-center" dir="rtl">
            <span
              className="font-fredoka text-2xl font-black"
              style={{ color: cfg.ink, textShadow: '2px 2px 0 rgba(0,0,0,0.4)' }}
            >
              {cfg.word}
            </span>
            <span
              className="mt-1 px-2 text-center font-rubik text-[10px] font-bold leading-tight"
              style={{ color: cfg.ink, opacity: 0.85 }}
            >
              {cfg.gloss}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function ItemOnTable({
  item,
  isDragging,
  dragPos,
  offset,
  onPointerDown,
}: {
  item: ItemDef;
  isDragging: boolean;
  dragPos: { x: number; y: number } | null;
  offset: { dx: number; dy: number };
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const styleBase: React.CSSProperties = isDragging && dragPos
    ? {
        position: 'fixed',
        left: dragPos.x - offset.dx,
        top: dragPos.y - offset.dy,
        transform: `translate(-50%, -50%) rotate(0deg) scale(1.06)`,
        zIndex: 60,
        cursor: 'grabbing',
      }
    : {
        position: 'absolute',
        left: `${item.x * 100}%`,
        top: `${item.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${item.rot}deg)`,
        cursor: 'grab',
      };

  return (
    <ItemTile
      item={item}
      style={styleBase}
      onPointerDown={onPointerDown}
      faded={false}
    />
  );
}

function ItemInZone({
  item,
  zone,
  indexInZone,
  isDragging,
  dragPos,
  offset,
  locked,
  onPointerDown,
}: {
  item: ItemDef;
  zone: ZoneId;
  indexInZone: number;
  isDragging: boolean;
  dragPos: { x: number; y: number } | null;
  offset: { dx: number; dy: number };
  locked: boolean;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
}) {
  const isLeft = zone === 'before' || zone === 'gift';
  const isTop = zone === 'before' || zone === 'night';
  // Inside zone: 2x2 mini grid
  const col = indexInZone % 2;
  const row = Math.floor(indexInZone / 2);
  const slotX = isLeft ? 4 + col * 7 : 89 + col * 7;
  const slotY = isTop ? 22 + row * 18 : 56 + row * 18;

  const styleBase: React.CSSProperties = isDragging && dragPos
    ? {
        position: 'fixed',
        left: dragPos.x - offset.dx,
        top: dragPos.y - offset.dy,
        transform: 'translate(-50%, -50%) rotate(0deg) scale(1.06)',
        zIndex: 60,
        cursor: locked ? 'default' : 'grabbing',
      }
    : {
        position: 'absolute',
        left: `${slotX}%`,
        top: `${slotY}%`,
        transform: 'translate(-50%, -50%) rotate(0deg)',
        cursor: locked ? 'default' : 'grab',
        transition: 'left 0.4s, top 0.4s',
        zIndex: 5,
      };

  return (
    <ItemTile
      item={item}
      style={styleBase}
      onPointerDown={(e) => {
        if (locked) return;
        onPointerDown(e);
      }}
      faded={locked}
      compact
    />
  );
}

function ItemTile({
  item,
  style,
  onPointerDown,
  faded,
  compact,
}: {
  item: ItemDef;
  style: React.CSSProperties;
  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => void;
  faded: boolean;
  compact?: boolean;
}) {
  const glyphSize = compact ? 56 : 76;
  // Generous hit area without visible card frame
  const hitW = compact ? 78 : 108;
  const hitH = compact ? 96 : 128;
  return (
    <div
      onPointerDown={onPointerDown}
      style={{ ...style, width: hitW, height: hitH, touchAction: 'none' }}
      className="group select-none"
    >
      <div
        className="relative flex h-full w-full flex-col items-center justify-end"
        style={{ opacity: faded ? 0.7 : 1 }}
      >
        {/* drop shadow under the object — grounds it on the table */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{
            left: '50%',
            bottom: 18,
            width: glyphSize * 1.05,
            height: 14,
            transform: 'translateX(-50%)',
            background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.65) 0%, transparent 70%)',
            filter: 'blur(2px)',
          }}
        />

        {/* the object itself */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: glyphSize,
            height: glyphSize,
            filter: faded ? 'saturate(0.7) brightness(0.9)' : 'drop-shadow(2px 4px 4px rgba(0,0,0,0.6))',
          }}
        >
          <ItemGlyph kind={item.glyph} size={glyphSize} />
        </div>

        {/* small floating label (no card!) */}
        <span
          className="pointer-events-none mt-1 whitespace-nowrap rounded px-1.5 py-0.5 font-rubik font-bold tracking-wide"
          style={{
            color: 'rgba(255,235,200,0.95)',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(2px)',
            fontSize: compact ? 10 : 11,
            textShadow: '0 1px 1px rgba(0,0,0,0.95)',
          }}
        >
          {item.labelHe}
        </span>
      </div>
    </div>
  );
}

function ItemGlyph({ kind, size = 56 }: { kind: GlyphKind; size?: number }) {
  // colors — richer materials
  const ink = '#1a0e08';
  const inkSoft = '#5a3a22';
  const wood = '#7a5028';
  const woodDark = '#3a2010';
  const cloth = '#c4a878';
  const paper = '#f0deb8';
  const paperDark = '#a08868';
  const metal = '#9c8a6e';
  const metalDark = '#5a4d36';
  const sw = 1.8;
  const f = 'none';

  switch (kind) {
    case 'photo':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* polaroid frame */}
          <rect x="6" y="8" width="52" height="50" rx="2" fill={paper} stroke={ink} strokeWidth={sw + 0.5}/>
          <rect x="9" y="11" width="46" height="36" fill="#2a3a4a"/>
          {/* 5 cube silhouettes huddled, like family photo */}
          <rect x="13" y="34" width="9" height="9" rx="1" fill={inkSoft} opacity="0.6"/>
          <rect x="22" y="30" width="9" height="13" rx="1" fill={inkSoft} opacity="0.85"/>
          <rect x="30" y="26" width="11" height="17" rx="1" fill="#f5d4a0" opacity="1"/>
          <rect x="40" y="30" width="9" height="13" rx="1" fill={inkSoft} opacity="0.85"/>
          <rect x="48" y="34" width="9" height="9" rx="1" fill={inkSoft} opacity="0.6"/>
          {/* shimmer */}
          <line x1="9" y1="14" x2="55" y2="14" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
          {/* tape/corner */}
          <path d="M2 6 L14 4 L12 12 L2 12 Z" fill="rgba(220,180,120,0.5)" stroke={ink} strokeWidth="0.5"/>
        </svg>
      );
    case 'apron':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* neck strap */}
          <path d="M22 8 Q22 14 26 16 M42 8 Q42 14 38 16" fill="none" stroke={ink} strokeWidth={sw + 0.5} strokeLinecap="round"/>
          {/* bib top */}
          <path d="M22 8 L22 18 L42 18 L42 8 Z" fill={cloth} stroke={ink} strokeWidth={sw}/>
          {/* main body — apron flares out */}
          <path d="M18 18 Q14 32 16 56 L48 56 Q50 32 46 18 Z" fill={cloth} stroke={ink} strokeWidth={sw + 0.4} strokeLinejoin="round"/>
          {/* waist tie */}
          <path d="M14 32 L4 28 L4 36 L14 36 Z" fill="#a08868" stroke={ink} strokeWidth={sw}/>
          <path d="M50 32 L60 28 L60 36 L50 36 Z" fill="#a08868" stroke={ink} strokeWidth={sw}/>
          {/* pocket */}
          <rect x="24" y="38" width="16" height="10" rx="1" fill="none" stroke={ink} strokeWidth="1"/>
          {/* stitching */}
          <line x1="20" y1="23" x2="44" y2="23" stroke={ink} strokeWidth="0.7" strokeDasharray="1.5,1.5"/>
        </svg>
      );
    case 'toy':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* teddy body */}
          <ellipse cx="32" cy="44" rx="18" ry="14" fill="#9c6a3a" stroke={ink} strokeWidth={sw + 0.5}/>
          {/* teddy head */}
          <circle cx="32" cy="22" r="14" fill="#9c6a3a" stroke={ink} strokeWidth={sw + 0.5}/>
          {/* ears */}
          <circle cx="20" cy="12" r="5" fill="#9c6a3a" stroke={ink} strokeWidth={sw}/>
          <circle cx="44" cy="12" r="5" fill="#9c6a3a" stroke={ink} strokeWidth={sw}/>
          <circle cx="20" cy="12" r="2.5" fill="#7a4a26"/>
          <circle cx="44" cy="12" r="2.5" fill="#7a4a26"/>
          {/* face */}
          <circle cx="27" cy="21" r="1.4" fill={ink}/>
          <circle cx="37" cy="21" r="1.4" fill={ink}/>
          <ellipse cx="32" cy="26" rx="2.5" ry="1.8" fill={ink}/>
          <path d="M28 30 Q32 32 36 30" fill="none" stroke={ink} strokeWidth="1.2" strokeLinecap="round"/>
          {/* loose stitching */}
          <line x1="24" y1="40" x2="40" y2="40" stroke={ink} strokeWidth="1" strokeDasharray="2,1.5"/>
          {/* missing button (sewn-on shine) */}
          <circle cx="40" cy="50" r="2" fill="#5a3a22" stroke={ink} strokeWidth="0.5"/>
        </svg>
      );
    case 'drawing':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* paper */}
          <rect x="4" y="6" width="56" height="52" rx="1" fill={paper} stroke={ink} strokeWidth={sw + 0.5}/>
          {/* sun */}
          <circle cx="48" cy="16" r="5" fill="#ffaa44"/>
          {[8,12,16,20].map((y, i) => <line key={y} x1="48" y1={y-3} x2="48" y2={y-7} stroke="#ffaa44" strokeWidth="1.5" transform={`rotate(${i*45} 48 16)`}/>)}
          {/* ground line */}
          <line x1="8" y1="48" x2="56" y2="48" stroke={ink} strokeWidth="2"/>
          {/* 5 stick figures */}
          {[12, 22, 32, 42, 52].map((cx, i) => (
            <g key={cx}>
              <circle cx={cx} cy={36} r="2.5" fill={i===2 ? "#ffd47a" : "#aaa"} stroke={ink} strokeWidth="1"/>
              <line x1={cx} y1="38" x2={cx} y2="46" stroke={ink} strokeWidth="1.5"/>
              <line x1={cx-2} y1="42" x2={cx+2} y2="42" stroke={ink} strokeWidth="1.2"/>
              <line x1={cx} y1="46" x2={cx-1.5} y2="48" stroke={ink} strokeWidth="1.2"/>
              <line x1={cx} y1="46" x2={cx+1.5} y2="48" stroke={ink} strokeWidth="1.2"/>
            </g>
          ))}
          {/* heart between two */}
          <path d="M22 32 L22 30 Q22 28 24 28 Q26 28 26 30 Q26 28 28 28 Q30 28 30 30 L30 32 L26 36 Z" fill="#cc3344" opacity="0.9"/>
          {/* signature corner */}
          <text x="8" y="56" fontSize="6" fill={ink} fontFamily="serif" fontStyle="italic">ילדה</text>
        </svg>
      );
    case 'ash':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          <ellipse cx="32" cy="48" rx="22" ry="6" fill={ink}/>
          <path d="M14 48 Q14 32 22 26 Q19 36 28 36 Q22 41 34 39 Q44 36 44 30 Q48 38 50 48" fill="#3a2818" stroke={ink} strokeWidth={sw + 0.4} strokeLinejoin="round"/>
          <ellipse cx="26" cy="34" rx="3" ry="1.2" fill="#9c5028" opacity="0.7"/>
          <ellipse cx="36" cy="30" rx="2" ry="0.8" fill="#9c5028" opacity="0.5"/>
          {[18, 26, 38, 46].map((x, i) => <circle key={x} cx={x} cy={20 - i*2} r="1" fill="#5a3a22" opacity="0.7"/>)}
          {/* glowing ember */}
          <circle cx="32" cy="42" r="2" fill="#ff6633"/>
          <circle cx="32" cy="42" r="3.5" fill="none" stroke="#ff8844" strokeWidth="0.5" opacity="0.6"/>
        </svg>
      );
    case 'bread':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* Half loaf - left side cut, right side crust */}
          <path d="M8 44 Q8 22 32 22 L32 50 L8 50 Z" fill="#e0c08a" stroke={ink} strokeWidth={sw + 0.5} strokeLinejoin="round"/>
          {/* crust top */}
          <path d="M32 22 Q56 22 56 44 L56 50 L32 50 Z" fill="#9c6a30" stroke={ink} strokeWidth={sw + 0.5} strokeLinejoin="round"/>
          {/* cut interior crumb */}
          <ellipse cx="20" cy="36" rx="10" ry="11" fill="#f0d8aa"/>
          {/* small holes in crumb */}
          {[14, 18, 22, 26].map((x, i) => <circle key={x} cx={x} cy={32 + (i%2)*4} r="1.2" fill={paperDark} opacity="0.6"/>)}
          {/* crust scoring */}
          <path d="M38 26 Q42 30 38 38" stroke={ink} strokeWidth="1.2" fill="none"/>
          <path d="M44 28 Q48 34 44 42" stroke={ink} strokeWidth="1.2" fill="none"/>
          <path d="M50 30 Q54 36 50 44" stroke={ink} strokeWidth="1.2" fill="none"/>
          {/* crumbs */}
          <circle cx="6" cy="54" r="1.2" fill="#9c6a30"/>
          <circle cx="60" cy="54" r="0.9" fill="#9c6a30"/>
        </svg>
      );
    case 'book':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* Closed leather book — the Twin Voice, warped */}
          <path d="M8 14 L52 10 L56 56 L12 58 Z" fill="#5c1818" stroke={ink} strokeWidth={sw + 0.5} strokeLinejoin="round"/>
          {/* top warped curve */}
          <path d="M8 14 Q12 10 20 12 Q28 9 40 11 Q48 8 52 10" fill="none" stroke="#1a0a04" strokeWidth="2"/>
          {/* spine ribs */}
          <line x1="14" y1="22" x2="50" y2="20" stroke={ink} strokeWidth="1"/>
          <line x1="15" y1="36" x2="51" y2="34" stroke={ink} strokeWidth="1"/>
          <line x1="16" y1="50" x2="52" y2="48" stroke={ink} strokeWidth="1"/>
          {/* embossed double-circle (the twin voice symbol) */}
          <circle cx="28" cy="32" r="6" fill="none" stroke="#9c6a30" strokeWidth="1.5"/>
          <circle cx="36" cy="32" r="6" fill="none" stroke="#9c6a30" strokeWidth="1.5"/>
          {/* ash damage */}
          <path d="M40 14 Q38 22 44 26 L48 18 Z" fill="#1a0a04" opacity="0.7"/>
          <ellipse cx="46" cy="22" rx="2" ry="1" fill="#3a1a08"/>
        </svg>
      );
    case 'cup':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* broken ceramic cup */}
          <path d="M16 16 L48 16 L42 50 L20 50 Z" fill="#e8dcc4" stroke={ink} strokeWidth={sw + 0.5} strokeLinejoin="round"/>
          {/* rim */}
          <ellipse cx="32" cy="16" rx="16" ry="3" fill="#1a0e08"/>
          <ellipse cx="32" cy="16" rx="13" ry="1.5" fill="#3a2818"/>
          {/* the crack — jagged */}
          <path d="M28 18 L32 26 L26 32 L34 38 L28 46" stroke="#1a0e08" strokeWidth="2" fill="none" strokeLinejoin="miter"/>
          {/* chip on rim */}
          <path d="M40 14 L44 16 L42 18 L40 16 Z" fill="#1a0e08"/>
          {/* handle */}
          <path d="M48 22 Q56 22 56 30 Q56 38 48 38" fill="none" stroke={ink} strokeWidth={sw + 0.5}/>
          {/* shadow / contents stain */}
          <ellipse cx="32" cy="48" rx="14" ry="2" fill={ink}/>
        </svg>
      );
    case 'letter':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* envelope */}
          <rect x="4" y="14" width="56" height="40" rx="1" fill={paper} stroke={ink} strokeWidth={sw + 0.5}/>
          {/* fold lines */}
          <path d="M4 14 L32 38 L60 14" fill="none" stroke={ink} strokeWidth={sw}/>
          <path d="M4 54 L24 36" fill="none" stroke={ink} strokeWidth="1"/>
          <path d="M60 54 L40 36" fill="none" stroke={ink} strokeWidth="1"/>
          {/* wax seal — red */}
          <circle cx="32" cy="40" r="6" fill="#9c2818" stroke="#5a1208" strokeWidth="1.5"/>
          <text x="32" y="44" fontSize="7" textAnchor="middle" fill="#3a0a04" fontWeight="bold" fontFamily="serif">ק</text>
          {/* slight aging stain */}
          <ellipse cx="14" cy="22" rx="3" ry="1.5" fill="#a08868" opacity="0.4"/>
        </svg>
      );
    case 'key':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* ornate brass key */}
          {/* bow (head) */}
          <circle cx="14" cy="32" r="11" fill="#c4944c" stroke={ink} strokeWidth={sw + 0.6}/>
          <circle cx="14" cy="32" r="7" fill="none" stroke={ink} strokeWidth={sw}/>
          {/* decorative cross inside bow */}
          <line x1="14" y1="25" x2="14" y2="39" stroke={ink} strokeWidth="1.2"/>
          <line x1="7" y1="32" x2="21" y2="32" stroke={ink} strokeWidth="1.2"/>
          {/* shaft */}
          <rect x="25" y="29" width="32" height="6" fill="#c4944c" stroke={ink} strokeWidth={sw + 0.4}/>
          {/* teeth */}
          <rect x="46" y="29" width="3" height="11" fill="#c4944c" stroke={ink} strokeWidth={sw}/>
          <rect x="51" y="29" width="3" height="14" fill="#c4944c" stroke={ink} strokeWidth={sw}/>
          {/* shaft highlight */}
          <line x1="26" y1="31" x2="56" y2="31" stroke="#f0d094" strokeWidth="1"/>
          {/* tarnish */}
          <ellipse cx="14" cy="34" rx="3" ry="2" fill="#7a5a30" opacity="0.4"/>
        </svg>
      );
    case 'bracelet':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* woven cord bracelet, child-made */}
          {/* rope outer */}
          <ellipse cx="32" cy="32" rx="22" ry="16" fill="none" stroke="#8a4a18" strokeWidth="4"/>
          <ellipse cx="32" cy="32" rx="22" ry="16" fill="none" stroke="#c47030" strokeWidth="2.5"/>
          {/* weave pattern */}
          {[0,30,60,90,120,150,180,210,240,270,300,330].map((a) => {
            const rad = (a * Math.PI) / 180;
            const rx = 22, ry = 16;
            const x1 = 32 + Math.cos(rad) * (rx - 2);
            const y1 = 32 + Math.sin(rad) * (ry - 1.5);
            const x2 = 32 + Math.cos(rad) * (rx + 2);
            const y2 = 32 + Math.sin(rad) * (ry + 1.5);
            return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5a2810" strokeWidth="1"/>;
          })}
          {/* charm beads */}
          <circle cx="32" cy="48" r="3" fill="#c4944c" stroke={ink} strokeWidth="1.2"/>
          <circle cx="20" cy="42" r="2" fill="#9c2818" stroke={ink} strokeWidth="0.8"/>
          <circle cx="44" cy="42" r="2" fill="#9c2818" stroke={ink} strokeWidth="0.8"/>
          {/* tiny heart charm */}
          <path d="M32 44 L29 47 Q27 49 30 51 L32 53 L34 51 Q37 49 35 47 Z" fill="#cc3344" stroke={ink} strokeWidth="0.8"/>
        </svg>
      );
    case 'recipe':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* worn recipe card */}
          <rect x="8" y="6" width="48" height="52" rx="1" fill={paper} stroke={ink} strokeWidth={sw + 0.5}/>
          {/* red margin line */}
          <line x1="14" y1="6" x2="14" y2="58" stroke="#9c2818" strokeWidth="1"/>
          {/* faded header */}
          <text x="34" y="16" fontSize="9" textAnchor="middle" fill={ink} fontFamily="serif" fontStyle="italic" fontWeight="bold">לחם של קאל</text>
          <line x1="18" y1="20" x2="52" y2="20" stroke={ink} strokeWidth="0.7"/>
          {/* lines */}
          {[26, 32, 38, 44, 50].map((y, i) => (
            <g key={y}>
              <line x1="18" y1={y} x2={i % 2 === 0 ? 50 : 44} y2={y} stroke={paperDark} strokeWidth="0.7"/>
              <text x="20" y={y - 1} fontSize="4" fill={ink}>·</text>
            </g>
          ))}
          {/* fingerprint stain */}
          <ellipse cx="42" cy="48" rx="3.5" ry="2.5" fill="#9c6a30" opacity="0.35"/>
          {/* dog-eared corner */}
          <path d="M52 6 L56 10 L52 10 Z" fill="#a08868"/>
        </svg>
      );
    case 'lantern':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* hanging hook */}
          <path d="M28 4 Q28 10 32 10 Q36 10 36 4" fill="none" stroke={ink} strokeWidth={sw + 0.5}/>
          <line x1="32" y1="10" x2="32" y2="14" stroke={ink} strokeWidth={sw}/>
          {/* top cap */}
          <path d="M16 14 L48 14 L44 20 L20 20 Z" fill={metal} stroke={ink} strokeWidth={sw + 0.5}/>
          {/* glass body */}
          <rect x="18" y="20" width="28" height="28" fill="rgba(255,200,100,0.3)" stroke={ink} strokeWidth={sw + 0.5}/>
          {/* metal frames */}
          <line x1="20" y1="20" x2="20" y2="48" stroke={metalDark} strokeWidth="2"/>
          <line x1="44" y1="20" x2="44" y2="48" stroke={metalDark} strokeWidth="2"/>
          <line x1="32" y1="20" x2="32" y2="48" stroke={metalDark} strokeWidth="1.5"/>
          {/* flame inside */}
          <ellipse cx="32" cy="34" rx="3" ry="6" fill="#ffaa44"/>
          <ellipse cx="32" cy="32" rx="2" ry="4" fill="#ffd47a"/>
          <ellipse cx="32" cy="30" rx="1" ry="2" fill="#fff5d8"/>
          {/* glass shine */}
          <line x1="22" y1="24" x2="22" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5"/>
          {/* base */}
          <path d="M14 48 L50 48 L46 54 L18 54 Z" fill={metal} stroke={ink} strokeWidth={sw + 0.5}/>
        </svg>
      );
    case 'coin':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* gold coin tilted */}
          <ellipse cx="32" cy="38" rx="4" ry="2" fill={ink} opacity="0.5"/>
          <circle cx="32" cy="32" r="22" fill="#e8b850" stroke={ink} strokeWidth={sw + 0.7}/>
          <circle cx="32" cy="32" r="22" fill="url(#coinGrad)" opacity="0.6"/>
          <defs>
            <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fff5d8"/>
              <stop offset="100%" stopColor="#9c6a14"/>
            </linearGradient>
          </defs>
          <circle cx="32" cy="32" r="17" fill="none" stroke={ink} strokeWidth="1.5"/>
          {/* engraved letter ק */}
          <text x="32" y="40" fontSize="22" textAnchor="middle" fill={ink} fontWeight="900" fontFamily="serif">ק</text>
          {/* shine */}
          <ellipse cx="22" cy="22" rx="6" ry="3" fill="rgba(255,255,255,0.5)" transform="rotate(-30 22 22)"/>
        </svg>
      );
    case 'map':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* aged map with frayed corners */}
          <path d="M6 12 Q4 10 8 8 L18 6 Q26 10 32 8 L40 12 L52 6 L58 8 Q62 10 60 14 L58 50 Q62 54 58 56 L46 58 Q40 54 32 56 L20 58 L8 56 Q4 54 6 52 Z" fill="#e6d2a8" stroke={ink} strokeWidth={sw + 0.5} strokeLinejoin="round"/>
          {/* fold lines */}
          <line x1="22" y1="6" x2="22" y2="58" stroke={paperDark} strokeWidth="0.6" opacity="0.6"/>
          <line x1="42" y1="6" x2="42" y2="58" stroke={paperDark} strokeWidth="0.6" opacity="0.6"/>
          <line x1="6" y1="32" x2="60" y2="32" stroke={paperDark} strokeWidth="0.6" opacity="0.6"/>
          {/* terrain/passages */}
          <path d="M14 22 Q22 18 28 22 Q36 26 42 20 Q48 14 54 18" fill="none" stroke={ink} strokeWidth="1.3" strokeDasharray="2,1.5"/>
          <path d="M16 38 Q22 42 30 38 Q40 32 50 40" fill="none" stroke={ink} strokeWidth="1.3" strokeDasharray="2,1.5"/>
          {/* X marks the spot */}
          <text x="42" y="46" fontSize="14" fill="#9c2818" fontWeight="bold" textAnchor="middle">×</text>
          <circle cx="42" cy="42" r="4" fill="none" stroke="#9c2818" strokeWidth="1.5"/>
          {/* compass rose */}
          <circle cx="14" cy="50" r="4" fill="none" stroke={ink} strokeWidth="1"/>
          <line x1="14" y1="46" x2="14" y2="54" stroke={ink} strokeWidth="1"/>
          <line x1="10" y1="50" x2="18" y2="50" stroke={ink} strokeWidth="1"/>
        </svg>
      );
    case 'stone':
      return (
        <svg width={size} height={size} viewBox="0 0 64 64" style={{ filter: f }}>
          {/* irregular stone with faceted shape */}
          <path d="M14 44 Q8 36 12 26 Q18 14 28 12 Q44 10 52 22 Q56 34 50 44 Q42 54 28 52 Q18 50 14 44 Z" fill={inkSoft} stroke={ink} strokeWidth={sw + 0.5} strokeLinejoin="round"/>
          {/* facet shadows */}
          <path d="M14 44 Q22 38 28 30 Q32 28 28 12" fill="rgba(0,0,0,0.3)" opacity="0.4"/>
          <path d="M52 22 Q44 28 38 36 Q34 42 50 44" fill="rgba(0,0,0,0.4)" opacity="0.4"/>
          {/* crystalline highlights */}
          <ellipse cx="22" cy="22" rx="4" ry="2" fill="#f5e6c4" opacity="0.5" transform="rotate(-25 22 22)"/>
          <ellipse cx="42" cy="20" rx="3" ry="1.5" fill="#f5e6c4" opacity="0.4" transform="rotate(20 42 20)"/>
          {/* embedded ember/glow */}
          <circle cx="34" cy="34" r="4" fill="#ff6633"/>
          <circle cx="34" cy="34" r="6" fill="none" stroke="#ff8844" strokeWidth="0.8" opacity="0.5"/>
          <circle cx="34" cy="34" r="2" fill="#ffcc66"/>
        </svg>
      );
  }
}
