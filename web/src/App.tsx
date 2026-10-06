import { useEffect, useMemo, useState } from 'react'
import { ClockCard } from './components/ClockCard'
import { History } from './components/History'
import { Progress } from './components/Progress'
import { Toolbar } from './components/Toolbar'
import { nudge, weekNote } from './lib/nudges'
import { load, save } from './lib/storage'
import {
  dayKeyOf,
  isOpen,
  openBreak,
  sessionsInWeek,
  sessionsOnDay,
  startOfWeek,
  statusFor,
  sumWorked,
} from './lib/time'
import type { AppState, Session, Settings } from './lib/types'

const newId = () => crypto.randomUUID()

export default function App() {
  const [state, setState] = useState<AppState>(load)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => save(state), [state])

  const current = state.sessions.find(isOpen)
  const runningId = current?.id ?? null

  useEffect(() => {
    // A running clock needs second-by-second updates; an idle one does not.
    const id = setInterval(() => setNow(new Date()), runningId ? 1000 : 30_000)
    return () => clearInterval(id)
  }, [runningId])

  const patch = (fn: (sessions: Session[]) => Session[]) =>
    setState((s) => ({ ...s, sessions: fn(s.sessions) }))

  const clockIn = () =>
    patch((ss) => [
      ...ss,
      { id: newId(), startedAt: new Date().toISOString(), endedAt: null, breaks: [] },
    ])

  const clockOut = () =>
    patch((ss) =>
      ss.map((s) => {
        if (!isOpen(s)) return s
        const stamp = new Date().toISOString()
        return {
          ...s,
          endedAt: stamp,
          // Close any break left running, so it can never outlive the session.
          breaks: s.breaks.map((b) => (b.endedAt === null ? { ...b, endedAt: stamp } : b)),
        }
      }),
    )

  const startBreak = () =>
    patch((ss) =>
      ss.map((s) =>
        isOpen(s) && !openBreak(s)
          ? {
              ...s,
              breaks: [
                ...s.breaks,
                { id: newId(), startedAt: new Date().toISOString(), endedAt: null },
              ],
            }
          : s,
      ),
    )

  const endBreak = () =>
    patch((ss) =>
      ss.map((s) =>
        isOpen(s)
          ? {
              ...s,
              breaks: s.breaks.map((b) =>
                b.endedAt === null ? { ...b, endedAt: new Date().toISOString() } : b,
              ),
            }
          : s,
      ),
    )

  const updateSession = (next: Session) =>
    patch((ss) => ss.map((s) => (s.id === next.id ? next : s)))

  const deleteSession = (id: string) => patch((ss) => ss.filter((s) => s.id !== id))

  const setSettings = (settings: Settings) => setState((s) => ({ ...s, settings }))

  const today = dayKeyOf(now)
  const { dailyTargetMinutes: dayTarget, weeklyTargetMinutes: weekTarget } = state.settings

  const dayWorked = useMemo(
    () => sumWorked(sessionsOnDay(state.sessions, today), now),
    [state.sessions, today, now],
  )
  const weekWorked = useMemo(
    () => sumWorked(sessionsInWeek(state.sessions, now), now),
    [state.sessions, now],
  )

  const daysElapsed =
    Math.floor((now.getTime() - startOfWeek(now).getTime()) / 86_400_000) + 1
  const dayStatus = statusFor(dayWorked, dayTarget)

  return (
    <div className="mx-auto min-h-dvh w-full max-w-2xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Clockin</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </header>

      <div className="space-y-4">
        <ClockCard
          session={current}
          now={now}
          onClockIn={clockIn}
          onClockOut={clockOut}
          onStartBreak={startBreak}
          onEndBreak={endBreak}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Progress
            label="Today"
            worked={dayWorked}
            target={dayTarget}
            status={dayStatus}
            note={nudge(dayStatus, dayWorked, dayTarget, current !== undefined)}
          />
          <Progress
            label="This week"
            worked={weekWorked}
            target={weekTarget}
            status={statusFor(weekWorked, weekTarget)}
            note={weekNote(weekWorked, weekTarget, daysElapsed)}
          />
        </div>

        <History
          sessions={state.sessions}
          now={now}
          onUpdate={updateSession}
          onDelete={deleteSession}
        />

        <Toolbar state={state} onSettings={setSettings} onImport={setState} />
      </div>

      <footer className="mt-8 text-center text-xs text-stone-400 dark:text-stone-600">
        Stored in this browser. Week starts Monday.
      </footer>
    </div>
  )
}
