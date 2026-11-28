const BG: Record<string, string> = {
  'neo-lime': 'bg-neo-lime',
  'neo-pink': 'bg-neo-pink',
  'neo-cyan': 'bg-neo-cyan',
  'neo-orange': 'bg-neo-orange',
  'neo-purple': 'bg-neo-purple',
  'neo-holiday-snow': 'bg-neo-holiday-snow',
  'neo-holiday-red': 'bg-neo-holiday-red',
  'neo-cream': 'bg-neo-cream',
};

export const seatBg = (color: string) => BG[color] ?? 'bg-neo-cream';
