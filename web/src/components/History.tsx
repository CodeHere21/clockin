import { useState } from 'react'
import {
  dayKeyOf,
  formatClock,
  formatDayLabel,
  formatHm,
  fromLocalInput,
  localDayKey,
  sumWorked,
  toLocalInput,
  workedMinutes,
} from '../lib/time'
import type { Session } from '../lib/types'

interface Props {
  sessions: Session[]
  now: Date
  onUpdate: (session: Session) => void
  onDelete: (id: string) => void
}

export function History({ sessions, now, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState<string | null>(null)
  const today = dayKeyOf(now)

  const byDay = new Map<string, Session[]>()
  for (const s of sessions) {
    const key = localDayKey(s.startedAt)
    byDay.set(key, [...(byDay.get(key) ?? []), s])
  }
  const days = [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))

  if (days.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
        <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
          History
        </h2>
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
          Nothing logged yet. Your days will appear here once you clock out.
        </p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
        History
      </h2>

      <ul className="mt-3 divide-y divide-stone-150 dark:divide-stone-800">
        {days.map(([dayKey, daySessions]) => (
          <li key={dayKey} className="py-3">
            <div className="flex items-baseline justify-between">
              <h3 className="font-medium">{formatDayLabel(dayKey, today)}</h3>
              <p className="tabular-nums text-stone-600 dark:text-stone-300">
                {formatHm(sumWorked(daySessions, now))}
              </p>
            </div>

            <ul className="mt-1.5 space-y-1.5">
              {daySessions
                .slice()
                .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
                .map((s) =>
                  editing === s.id ? (
                    <EditRow
                      key={s.id}
                      session={s}
                      onCancel={() => setEditing(null)}
                      onSave={(next) => {
                        onUpdate(next)
                        setEditing(null)
                      }}
                      onDelete={() => {
                        onDelete(s.id)
                        setEditing(null)
                      }}
                    />
                  ) : (
                    <li key={s.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-stone-600 dark:text-stone-400">
                        {formatClock(s.startedAt)} – {s.endedAt ? formatClock(s.endedAt) : 'running'}
                        {s.breaks.length > 0 && (
                          <span className="ml-2 text-stone-400 dark:text-stone-500">
                            {s.breaks.length} break{s.breaks.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {s.note && (
                          <span className="ml-2 italic text-stone-400 dark:text-stone-500">{s.note}</span>
                        )}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="tabular-nums text-stone-500 dark:text-stone-400">
                          {formatHm(workedMinutes(s, now))}
                        </span>
                        <button
                          onClick={() => setEditing(s.id)}
                          className="rounded-sm text-sm text-sky-700 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none dark:text-sky-400"
                        >
                          Correct
                        </button>
                      </span>
                    </li>
                  ),
                )}
            </ul>
          </li>
        ))}
      </ul>
    </section>
  )
}

function EditRow({
  session,
  onSave,
  onCancel,
  onDelete,
}: {
  session: Session
  onSave: (s: Session) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [start, setStart] = useState(toLocalInput(session.startedAt))
  const [end, setEnd] = useState(session.endedAt ? toLocalInput(session.endedAt) : '')
  const [note, setNote] = useState(session.note ?? '')

  const invalid = end !== '' && new Date(end) <= new Date(start)

  return (
    <li className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 dark:bg-stone-950 dark:ring-stone-800">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-stone-500 dark:text-stone-400">
          Started
          <input
            type="datetime-local"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
        <label className="text-xs text-stone-500 dark:text-stone-400">
          Ended
          <input
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
          />
        </label>
      </div>

      <label className="mt-2 block text-xs text-stone-500 dark:text-stone-400">
        Why the correction?
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="forgot to clock out"
          className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
        />
      </label>

      {invalid && (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">
          End time has to be after the start time.
        </p>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={invalid}
          onClick={() =>
            onSave({
              ...session,
              startedAt: fromLocalInput(start),
              endedAt: end === '' ? null : fromLocalInput(end),
              note: note.trim() || undefined,
            })
          }
          className="rounded-lg bg-stone-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancel
        </button>
        <button
          onClick={onDelete}
          className="ml-auto rounded-lg px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
        >
          Delete
        </button>
      </div>
    </li>
  )
}
