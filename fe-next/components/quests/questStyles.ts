// Keyframes inline so the arbitrary animate-[...] classes always resolve.
export const QUEST_KEYFRAMES =
  '@keyframes quest-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}' +
  '@keyframes quest-wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg) scale(1.08)}50%{transform:rotate(8deg) scale(1.08)}75%{transform:rotate(-4deg)}}' +
  '@keyframes quest-chest-wobble{0%,55%,100%{transform:rotate(0)}62%{transform:rotate(-12deg) scale(1.06)}70%{transform:rotate(10deg) scale(1.06)}78%{transform:rotate(-6deg)}86%{transform:rotate(3deg)}}' +
  '@keyframes quest-chest-pop{0%{transform:scale(.6) rotate(-12deg)}60%{transform:scale(1.25) rotate(6deg)}100%{transform:scale(1) rotate(0)}}' +
  '@keyframes quest-burst{0%{transform:rotate(0) scale(.92)}50%{transform:rotate(45deg) scale(1.08)}100%{transform:rotate(90deg) scale(.92)}}';

export const PER_QUEST_XP = 100;
export const TOTAL_DAILY = 3;
