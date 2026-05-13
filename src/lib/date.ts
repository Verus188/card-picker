export const toDateKey = (date = new Date()) => date.toISOString().slice(0, 10)

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const compareDateKeys = (left?: string, right?: string) => {
  if (!left && !right) return 0
  if (!left) return -1
  if (!right) return 1
  return left.localeCompare(right)
}
