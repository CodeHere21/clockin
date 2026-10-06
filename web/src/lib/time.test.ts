import { describe, expect, it } from 'vitest'
import type { Session } from './types'
import {
  breakMinutes,
  formatHm,
  localDayKey,
  startOfWeek,
  statusFor,
  sumWorked,
  weekDayKeys,
  workedMinutes,
} from './time'

function session(startedAt: string, endedAt: string | null, breaks: [string, string | null][] = []): Session {
  return {
    id: 's',
    startedAt,
    endedAt,
    breaks: breaks.map(([startedAt, endedAt], i) => ({ id: `b${i}`, startedAt, endedAt })),
  }
}

const NOW = new Date('2026-10-05T17:00:00Z')

describe('workedMinutes', () => {
  it('counts a plain closed session', () => {
    expect(workedMinutes(session('2026-10-05T09:00:00Z', '2026-10-05T17:00:00Z'), NOW)).toBe(480)
  })

  it('subtracts a closed break', () => {
    const s = session('2026-10-05T09:00:00Z', '2026-10-05T17:00:00Z', [
      ['2026-10-05T12:00:00Z', '2026-10-05T12:45:00Z'],
    ])
    expect(workedMinutes(s, NOW)).toBe(480 - 45)
  })

  it('subtracts several breaks', () => {
    const s = session('2026-10-05T09:00:00Z', '2026-10-05T17:00:00Z', [
      ['2026-10-05T11:00:00Z', '2026-10-05T11:15:00Z'],
      ['2026-10-05T13:00:00Z', '2026-10-05T13:30:00Z'],
    ])
    expect(workedMinutes(s, NOW)).toBe(480 - 45)
  })

  it('counts an open session up to now', () => {
    expect(workedMinutes(session('2026-10-05T15:30:00Z', null), NOW)).toBe(90)
  })

  it('counts an open break up to now, and keeps it out of worked time', () => {
    const s = session('2026-10-05T15:00:00Z', null, [['2026-10-05T16:30:00Z', null]])
    expect(breakMinutes(s, NOW)).toBe(30)
    expect(workedMinutes(s, NOW)).toBe(120 - 30)
  })

  it('never goes negative when a break outlasts the session', () => {
    const s = session('2026-10-05T09:00:00Z', '2026-10-05T09:30:00Z', [
      ['2026-10-05T09:00:00Z', '2026-10-05T11:00:00Z'],
    ])
    expect(workedMinutes(s, NOW)).toBe(0)
  })
})

describe('daylight saving', () => {
  // These are the tests the plan calls out. Because elapsed time is computed from
  // epoch milliseconds rather than wall-clock arithmetic, DST cannot inflate or
  // deflate a total — but that only stays true if nobody "helpfully" rewrites it.

  it('spring forward does not inflate hours (02:00 EST -> 03:00 EDT)', () => {
    // 2026-03-08, US. 01:30 EST and 03:30 EDT are 60 real minutes apart.
    const s = session('2026-03-08T01:30:00-05:00', '2026-03-08T03:30:00-04:00')
    expect(workedMinutes(s, NOW)).toBe(60)
  })

  it('fall back does not deflate hours (02:00 EDT -> 01:00 EST)', () => {
    // 2026-11-01, US. The wall clock reads 01:30 twice; 60 real minutes elapse.
    const s = session('2026-11-01T01:30:00-04:00', '2026-11-01T01:30:00-05:00')
    expect(workedMinutes(s, NOW)).toBe(60)
  })
})

describe('day attribution', () => {
  it('keeps an overnight session on the day it started', () => {
    const late = new Date('2026-10-05T22:00:00')
    const nextMorning = new Date('2026-10-06T02:00:00')
    const s = session(late.toISOString(), nextMorning.toISOString())
    expect(localDayKey(s.startedAt)).toBe('2026-10-05')
    expect(workedMinutes(s, NOW)).toBe(240)
  })
})

describe('week', () => {
  it('starts on Monday', () => {
    // 2026-10-05 is a Monday; 2026-10-11 is the Sunday that closes that week.
    expect(startOfWeek(new Date('2026-10-08T12:00:00')).getDay()).toBe(1)
    expect(weekDayKeys(new Date('2026-10-08T12:00:00'))).toEqual([
      '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08',
      '2026-10-09', '2026-10-10', '2026-10-11',
    ])
  })

  it('sums across sessions', () => {
    const sessions = [
      session('2026-10-05T09:00:00Z', '2026-10-05T12:00:00Z'),
      session('2026-10-06T09:00:00Z', '2026-10-06T13:00:00Z'),
    ]
    expect(sumWorked(sessions, NOW)).toBe(420)
  })
})

describe('statusFor', () => {
  const target = 480
  it.each([
    [0, 'idle'],
    [120, 'under'],
    [440, 'close'],
    [480, 'met'],
    [520, 'over'],
    [610, 'wellOver'],
  ])('%i minutes against an 8h target is %s', (worked, expected) => {
    expect(statusFor(worked, target)).toBe(expected)
  })
})

describe('formatHm', () => {
  it.each([
    [0, '0m'],
    [45, '45m'],
    [60, '1h'],
    [485, '8h 5m'],
    [-30, '-30m'],
  ])('%i -> %s', (mins, expected) => {
    expect(formatHm(mins)).toBe(expected)
  })
})
