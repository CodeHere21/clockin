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

/**
 * Validation exists because breaks became editable. Until then the UI could only
 * produce sane breaks — one at a time, always inside the session. Hand-edited
 * times can produce a break that outlives its session, or two that overlap, and
 * `breakMinutes` sums them all, so an overlap would be subtracted twice.
 */
export interface SessionProblem {
  field: string
  message: string
}

export function validateSession(session: Session, now: Date): SessionProblem[] {
  const problems: SessionProblem[] = []
  const start = new Date(session.startedAt).getTime()
  const end = session.endedAt === null ? null : new Date(session.endedAt).getTime()

  if (Number.isNaN(start)) {
    problems.push({ field: 'startedAt', message: 'Start time is not a valid date.' })
    return problems
  }
  if (end !== null && Number.isNaN(end)) {
    problems.push({ field: 'endedAt', message: 'End time is not a valid date.' })
    return problems
  }
  if (end !== null && end <= start) {
    problems.push({ field: 'endedAt', message: 'End has to be after the start.' })
  }

  // An open session is bounded by now, so a break cannot be in the future either.
  const bound = end ?? now.getTime()

  const spans = session.breaks.map((b) => ({
    id: b.id,
    from: new Date(b.startedAt).getTime(),
    to: b.endedAt === null ? bound : new Date(b.endedAt).getTime(),
    open: b.endedAt === null,
  }))

  for (const s of spans) {
    if (Number.isNaN(s.from) || Number.isNaN(s.to)) {
      problems.push({ field: `break:${s.id}`, message: 'Break time is not a valid date.' })
      continue
    }
    if (!s.open && s.to <= s.from) {
      problems.push({ field: `break:${s.id}`, message: 'Break has to end after it starts.' })
      continue
    }
    if (s.from < start || s.to > bound) {
      problems.push({ field: `break:${s.id}`, message: 'Break falls outside the session.' })
    }
  }

  const ordered = spans
    .filter((s) => !Number.isNaN(s.from) && !Number.isNaN(s.to))
    .sort((a, b) => a.from - b.from)
  for (let i = 1; i < ordered.length; i++) {
    if (ordered[i].from < ordered[i - 1].to) {
      problems.push({
        field: `break:${ordered[i].id}`,
        message: 'Breaks overlap, so the time would be subtracted twice.',
      })
    }
  }

  return problems
}
