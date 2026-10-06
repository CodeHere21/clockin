import { formatHm } from '../lib/time'
import type { TargetStatus } from '../lib/types'

const BAR: Record<TargetStatus, string> = {
  idle: 'bg-stone-300 dark:bg-stone-700',
  under: 'bg-sky-500',
  close: 'bg-amber-500',
  met: 'bg-emerald-500',
  over: 'bg-emerald-600',
  wellOver: 'bg-orange-500',
}

interface Props {
  label: string
  worked: number
  target: number
  status: TargetStatus
  note: string
}

export function Progress({ label, worked, target, status, note }: Props) {
  const pct = target > 0 ? Math.min(100, (worked / target) * 100) : 0
  const over = worked > target

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400">
          {label}
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          target {formatHm(target)}
        </p>
      </div>

      <p className="mt-2 text-4xl font-semibold tabular-nums">{formatHm(worked)}</p>

      <div
        className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
        role="progressbar"
        aria-valuenow={Math.round(worked)}
        aria-valuemin={0}
        aria-valuemax={target}
        aria-label={`${label}: ${formatHm(worked)} of ${formatHm(target)}`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${BAR[status]}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">{note}</p>

      {over && (
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {formatHm(worked - target)} past target
        </p>
      )}
    </section>
  )
}
