const HANUKKAH_FIRST_DAY = {
  2026: [2026, 11, 4],
  2027: [2027, 11, 24],
  2028: [2028, 11, 12],
};
const HANUKKAH_DAYS = 9;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isHanukkah(date, estimateStart) {
  const day = startOfDay(date);
  return [date.getFullYear(), date.getFullYear() - 1].some((year) => {
    const known = HANUKKAH_FIRST_DAY[year];
    const start = known ? new Date(known[0], known[1], known[2]) : startOfDay(estimateStart(year));
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + HANUKKAH_DAYS - 1);
    return day >= start && day <= end;
  });
}

function isChristmasWindow(date) {
  const month = date.getMonth();
  const day = date.getDate();
  return (month === 11 && day >= 13) || (month === 0 && day === 1);
}

module.exports = { isHanukkah, isChristmasWindow };
