/**
 * Avatar Eye Parts — Fantasy
 * Whimsical/sci-fi variants: star, sparkle, hearts, cyclops, dizzy, laser, hypno, money, alien, galaxy, flame, robot, void, infinity
 */

import { STROKE_INNER } from './avatarDesignConstants';
import { useAvatarUid } from '../AvatarUidContext';
import { useEyeColor, useEyeColorDark } from '../AvatarEyeColorContext';

const S = STROKE_INNER;

export function Star() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}starEyeGrad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF176" />
          <stop offset="100%" stopColor="#FFB300" />
        </linearGradient>
      </defs>
      <polygon points="38,37 39.5,40.5 43,41 40.5,43.5 41,47 38,45 35,47 35.5,43.5 33,41 36.5,40.5" fill={`url(#${u}starEyeGrad)`} stroke="#000" strokeWidth={S} />
      <polygon points="62,37 63.5,40.5 67,41 64.5,43.5 65,47 62,45 59,47 59.5,43.5 57,41 60.5,40.5" fill={`url(#${u}starEyeGrad)`} stroke="#000" strokeWidth={S} />
      <polygon points="38,39.5 38.8,41 40,41.3 39,42.3 39.2,43.5 38,42.8 36.8,43.5 37,42.3 36,41.3 37.2,41" fill="#fff" opacity="0.45" />
      <polygon points="62,39.5 62.8,41 64,41.3 63,42.3 63.2,43.5 62,42.8 60.8,43.5 61,42.3 60,41.3 61.2,41" fill="#fff" opacity="0.45" />
    </g>
  );
}

export function Sparkle() {
  const ec = useEyeColor();
  return (
    <g>
      <circle cx="38" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <path d="M31 39 Q38 35 45 39" fill="#000" opacity="0.05" />
      <path d="M55 39 Q62 35 69 39" fill="#000" opacity="0.05" />
      <circle cx="39" cy="41" r="4" fill={ec} />
      <circle cx="63" cy="41" r="4" fill={ec} />
      <circle cx="39" cy="42.5" r="3.5" fill="#3A5080" opacity="0.3" />
      <circle cx="63" cy="42.5" r="3.5" fill="#3A5080" opacity="0.3" />
      <circle cx="39" cy="41" r="2.5" fill="#000" />
      <circle cx="63" cy="41" r="2.5" fill="#000" />
      <circle cx="36" cy="39" r="2" fill="#fff" />
      <circle cx="60" cy="39" r="2" fill="#fff" />
      <circle cx="41" cy="43" r="1" fill="#fff" />
      <circle cx="65" cy="43" r="1" fill="#fff" />
      <circle cx="37" cy="44" r="0.5" fill="#fff" opacity="0.7" />
      <circle cx="61" cy="44" r="0.5" fill="#fff" opacity="0.7" />
      <path d="M34 37 L34.5 35.5 L35 37 L36.5 37.5 L35 38 L34.5 39.5 L34 38 L32.5 37.5Z" fill="#FFE135" stroke="#FFC107" strokeWidth={0.3} />
      <path d="M66 37 L66.5 35.5 L67 37 L68.5 37.5 L67 38 L66.5 39.5 L66 38 L64.5 37.5Z" fill="#FFE135" stroke="#FFC107" strokeWidth={0.3} />
      <path d="M43 36 L43.3 35.2 L43.6 36 L44.4 36.3 L43.6 36.6 L43.3 37.4 L43 36.6 L42.2 36.3Z" fill="#FFE135" opacity="0.6" />
      <path d="M57 36 L57.3 35.2 L57.6 36 L58.4 36.3 L57.6 36.6 L57.3 37.4 L57 36.6 L56.2 36.3Z" fill="#FFE135" opacity="0.6" />
    </g>
  );
}

export function Hearts() {
  return (
    <g>
      <circle cx="38" cy="42" r="8" fill="#FF1493" opacity="0.1" />
      <circle cx="62" cy="42" r="8" fill="#FF1493" opacity="0.1" />
      <path d="M38 38 C36 35 32 35 32 39 C32 43 38 46 38 46 C38 46 44 43 44 39 C44 35 40 35 38 38Z" fill="#FF1493" stroke="#000" strokeWidth={S} />
      <path d="M62 38 C60 35 56 35 56 39 C56 43 62 46 62 46 C62 46 68 43 68 39 C68 35 64 35 62 38Z" fill="#FF1493" stroke="#000" strokeWidth={S} />
      <path d="M36 37.5 C35 36.5 33.5 37 34 38.5" fill="none" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity="0.6" />
      <path d="M60 37.5 C59 36.5 57.5 37 58 38.5" fill="none" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity="0.6" />
    </g>
  );
}

export function Dizzy() {
  return (
    <g>
      <circle cx="38" cy="42" r="6" fill="none" stroke="#000" strokeWidth={0.8} strokeDasharray="2 2" opacity="0.3" />
      <circle cx="62" cy="42" r="6" fill="none" stroke="#000" strokeWidth={0.8} strokeDasharray="2 2" opacity="0.3" />
      <g transform="translate(38,42) rotate(15)"><line x1="-4" y1="-4" x2="4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /><line x1="4" y1="-4" x2="-4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /></g>
      <g transform="translate(62,42) rotate(-15)"><line x1="-4" y1="-4" x2="4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /><line x1="4" y1="-4" x2="-4" y2="4" stroke="#000" strokeWidth={S} strokeLinecap="round" /></g>
      <path d="M32 38 Q34 36 33 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <path d="M44 38 Q42 36 43 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <path d="M56 38 Q58 36 57 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
      <path d="M68 38 Q66 36 67 39" fill="none" stroke="#000" strokeWidth={0.8} opacity="0.4" />
    </g>
  );
}

export function Cyclops() {
  const u = useAvatarUid();
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}cyclopsIris`} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor={ec} />
          <stop offset="100%" stopColor={ecd} />
        </radialGradient>
        <radialGradient id={`${u}cyclopsSclera`} cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#fff" />
          <stop offset="100%" stopColor="#E5E7EB" />
        </radialGradient>
      </defs>
      <path d="M42 38 Q50 35 58 38" fill="none" stroke="#000" strokeWidth={S} strokeLinecap="round" />
      <circle cx="50" cy="42" r="8" fill={`url(#${u}cyclopsSclera)`} stroke="#000" strokeWidth={S} />
      <circle cx="51" cy="41" r="5" fill={`url(#${u}cyclopsIris)`} />
      <circle cx="51" cy="41" r="3" fill="#000" />
      <circle cx="48.5" cy="39" r="2" fill="#fff" />
      <circle cx="52" cy="43" r="0.8" fill="#fff" opacity="0.5" />
    </g>
  );
}

export function Laser() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}laserCore`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFD6D6" />
          <stop offset="45%" stopColor="#FF3333" />
          <stop offset="100%" stopColor="#8B0000" />
        </radialGradient>
        <radialGradient id={`${u}laserHalo`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF0000" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#FF0000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="42" r="8" fill={`url(#${u}laserHalo)`} />
      <circle cx="62" cy="42" r="8" fill={`url(#${u}laserHalo)`} />
      <circle cx="38" cy="42" r="5" fill={`url(#${u}laserCore)`} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="5" fill={`url(#${u}laserCore)`} stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="42" r="2" fill="#FFD700" />
      <circle cx="62" cy="42" r="2" fill="#FFD700" />
      <circle cx="38" cy="42" r="0.8" fill="#fff" />
      <circle cx="62" cy="42" r="0.8" fill="#fff" />
      <polygon points="33,40.5 10,41.5 10,42.5 33,43.5" fill="#FF0000" opacity="0.5" />
      <polygon points="67,40.5 90,41.5 90,42.5 67,43.5" fill="#FF0000" opacity="0.5" />
      <line x1="33" y1="42" x2="10" y2="42" stroke="#FF6666" strokeWidth={1} opacity="0.8" />
      <line x1="67" y1="42" x2="90" y2="42" stroke="#FF6666" strokeWidth={1} opacity="0.8" />
      <circle cx="20" cy="42" r="1.5" fill="none" stroke="#FF0000" strokeWidth={0.5} opacity="0.4" />
      <circle cx="80" cy="42" r="1.5" fill="none" stroke="#FF0000" strokeWidth={0.5} opacity="0.4" />
    </g>
  );
}

export function Hypno() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}hypnoBg`} cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#F5F3FF" />
          <stop offset="100%" stopColor="#C4B5FD" />
        </radialGradient>
        <linearGradient id={`${u}hypnoSwirl`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="42" r="7" fill={`url(#${u}hypnoBg)`} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill={`url(#${u}hypnoBg)`} stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="42" r="6" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="38" cy="42" r="4" fill="none" stroke="#D946EF" strokeWidth={1.2} />
      <circle cx="38" cy="42" r="2" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="38" cy="42" r="0.6" fill="#000" />
      <circle cx="62" cy="42" r="6" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="62" cy="42" r="4" fill="none" stroke="#D946EF" strokeWidth={1.2} />
      <circle cx="62" cy="42" r="2" fill="none" stroke="#8B5CF6" strokeWidth={1.2} />
      <circle cx="62" cy="42" r="0.6" fill="#000" />
    </g>
  );
}

export function Money() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}moneyBill`} cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#E8FF9E" />
          <stop offset="60%" stopColor="#BFFF00" />
          <stop offset="100%" stopColor="#6B8E00" />
        </radialGradient>
        <linearGradient id={`${u}moneyShine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="42" r="7" fill={`url(#${u}moneyBill)`} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill={`url(#${u}moneyBill)`} stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="42" r="7" fill={`url(#${u}moneyShine)`} />
      <circle cx="62" cy="42" r="7" fill={`url(#${u}moneyShine)`} />
      <path d="M36 39 Q36 37.5 38 37.5 Q40 37.5 40 39 Q40 40 38 40.5 Q36 41 36 42.5 Q36 44.5 38 44.5 Q40 44.5 40 43" fill="none" stroke="#228B22" strokeWidth={1.8} strokeLinecap="round" />
      <line x1="38" y1="36" x2="38" y2="46" stroke="#228B22" strokeWidth={1} />
      <path d="M60 39 Q60 37.5 62 37.5 Q64 37.5 64 39 Q64 40 62 40.5 Q60 41 60 42.5 Q60 44.5 62 44.5 Q64 44.5 64 43" fill="none" stroke="#228B22" strokeWidth={1.8} strokeLinecap="round" />
      <line x1="62" y1="36" x2="62" y2="46" stroke="#228B22" strokeWidth={1} />
      <circle cx="35" cy="39" r="1" fill="#fff" opacity="0.4" />
      <circle cx="59" cy="39" r="1" fill="#fff" opacity="0.4" />
    </g>
  );
}

export function Alien() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}alienLens`} cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#1F5A1F" />
          <stop offset="70%" stopColor="#0A2A0A" />
          <stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id={`${u}alienRim`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#66FF66" />
          <stop offset="100%" stopColor="#008800" />
        </linearGradient>
      </defs>
      <ellipse cx="38" cy="42" rx="10" ry="7.5" fill="none" stroke={`url(#${u}alienRim)`} strokeWidth={0.8} opacity="0.5" transform="rotate(-6 38 42)" />
      <ellipse cx="62" cy="42" rx="10" ry="7.5" fill="none" stroke={`url(#${u}alienRim)`} strokeWidth={0.8} opacity="0.5" transform="rotate(6 62 42)" />
      <ellipse cx="38" cy="42" rx="9" ry="6.5" fill={`url(#${u}alienLens)`} stroke="#00FF00" strokeWidth={S} transform="rotate(-6 38 42)" />
      <ellipse cx="62" cy="42" rx="9" ry="6.5" fill={`url(#${u}alienLens)`} stroke="#00FF00" strokeWidth={S} transform="rotate(6 62 42)" />
      <ellipse cx="38" cy="42" rx="8" ry="5.5" fill="none" stroke="#00FF00" strokeWidth={0.5} opacity="0.25" transform="rotate(-6 38 42)" />
      <path d="M32 40 Q35 42 32 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <path d="M44 40 Q41 42 44 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <path d="M56 40 Q59 42 56 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <path d="M68 40 Q65 42 68 44" fill="none" stroke="#00AA00" strokeWidth={0.4} opacity="0.3" />
      <ellipse cx="38" cy="42" rx="3" ry="4" fill="#00FF00" opacity="0.8" />
      <ellipse cx="62" cy="42" rx="3" ry="4" fill="#00FF00" opacity="0.8" />
      <ellipse cx="38" cy="42" rx="1.5" ry="3" fill="#88FF88" opacity="0.4" />
      <ellipse cx="62" cy="42" rx="1.5" ry="3" fill="#88FF88" opacity="0.4" />
      <circle cx="36" cy="39.5" r="1.5" fill="#fff" opacity="0.4" />
      <circle cx="60" cy="39.5" r="1.5" fill="#fff" opacity="0.4" />
    </g>
  );
}

export function Galaxy() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}galaxyEyeGrad`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E040FB" />
          <stop offset="50%" stopColor="#7C4DFF" />
          <stop offset="100%" stopColor="#1A237E" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="42" r="7" fill={`url(#${u}galaxyEyeGrad)`} stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill={`url(#${u}galaxyEyeGrad)`} stroke="#000" strokeWidth={S} />
      <path d="M34 40 Q38 38 42 40" fill="none" stroke="#E040FB" strokeWidth={0.6} opacity="0.3">
        <animateTransform attributeName="transform" type="rotate" from="0 38 42" to="360 38 42" dur="15s" repeatCount="indefinite" />
      </path>
      <path d="M58 40 Q62 38 66 40" fill="none" stroke="#00BCD4" strokeWidth={0.6} opacity="0.3">
        <animateTransform attributeName="transform" type="rotate" from="0 62 42" to="-360 62 42" dur="15s" repeatCount="indefinite" />
      </path>
      <circle cx="36" cy="40" r="0.8" fill="#fff"><animate attributeName="opacity" values="0.7;0.15;0.7" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="40" cy="43" r="0.5" fill="#fff"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="5s" begin="1.5s" repeatCount="indefinite" /></circle>
      <circle cx="60" cy="40" r="0.8" fill="#fff"><animate attributeName="opacity" values="0.7;0.15;0.7" dur="4.5s" begin="1s" repeatCount="indefinite" /></circle>
      <circle cx="64" cy="43" r="0.5" fill="#fff"><animate attributeName="opacity" values="0.5;0.1;0.5" dur="5s" begin="2.5s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="2" fill="#fff"><animate attributeName="opacity" values="0.4;0.75;0.4" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="2" fill="#fff"><animate attributeName="opacity" values="0.4;0.75;0.4" dur="4s" begin="1.5s" repeatCount="indefinite" /></circle>
    </g>
  );
}

export function FlameEyes() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}flameEyeGrad`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#FF6D00" />
          <stop offset="50%" stopColor="#FF9100" />
          <stop offset="100%" stopColor="#FFD600" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="42" r="9" fill="#FF6D00" opacity="0.08" />
      <circle cx="62" cy="42" r="9" fill="#FF6D00" opacity="0.08" />
      <path d="M38 47 C33 43.5 33 38.5 38 36 C43 38.5 43 43.5 38 47Z" fill={`url(#${u}flameEyeGrad)`} stroke="#000" strokeWidth={S}>
        <animateTransform attributeName="transform" type="scale" values="1 1;1.01 1.04;1 1" dur="3s" repeatCount="indefinite" additive="sum" />
      </path>
      <path d="M62 47 C57 43.5 57 38.5 62 36 C67 38.5 67 43.5 62 47Z" fill={`url(#${u}flameEyeGrad)`} stroke="#000" strokeWidth={S}>
        <animateTransform attributeName="transform" type="scale" values="1 1;1.01 1.04;1 1" dur="3.5s" repeatCount="indefinite" additive="sum" />
      </path>
      <path d="M38 45 C35.5 42.5 35.5 39.5 38 38 C40.5 39.5 40.5 42.5 38 45Z" fill="#FFD600" opacity="0.6" />
      <path d="M62 45 C59.5 42.5 59.5 39.5 62 38 C64.5 39.5 64.5 42.5 62 45Z" fill="#FFD600" opacity="0.6" />
      <path d="M38 44 C37 42 37 41 38 40 C39 41 39 42 38 44Z" fill="#fff" opacity="0.7" />
      <path d="M62 44 C61 42 61 41 62 40 C63 41 63 42 62 44Z" fill="#fff" opacity="0.7" />
      <circle cx="36" cy="36" r="0.5" fill="#FFD600"><animate attributeName="cy" values="36;30;24" dur="4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.6;0.25;0" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="64" cy="35" r="0.4" fill="#FF9100"><animate attributeName="cy" values="35;28;22" dur="5s" begin="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;0.2;0" dur="5s" begin="1.5s" repeatCount="indefinite" /></circle>
    </g>
  );
}

export function Robot() {
  return (
    <g>
      <rect x="31" y="37" width="14" height="10" rx="2" fill="#0D47A1" stroke="#000" strokeWidth={S} />
      <rect x="55" y="37" width="14" height="10" rx="2" fill="#0D47A1" stroke="#000" strokeWidth={S} />
      <rect x="31" y="37" width="14" height="1.5" rx="1" fill="#1565C0" opacity="0.5" />
      <rect x="55" y="37" width="14" height="1.5" rx="1" fill="#1565C0" opacity="0.5" />
      <line x1="33" y1="38" x2="43" y2="38" stroke="#00E5FF" strokeWidth={1} opacity="0.5"><animate attributeName="y1" values="38;46;38" dur="4s" repeatCount="indefinite" /><animate attributeName="y2" values="38;46;38" dur="4s" repeatCount="indefinite" /></line>
      <line x1="57" y1="38" x2="67" y2="38" stroke="#00E5FF" strokeWidth={1} opacity="0.5"><animate attributeName="y1" values="38;46;38" dur="4s" begin="1s" repeatCount="indefinite" /><animate attributeName="y2" values="38;46;38" dur="4s" begin="1s" repeatCount="indefinite" /></line>
      <line x1="33" y1="40" x2="43" y2="40" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <line x1="33" y1="43" x2="43" y2="43" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <line x1="57" y1="40" x2="67" y2="40" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <line x1="57" y1="43" x2="67" y2="43" stroke="#00E5FF" strokeWidth={0.5} opacity="0.3" />
      <circle cx="38" cy="42" r="3" fill="#00E5FF" opacity="0.3" />
      <circle cx="62" cy="42" r="3" fill="#00E5FF" opacity="0.3" />
      <circle cx="38" cy="42" r="2" fill="#00E5FF"><animate attributeName="r" values="2;2.4;2" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="2" fill="#00E5FF"><animate attributeName="r" values="2;2.4;2" dur="3s" begin="0.7s" repeatCount="indefinite" /></circle>
      <circle cx="37" cy="41" r="0.8" fill="#fff" opacity="0.6" />
      <circle cx="61" cy="41" r="0.8" fill="#fff" opacity="0.6" />
    </g>
  );
}

export function Void() {
  const u = useAvatarUid();
  const vg = `url(#${u}voidEyeGrad)`;
  return (
    <g>
      <defs>
        <radialGradient id={`${u}voidEyeGrad`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" /><stop offset="70%" stopColor="#1A0033" /><stop offset="100%" stopColor="#4A0080" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="42" r="7" fill={vg} stroke="#4A0080" strokeWidth={S}><animate attributeName="r" values="7;7.2;7" dur="5s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="7" fill={vg} stroke="#4A0080" strokeWidth={S}><animate attributeName="r" values="7;7.2;7" dur="5s" begin="1s" repeatCount="indefinite" /></circle>
      <path d="M38 42 Q36 39 38 37 Q40 39 38 42 Q36 45 38 47" fill="none" stroke="#7C4DFF" strokeWidth={0.8} opacity="0.4"><animateTransform attributeName="transform" type="rotate" from="0 38 42" to="360 38 42" dur="12s" repeatCount="indefinite" /></path>
      <path d="M62 42 Q60 39 62 37 Q64 39 62 42 Q60 45 62 47" fill="none" stroke="#7C4DFF" strokeWidth={0.8} opacity="0.4"><animateTransform attributeName="transform" type="rotate" from="0 62 42" to="-360 62 42" dur="12s" repeatCount="indefinite" /></path>
      <circle cx="32" cy="38" r="0.5" fill="#E040FB" opacity="0.5"><animate attributeName="cx" values="32;38" dur="4s" repeatCount="indefinite" /><animate attributeName="cy" values="38;42" dur="4s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.5;0" dur="4s" repeatCount="indefinite" /></circle>
      <circle cx="68" cy="39" r="0.5" fill="#7C4DFF" opacity="0.4"><animate attributeName="cx" values="68;62" dur="5s" begin="1.5s" repeatCount="indefinite" /><animate attributeName="cy" values="39;42" dur="5s" begin="1.5s" repeatCount="indefinite" /><animate attributeName="opacity" values="0.4;0" dur="5s" begin="1.5s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="0.8" fill="#E040FB"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="0.8" fill="#E040FB"><animate attributeName="opacity" values="0.8;0.2;0.8" dur="3s" begin="1s" repeatCount="indefinite" /></circle>
    </g>
  );
}

export function Infinity() {
  const u = useAvatarUid();
  const rb = `url(#${u}infinityRainbow)`;
  const vo = `url(#${u}infinityRing1)`;
  return (
    <g>
      <defs>
        <radialGradient id={`${u}infinityRing1`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#000" /><stop offset="30%" stopColor="#1A0033" /><stop offset="60%" stopColor="#4A00E0" /><stop offset="100%" stopColor="#000" />
        </radialGradient>
        <linearGradient id={`${u}infinityRainbow`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF0000"><animate attributeName="stopColor" values="#FF0000;#FF8C00;#00FF88;#0088FF;#8B00FF;#FF0000" dur="4s" repeatCount="indefinite" /></stop>
          <stop offset="33%" stopColor="#00FF88"><animate attributeName="stopColor" values="#00FF88;#0088FF;#8B00FF;#FF0000;#FF8C00;#00FF88" dur="4s" repeatCount="indefinite" /></stop>
          <stop offset="66%" stopColor="#0088FF"><animate attributeName="stopColor" values="#0088FF;#8B00FF;#FF0000;#FF8C00;#00FF88;#0088FF" dur="4s" repeatCount="indefinite" /></stop>
          <stop offset="100%" stopColor="#8B00FF"><animate attributeName="stopColor" values="#8B00FF;#FF0000;#FF8C00;#00FF88;#0088FF;#8B00FF" dur="4s" repeatCount="indefinite" /></stop>
        </linearGradient>
      </defs>
      <circle cx="38" cy="42" r="10" fill="#4A00E0" opacity="0.08" /><circle cx="62" cy="42" r="10" fill="#4A00E0" opacity="0.08" />
      <circle cx="38" cy="42" r="8" fill="none" stroke={rb} strokeWidth={2}><animate attributeName="strokeWidth" values="2;2.5;2" dur="2s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="6" fill="none" stroke={rb} strokeWidth={1} opacity="0.5" />
      <circle cx="38" cy="42" r="5" fill={vo} />
      <circle cx="62" cy="42" r="8" fill="none" stroke={rb} strokeWidth={2}><animate attributeName="strokeWidth" values="2;2.5;2" dur="2s" begin="0.5s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="42" r="6" fill="none" stroke={rb} strokeWidth={1} opacity="0.5" />
      <circle cx="62" cy="42" r="5" fill={vo} />
      <circle cx="38" cy="34" r="0.8" fill="#FF0000" opacity="0.8"><animateTransform attributeName="transform" type="rotate" from="0 38 42" to="360 38 42" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="46" cy="42" r="0.7" fill="#00FF88" opacity="0.7"><animateTransform attributeName="transform" type="rotate" from="120 38 42" to="480 38 42" dur="3s" repeatCount="indefinite" /></circle>
      <circle cx="62" cy="34" r="0.8" fill="#8B00FF" opacity="0.8"><animateTransform attributeName="transform" type="rotate" from="0 62 42" to="-360 62 42" dur="3.2s" repeatCount="indefinite" /></circle>
      <circle cx="70" cy="42" r="0.7" fill="#FF8C00" opacity="0.7"><animateTransform attributeName="transform" type="rotate" from="120 62 42" to="-240 62 42" dur="3.2s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="1.5" fill="#fff"><animate attributeName="opacity" values="0.8;1;0.6;0.8" dur="1.5s" repeatCount="indefinite" /><animate attributeName="r" values="1.5;2;1.5" dur="1.5s" repeatCount="indefinite" /></circle>
      <circle cx="38" cy="42" r="0.5" fill="#fff" /><circle cx="62" cy="42" r="0.5" fill="#fff" />
      <circle cx="62" cy="42" r="1.5" fill="#fff"><animate attributeName="opacity" values="0.8;1;0.6;0.8" dur="1.5s" begin="0.3s" repeatCount="indefinite" /><animate attributeName="r" values="1.5;2;1.5" dur="1.5s" begin="0.3s" repeatCount="indefinite" /></circle>
      <path d="M45 42 Q50 36 55 42 Q50 48 45 42" fill="none" stroke={rb} strokeWidth={0.8} opacity="0.4"><animate attributeName="opacity" values="0.4;0.7;0.4" dur="2s" repeatCount="indefinite" /></path>
    </g>
  );
}

/** 8-bit blocky pixel eyes (VIP). */
export function PixelEyes() {
  const ec = useEyeColor();
  return (
    <g shapeRendering="crispEdges">
      <rect x="33" y="37" width="10" height="10" fill="#fff" stroke="#000" strokeWidth={S} />
      <rect x="36" y="40" width="4" height="4" fill={ec} />
      <rect x="37" y="41" width="2" height="2" fill="#000" />
      <rect x="57" y="37" width="10" height="10" fill="#fff" stroke="#000" strokeWidth={S} />
      <rect x="60" y="40" width="4" height="4" fill={ec} />
      <rect x="61" y="41" width="2" height="2" fill="#000" />
      <rect x="37" y="38" width="2" height="2" fill="#fff" opacity="0.7" />
      <rect x="61" y="38" width="2" height="2" fill="#fff" opacity="0.7" />
    </g>
  );
}

/** Crosshair reticle iris — competitive sniper look (VIP). */
export function TargetEyes() {
  const ec = useEyeColor();
  return (
    <g>
      <circle cx="38" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="42" r="4.5" fill="none" stroke={ec} strokeWidth={1.4} />
      <circle cx="62" cy="42" r="4.5" fill="none" stroke={ec} strokeWidth={1.4} />
      <circle cx="38" cy="42" r="1.6" fill="#FF3366" />
      <circle cx="62" cy="42" r="1.6" fill="#FF3366" />
      <path d="M38 35.5 V38.5 M38 45.5 V48.5 M31.5 42 H34.5 M41.5 42 H44.5" stroke={ec} strokeWidth={1.2} />
      <path d="M62 35.5 V38.5 M62 45.5 V48.5 M55.5 42 H58.5 M65.5 42 H68.5" stroke={ec} strokeWidth={1.2} />
    </g>
  );
}

/** Big shiny anime/kawaii eyes with sparkle highlights (VIP). */
export function Kawaii() {
  const ec = useEyeColor();
  const ecd = useEyeColorDark();
  return (
    <g>
      <ellipse cx="38" cy="42" rx="7.5" ry="9" fill="#fff" stroke="#000" strokeWidth={S} />
      <ellipse cx="62" cy="42" rx="7.5" ry="9" fill="#fff" stroke="#000" strokeWidth={S} />
      <ellipse cx="38" cy="43" rx="5.5" ry="6.5" fill={ec} />
      <ellipse cx="62" cy="43" rx="5.5" ry="6.5" fill={ec} />
      <ellipse cx="38" cy="44" rx="4.5" ry="5" fill={ecd} opacity="0.4" />
      <ellipse cx="62" cy="44" rx="4.5" ry="5" fill={ecd} opacity="0.4" />
      <circle cx="38" cy="43.5" r="2.4" fill="#000" />
      <circle cx="62" cy="43.5" r="2.4" fill="#000" />
      <circle cx="35.5" cy="39.5" r="2.2" fill="#fff" />
      <circle cx="59.5" cy="39.5" r="2.2" fill="#fff" />
      <circle cx="40" cy="45" r="1.1" fill="#fff" opacity="0.8" />
      <circle cx="64" cy="45" r="1.1" fill="#fff" opacity="0.8" />
    </g>
  );
}

/** RGB-split scanline glitch eyes (Epic). */
export function GlitchEyes() {
  return (
    <g>
      <rect x="31" y="38" width="14" height="8" fill="#FF0040" opacity="0.55" />
      <rect x="32.5" y="38" width="14" height="8" fill="#00FFE0" opacity="0.55" />
      <rect x="31.7" y="38" width="14" height="8" fill="none" stroke="#000" strokeWidth={S} />
      <rect x="55" y="38" width="14" height="8" fill="#FF0040" opacity="0.55" />
      <rect x="56.5" y="38" width="14" height="8" fill="#00FFE0" opacity="0.55" />
      <rect x="55.7" y="38" width="14" height="8" fill="none" stroke="#000" strokeWidth={S} />
      <path d="M32 40.5 H45 M32 43 H45" stroke="#000" strokeWidth={0.5} opacity="0.4" />
      <path d="M56 40.5 H69 M56 43 H69" stroke="#000" strokeWidth={0.5} opacity="0.4" />
      <rect x="37" y="40.5" width="3" height="3" fill="#000" />
      <rect x="61" y="40.5" width="3" height="3" fill="#000" />
    </g>
  );
}

/** Rainbow-gradient iris (Epic). */
export function RainbowEyes() {
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <linearGradient id={`${u}rbeye`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FF1493" />
          <stop offset="33%" stopColor="#FFD93B" />
          <stop offset="66%" stopColor="#00FFE0" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx="38" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="42" r="7" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="42" r="4.6" fill={`url(#${u}rbeye)`} />
      <circle cx="62" cy="42" r="4.6" fill={`url(#${u}rbeye)`} />
      <circle cx="38" cy="42" r="2" fill="#000" />
      <circle cx="62" cy="42" r="2" fill="#000" />
      <circle cx="36.5" cy="40.2" r="1.4" fill="#fff" />
      <circle cx="60.5" cy="40.2" r="1.4" fill="#fff" />
    </g>
  );
}

/** Two eyes + a glowing mystic third eye on the forehead (Legendary). */
export function ThirdEye() {
  const ec = useEyeColor();
  const u = useAvatarUid();
  return (
    <g>
      <defs>
        <radialGradient id={`${u}thirdGlow`}>
          <stop offset="0%" stopColor="#E0B3FF" />
          <stop offset="100%" stopColor="#7C3AED" />
        </radialGradient>
      </defs>
      <circle cx="38" cy="44" r="5.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="62" cy="44" r="5.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="38" cy="44" r="2.8" fill={ec} />
      <circle cx="62" cy="44" r="2.8" fill={ec} />
      <circle cx="38" cy="44" r="1.4" fill="#000" />
      <circle cx="62" cy="44" r="1.4" fill="#000" />
      <ellipse cx="50" cy="31" rx="7" ry="4.5" fill="#fff" stroke="#000" strokeWidth={S} />
      <circle cx="50" cy="31" r="3.4" fill={`url(#${u}thirdGlow)`} />
      <circle cx="50" cy="31" r="1.6" fill="#000" />
      <circle cx="48.8" cy="29.8" r="0.9" fill="#fff" />
      <path d="M50 24 V21 M43 28 L41 26 M57 28 L59 26" stroke="#A855F7" strokeWidth={1} opacity="0.7" />
    </g>
  );
}
