import { DEFAULT_SETTINGS, type AppState } from './types'

const KEY = 'clockin.v1'

const EMPTY: AppState = { version: 1, sessions: [], settings: DEFAULT_SETTINGS }

/**
 * localStorage can throw (private browsing, blocked site data) and can come back
 * empty or corrupt. Every read and write is guarded; the app must render either way.
 * This is also the single reason the export button exists — see README.
 */
export function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    const parsed = JSON.parse(raw) as Partial<AppState>
    if (!parsed || !Array.isArray(parsed.sessions)) return EMPTY
    return {
      version: 1,
      sessions: parsed.sessions,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    }
  } catch {
    return EMPTY
  }
}

export function save(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Quota or blocked storage. Nothing useful to do; the UI keeps working in memory.
  }
}

export function exportFile(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `clockin-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importFile(file: File): Promise<AppState> {
  const parsed = JSON.parse(await file.text()) as Partial<AppState>
  if (!parsed || !Array.isArray(parsed.sessions)) throw new Error('Not a clockin export')
  return {
    version: 1,
    sessions: parsed.sessions,
    settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
  }
}
