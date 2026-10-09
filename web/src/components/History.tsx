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
  validateSession,
  workedMinutes,
} from '../lib/time'
import type { BreakInterval, Session } from '../lib/types'

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
      <Card>
        <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
          Nothing logged yet. Your days will appear here once you clock out.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <ul className="mt-3 divide-y divide-stone-200 dark:divide-stone-800">
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
                      now={now}
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
                    <SessionRow key={s.id} session={s} now={now} onEdit={() => setEditing(s.id)} />
                  ),
                )}
            </ul>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
        History
      </h2>
      {children}
    </section>
  )
}

function SessionRow({ session, now, onEdit }: { session: Session; now: Date; onEdit: () => void }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="text-stone-600 dark:text-stone-400">
        {formatClock(session.startedAt)} &ndash;{' '}
        {session.endedAt ? formatClock(session.endedAt) : 'running'}
        {session.breaks.length > 0 && (
          <span className="ml-2 text-stone-400 dark:text-stone-500">
            {session.breaks.length} break{session.breaks.length > 1 ? 's' : ''}
          </span>
        )}
        {session.note && (
          <span className="ml-2 italic text-stone-400 dark:text-stone-500">{session.note}</span>
        )}
      </span>
      <span className="flex items-center gap-3">
        <span className="tabular-nums text-stone-500 dark:text-stone-400">
          {formatHm(workedMinutes(session, now))}
        </span>
        <button
          onClick={onEdit}
          className="rounded-sm text-sm text-sky-700 hover:underline focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:outline-none dark:text-sky-400"
        >
          Correct
        </button>
      </span>
    </li>
  )
}

const FIELD =
  'mt-1 block w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100'

function EditRow({
  session,
  now,
  onSave,
  onCancel,
  onDelete,
}: {
  session: Session
  now: Date
  onSave: (s: Session) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<Session>(session)
  const problems = validateSession(draft, now)
  const problemFor = (id: string) => problems.find((p) => p.field === `break:${id}`)

  const setBreak = (id: string, patch: Partial<BreakInterval>) =>
    setDraft((d) => ({
      ...d,
      breaks: d.breaks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }))

  const addBreak = () => {
    // Anchor a new break after the last existing one, so it cannot overlap by default.
    const ends = draft.breaks
      .map((b) => new Date(b.endedAt ?? b.startedAt).getTime())
      .filter((t) => !Number.isNaN(t))
    const anchor = Math.max(new Date(draft.startedAt).getTime(), ...ends, 0)
    setDraft((d) => ({
      ...d,
      breaks: [
        ...d.breaks,
        {
          id: crypto.randomUUID(),
          startedAt: new Date(anchor).toISOString(),
          endedAt: new Date(anchor + 30 * 60_000).toISOString(),
        },
      ],
    }))
  }

  return (
    <li className="rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 dark:bg-stone-950 dark:ring-stone-800">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs text-stone-500 dark:text-stone-400">
          Started
          <input
            type="datetime-local"
            value={toLocalInput(draft.startedAt)}
            onChange={(e) => setDraft({ ...draft, startedAt: fromLocalInput(e.target.value) })}
            className={FIELD}
          />
        </label>
        <label className="text-xs text-stone-500 dark:text-stone-400">
          Ended
          <input
            type="datetime-local"
            value={draft.endedAt ? toLocalInput(draft.endedAt) : ''}
            onChange={(e) =>
              setDraft({
                ...draft,
                endedAt: e.target.value === '' ? null : fromLocalInput(e.target.value),
              })
            }
            className={FIELD}
          />
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs text-stone-500 dark:text-stone-400">Breaks</legend>

        {draft.breaks.length === 0 && (
          <p className="mt-1 text-xs text-stone-400 dark:text-stone-500">
            No breaks on this session.
          </p>
        )}

        <ul className="mt-1 space-y-2">
          {draft.breaks.map((b) => {
            const problem = problemFor(b.id)
            return (
              <li key={b.id}>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="min-w-36 flex-1 text-xs text-stone-500 dark:text-stone-400">
                    From
                    <input
                      type="datetime-local"
                      value={toLocalInput(b.startedAt)}
                      onChange={(e) => setBreak(b.id, { startedAt: fromLocalInput(e.target.value) })}
                      className={FIELD}
                    />
                  </label>
                  <label className="min-w-36 flex-1 text-xs text-stone-500 dark:text-stone-400">
                    To
                    <input
                      type="datetime-local"
                      value={b.endedAt ? toLocalInput(b.endedAt) : ''}
                      onChange={(e) =>
                        setBreak(b.id, {
                          endedAt: e.target.value === '' ? null : fromLocalInput(e.target.value),
                        })
                      }
                      className={FIELD}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((d) => ({ ...d, breaks: d.breaks.filter((x) => x.id !== b.id) }))
                    }
                    aria-label="Remove this break"
                    className="rounded-lg px-2.5 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Remove
                  </button>
                </div>
                {problem && (
                  <p className="mt-1 text-xs text-red-600 dark:text-red-400">{problem.message}</p>
                )}
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          onClick={addBreak}
          className="mt-2 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          Add break
        </button>
      </fieldset>

      <label className="mt-3 block text-xs text-stone-500 dark:text-stone-400">
        Why the correction?
        <input
          type="text"
          value={draft.note ?? ''}
          onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          placeholder="forgot to clock out"
          className={FIELD}
        />
      </label>

      {problems
        .filter((p) => !p.field.startsWith('break:'))
        .map((p) => (
          <p key={p.field} className="mt-2 text-xs text-red-600 dark:text-red-400">
            {p.message}
          </p>
        ))}

      <p className="mt-3 text-xs text-stone-500 dark:text-stone-400">
        Worked after this correction:{' '}
        <span className="font-medium tabular-nums text-stone-700 dark:text-stone-200">
          {problems.length === 0 ? formatHm(workedMinutes(draft, now)) : '—'}
        </span>
      </p>

      <div className="mt-3 flex items-center gap-2">
        <button
          disabled={problems.length > 0}
          onClick={() => onSave({ ...draft, note: (draft.note ?? '').trim() || undefined })}
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
