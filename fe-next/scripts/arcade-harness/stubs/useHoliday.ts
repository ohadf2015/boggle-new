const q = new URLSearchParams(location.search);
export const useHoliday = () => ({
  holiday: q.get('h') ?? 'hanukkah',
  resolved: true,
  region: q.get('region') ?? 'world',
  available: ['hanukkah', 'christmas'],
  setOverride: () => {},
});
