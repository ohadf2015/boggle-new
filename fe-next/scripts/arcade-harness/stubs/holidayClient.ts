const q = new URLSearchParams(location.search);

export const holidayQuery = () => ({ holiday: q.get('h') ?? 'hanukkah', localDate: '2026-12-15', locale: q.get('lang') ?? 'en' });
export const holidayPost = async () => ({ roundId: null, lang: 'en', seconds: 60, content: { seed: 1 } });
export const noticeHolidayWord = () => {};
