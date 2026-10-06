import { formatClock, formatHm, openBreak, workedMinutes } from '../lib/time'
import type { Session } from '../lib/types'

interface Props {
  session: Session | undefined
  now: Date
  onClockIn: () => void
  onClockOut: () => void
  onStartBreak: () => void
  onEndBreak: () => void
}

export function ClockCard({ session, now, onClockIn, onClockOut, onStartBreak, onEndBreak }: Props) {
  const onBreak = session ? openBreak(session) : undefined

  if (!session) {
    return (
      <section className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <p className="text-sm text-stone-500 dark:text-stone-400">Not clocked in</p>
        <button
          onClick={onClockIn}
          className="mt-4 w-full rounded-xl bg-emerald-600 px-6 py-4 text-lg font-semibold text-white transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-stone-900"
        >
          Clock in
        </button>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <div className="flex items-baseline justify-between">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {onBreak ? 'On a break' : 'Clocked in'} since {formatClock(onBreak ? onBreak.startedAt : session.startedAt)}
        </p>
        {onBreak && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            paused
          </span>
        )}
      </div>

      <p className="mt-2 text-5xl font-semibold tabular-nums">
        {formatHm(workedMinutes(session, now))}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          onClick={onBreak ? onEndBreak : onStartBreak}
          className="rounded-xl bg-stone-100 px-4 py-3 font-medium text-stone-800 transition hover:bg-stone-200 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:outline-none dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
        >
          {onBreak ? 'Resume' : 'Take a break'}
        </button>
        <button
          onClick={onClockOut}
          className="rounded-xl bg-stone-900 px-4 py-3 font-medium text-white transition hover:bg-stone-700 focus-visible:ring-2 focus-visible:ring-stone-500 focus-visible:outline-none dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
        >
          Clock out
        </button>
      </div>
    </section>
  )
}
