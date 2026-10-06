import type { BreakInterval, Session, TargetStatus } from './types'

/**
 * Every function here is pure and takes `now` as an argument rather than reading the
 * clock itself. That is what makes the hours math testable, and it is the same shape
 * the Java service will take.
 */

const MS_PER_MINUTE = 60_000

export function minutesBetween(startIso: string, endIso: string): number {
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime()
  return Math.max(0, Math.round(ms / MS_PER_MINUTE))
}

export function isOpen(session: Session): boolean {
  return session.endedAt === null
}

export function openBreak(session: Session): BreakInterval | undefined {
  return session.breaks.find((b) => b.endedAt === null)
}

/** Total break minutes. A break still running counts up to `now`. */
export function breakMinutes(session: Session, now: Date): number {
  return session.breaks.reduce(
    (sum, b) => sum + minutesBetween(b.startedAt, b.endedAt ?? now.toISOString()),
    0,
  )
}

/** Elapsed minutes minus breaks. An open session counts up to `now`. */
export function workedMinutes(session: Session, now: Date): number {
  const elapsed = minutesBetween(session.startedAt, session.endedAt ?? now.toISOString())
  return Math.max(0, elapsed - breakMinutes(session, now))
}

export function sumWorked(sessions: Session[], now: Date): number {
  return sessions.reduce((sum, s) => sum + workedMinutes(s, now), 0)
}

/**
 * Local calendar day as YYYY-MM-DD. A session is attributed to the day it STARTED,
 * so a shift running past midnight stays on one day rather than being split.
 */
export function localDayKey(iso: string): string {
  const d = new Date(iso)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function dayKeyOf(date: Date): string {
  return localDayKey(date.toISOString())
}

export function sessionsOnDay(sessions: Session[], dayKey: string): Session[] {
  return sessions.filter((s) => localDayKey(s.startedAt) === dayKey)
}

/** Monday 00:00 local — ISO-8601 week, matching what `WeekFields.ISO` will do in Java. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export function weekDayKeys(date: Date): string[] {
  const start = startOfWeek(date)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return dayKeyOf(d)
  })
}

export function sessionsInWeek(sessions: Session[], date: Date): Session[] {
  const keys = new Set(weekDayKeys(date))
  return sessions.filter((s) => keys.has(localDayKey(s.startedAt)))
}

export function statusFor(worked: number, target: number): TargetStatus {
  if (worked === 0) return 'idle'
  if (worked >= target + 120) return 'wellOver'
  if (worked >= target + 30) return 'over'
  if (worked >= target) return 'met'
  if (target - worked <= 60) return 'close'
  return 'under'
}

export function formatHm(minutes: number): string {
  const sign = minutes < 0 ? '-' : ''
  const abs = Math.abs(Math.round(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${sign}${m}m`
  if (m === 0) return `${sign}${h}h`
  return `${sign}${h}h ${m}m`
}

export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDayLabel(dayKey: string, today: string): string {
  if (dayKey === today) return 'Today'
  const [y, m, d] = dayKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (dayKey === dayKeyOf(yesterday)) return 'Yesterday'
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

/** Local date+time formatted for a `datetime-local` input. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString()
}
