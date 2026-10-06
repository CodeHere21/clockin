/**
 * Timestamps are ISO-8601 strings in UTC. Rendering happens in the browser's zone.
 * This mirrors the rule the Spring Boot backend will follow later (`Instant` in,
 * zone applied on the way out), so the migration is a transport change, not a rewrite.
 */

export interface BreakInterval {
  id: string
  startedAt: string
  /** null while the break is still running */
  endedAt: string | null
}

export interface Session {
  id: string
  startedAt: string
  /** null while still clocked in */
  endedAt: string | null
  breaks: BreakInterval[]
  note?: string
}

export interface Settings {
  dailyTargetMinutes: number
  weeklyTargetMinutes: number
}

export interface AppState {
  version: 1
  sessions: Session[]
  settings: Settings
}

export type TargetStatus = 'idle' | 'under' | 'close' | 'met' | 'over' | 'wellOver'

export const DEFAULT_SETTINGS: Settings = {
  dailyTargetMinutes: 8 * 60,
  weeklyTargetMinutes: 40 * 60,
}
