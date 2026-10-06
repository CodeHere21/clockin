import { useRef, useState } from 'react'
import type { AppState, Settings } from '../lib/types'
import { exportFile, importFile } from '../lib/storage'

interface Props {
  state: AppState
  onSettings: (s: Settings) => void
  onImport: (s: AppState) => void
}

export function Toolbar({ state, onSettings, onImport }: Props) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { settings } = state

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-sm font-medium tracking-wide text-stone-500 uppercase dark:text-stone-400"
      >
        Targets and backup
        <span aria-hidden className="text-stone-400">{open ? "\u2212" : "+"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <HoursField
              label="Daily target"
              minutes={settings.dailyTargetMinutes}
              onChange={(dailyTargetMinutes) => onSettings({ ...settings, dailyTargetMinutes })}
            />
            <HoursField
              label="Weekly target"
              minutes={settings.weeklyTargetMinutes}
              onChange={(weeklyTargetMinutes) => onSettings({ ...settings, weeklyTargetMinutes })}
            />
          </div>

          <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900">
            Your data lives in this browser only. Clearing site data erases it. Export
            now and then; the file imports straight into the backend when it arrives.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportFile(state)}
              className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            >
              Export JSON
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-lg bg-stone-100 px-3 py-2 text-sm font-medium text-stone-800 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
            >
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                setError(null)
                try {
                  onImport(await importFile(file))
                } catch {
                  setError("That file could not be read as a clockin export.")
                }
                e.target.value = ""
              }}
            />
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </div>
        </div>
      )}
    </section>
  )
}

function HoursField({
  label,
  minutes,
  onChange,
}: {
  label: string
  minutes: number
  onChange: (minutes: number) => void
}) {
  return (
    <label className="text-xs text-stone-500 dark:text-stone-400">
      {label} (hours)
      <input
        type="number"
        min={0}
        max={168}
        step={0.5}
        value={minutes / 60}
        onChange={(e) => {
          const hours = Number(e.target.value)
          if (Number.isFinite(hours) && hours >= 0) onChange(Math.round(hours * 60))
        }}
        className="mt-1 block w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100"
      />
    </label>
  )
}
