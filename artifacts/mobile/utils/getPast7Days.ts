/**
 * Returns an array of 7 date strings (YYYY-MM-DD) in ascending order,
 * ending with today's local date.
 *
 * Safe across month and year boundaries: the calculation uses
 * millisecond arithmetic on a reference Date, so it never overflows
 * a month or underflows into a negative day.
 *
 * @param today - optional override for "today" (YYYY-MM-DD); defaults to
 *                the current local date at call time.
 */
export function getPast7Days(today?: string): string[] {
  const reference = today ? new Date(today + "T12:00:00") : new Date();
  // Normalise to midnight local time so we always get clean YYYY-MM-DD output.
  const base = new Date(
    reference.getFullYear(),
    reference.getMonth(),
    reference.getDate(),
  );

  const days: string[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(base);
    d.setDate(d.getDate() - offset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    days.push(`${yyyy}-${mm}-${dd}`);
  }
  return days;
}
