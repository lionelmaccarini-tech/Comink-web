/**
 * Belgian working-days calculator (shared between client and server).
 * Excludes weekends + Belgian public holidays.
 */

function getBelgianHolidays(year: number): Set<string> {
  const fmt = (m: number, d: number) =>
    `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const fixed = [
    fmt(1, 1), fmt(5, 1), fmt(7, 21), fmt(8, 15),
    fmt(11, 1), fmt(11, 11), fmt(12, 25),
  ]
  const easterDates: Record<number, [number, number]> = {
    2025: [4, 20], 2026: [4, 5], 2027: [3, 28], 2028: [4, 16], 2029: [4, 1],
  }
  const e = easterDates[year]
  if (e) {
    const easter = new Date(year, e[0] - 1, e[1])
    const shift = (n: number) => {
      const d = new Date(easter); d.setDate(d.getDate() + n)
      return d.toISOString().slice(0, 10)
    }
    fixed.push(shift(1), shift(39), shift(49))
  }
  return new Set(fixed)
}

/**
 * Returns the date after `days` Belgian working days, starting from tomorrow.
 */
export function addWorkingDays(days: number, from?: Date): Date {
  const date = from ? new Date(from) : new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 1) // start from tomorrow
  let added = 0
  while (added < days) {
    const dow = date.getDay()
    const str = date.toISOString().slice(0, 10)
    if (dow !== 0 && dow !== 6 && !getBelgianHolidays(date.getFullYear()).has(str)) added++
    if (added < days) date.setDate(date.getDate() + 1)
  }
  return date
}

/**
 * Returns ISO date string (YYYY-MM-DD) after `days` working days.
 */
export function addWorkingDaysISO(days: number, from?: Date): string {
  return addWorkingDays(days, from).toISOString().slice(0, 10)
}
