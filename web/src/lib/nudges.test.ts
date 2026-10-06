import { describe, expect, it } from 'vitest'
import { nudge, weekNote } from './nudges'
import { statusFor } from './time'

const TARGET = 480

describe('nudge', () => {
  it('does not claim the day has not started while the clock is running', () => {
    // Regression: for the first minute after clocking in, worked is still 0.
    expect(nudge(statusFor(0, TARGET), 0, TARGET, true)).toContain('running')
    expect(nudge(statusFor(0, TARGET), 0, TARGET, true)).not.toContain('Not started')
  })

  it('invites a start when genuinely idle', () => {
    expect(nudge(statusFor(0, TARGET), 0, TARGET, false)).toContain('Not started yet')
  })

  it('stays encouraging when under target', () => {
    const line = nudge(statusFor(180, TARGET), 180, TARGET, true)
    expect(line).toContain('3h')
    expect(line).toContain('5h')
  })

  it('suggests stopping once the target is met', () => {
    expect(nudge(statusFor(480, TARGET), 480, TARGET, true)).toContain('Good place to stop')
  })

  it('escalates gently well past target', () => {
    expect(nudge(statusFor(620, TARGET), 620, TARGET, true)).toContain('closing the laptop')
  })
})

describe('weekNote', () => {
  it('reports an empty week plainly', () => {
    expect(weekNote(0, 2400, 3)).toContain('Nothing logged')
  })

  it('frames a shortfall as time remaining, not as a deficit', () => {
    expect(weekNote(240, 2400, 3)).toContain('plenty of week left')
  })

  it('recognises being ahead of pace', () => {
    expect(weekNote(1200, 2400, 2)).toContain('ahead')
  })
})
