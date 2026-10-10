/** Civil dates are stored as YYYY-MM-DD; UTC arithmetic avoids DST day lengths. */
export function habitStreaks(dates: string[], today: string) {
  const days = [...new Set(dates)].filter((date) => date <= today).sort();
  const previous = (date: string) => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() - 1);
    return value.toISOString().slice(0, 10);
  };
  let run = 0;
  let longestStreak = 0;
  let last: string | undefined;
  for (const day of days) {
    run = last === previous(day) ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    last = day;
  }
  const available = new Set(days);
  let cursor = available.has(today) ? today : previous(today);
  let currentStreak = 0;
  while (available.has(cursor)) {
    currentStreak++;
    cursor = previous(cursor);
  }
  return { currentStreak, longestStreak };
}
