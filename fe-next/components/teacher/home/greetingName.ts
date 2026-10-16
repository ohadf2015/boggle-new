const HONORIFIC = /^(mr|mrs|ms|miss|mx|dr|prof|sir)\.?$/i;

export function greetingName(displayName: string | null | undefined): string {
  const [first = '', second] = (displayName ?? '').trim().split(/\s+/);
  if (!HONORIFIC.test(first)) return first;
  return second ? `${first} ${second}` : '';
}
