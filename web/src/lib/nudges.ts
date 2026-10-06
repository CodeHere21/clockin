import { formatHm } from './time'
import type { TargetStatus } from './types'

/**
 * Tone rule: observe, don't scold. These lines report where the day stands and,
 * at most, suggest stopping. Nothing here should imply the reader is behind,
 * lazy, or owes anyone time.
 */
export function nudge(
  status: TargetStatus,
  worked: number,
  target: number,
  running: boolean,
): string {
  const left = target - worked
  switch (status) {
    case 'idle':
      // `idle` only means zero minutes banked, which is also true for the first
      // minute after clocking in — so the running clock decides the wording.
      return running
        ? 'Just clocked in. The clock is running.'
        : 'Not started yet. Clock in when you are ready.'
    case 'under':
      return `Light day so far — ${formatHm(worked)} in, ${formatHm(left)} to go.`
    case 'close':
      return `Nearly there — ${formatHm(left)} left.`
    case 'met':
      return `That is your ${formatHm(target)}. Good place to stop.`
    case 'over':
      return `${formatHm(worked)} today — you have more than covered it.`
    case 'wellOver':
      return `${formatHm(worked)} today. Worth closing the laptop.`
  }
}

export function weekNote(worked: number, target: number, daysElapsed: number): string {
  if (worked === 0) return 'Nothing logged this week yet.'
  const pace = (target / 5) * Math.min(daysElapsed, 5)
  const delta = worked - pace
  if (Math.abs(delta) < 45) return 'Tracking about where you would expect by now.'
  if (delta > 0) return `${formatHm(delta)} ahead of a steady five-day pace.`
  return `${formatHm(-delta)} behind a steady five-day pace — plenty of week left.`
}
