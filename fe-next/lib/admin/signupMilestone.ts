export interface SignupMilestone {
  prev: number;
  next: number;
  pct: number;
  crossedThisWeek: boolean;
}

export function signupMilestone(total: number, week: number): SignupMilestone {
  const step = total < 1000 ? 100 : total < 10_000 ? 500 : 1000;
  const prev = Math.floor(total / step) * step;
  return {
    prev,
    next: prev + step,
    pct: Math.round(((total - prev) / step) * 100),
    crossedThisWeek: prev > 0 && total - week < prev,
  };
}
