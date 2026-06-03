'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface Props {
  orgData: Record<string, number>
  myData: Record<string, number>
}

type Period = 'week' | 'month' | '3months' | 'year'

const PERIOD_OPTIONS: { value: Period; label: string; days: number }[] = [
  { value: 'week',    label: '1W',  days: 7   },
  { value: 'month',   label: '1M',  days: 30  },
  { value: '3months', label: '3M',  days: 90  },
  { value: 'year',    label: '1Y',  days: 365 },
]

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DAYS = ['','Mon','','Wed','','Fri','']

// Always use UTC to match server-side toISOString().slice(0,10) keys
function utcDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function buildWeeks(data: Record<string, number>, daysBack: number) {
  // Work entirely in UTC midnight values
  const now = new Date()
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))

  const start = new Date(todayUTC)
  start.setUTCDate(start.getUTCDate() - daysBack)
  // Align to Sunday
  start.setUTCDate(start.getUTCDate() - start.getUTCDay())

  const weeks: { date: Date; count: number }[][] = []
  let week: { date: Date; count: number }[] = []
  const cursor = new Date(start)

  while (cursor <= todayUTC) {
    const key = utcDateKey(cursor)
    week.push({ date: new Date(cursor), count: data[key] ?? 0 })
    if (week.length === 7) { weeks.push(week); week = [] }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  if (week.length) weeks.push(week)
  return weeks
}

function intensityGreen(n: number) {
  if (n === 0) return 'bg-gray-100'
  if (n <= 1)  return 'bg-emerald-200'
  if (n <= 3)  return 'bg-emerald-400'
  if (n <= 6)  return 'bg-emerald-600'
  return 'bg-emerald-800'
}
function intensityBlue(n: number) {
  if (n === 0) return 'bg-gray-100'
  if (n <= 1)  return 'bg-blue-200'
  if (n <= 3)  return 'bg-blue-400'
  if (n <= 6)  return 'bg-blue-600'
  return 'bg-blue-800'
}

export default function ActivityHeatmap({ orgData, myData }: Props) {
  const [view, setView] = useState<'org' | 'me'>('org')
  const [period, setPeriod] = useState<Period>('year')

  const periodDays = PERIOD_OPTIONS.find(p => p.value === period)!.days
  const data = view === 'org' ? orgData : myData
  const colorFn = view === 'org' ? intensityGreen : intensityBlue

  const weeks = useMemo(() => buildWeeks(data, periodDays), [data, periodDays])

  // Count total for selected period
  const now = new Date()
  const cutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  cutoff.setUTCDate(cutoff.getUTCDate() - periodDays)
  const total = Object.entries(data)
    .filter(([k]) => k >= utcDateKey(cutoff))
    .reduce((s, [, n]) => s + n, 0)

  // Month labels: show label at first week of each new month
  const monthLabels: { label: string; col: number }[] = []
  weeks.forEach((week, i) => {
    const d = week[0]?.date
    if (!d) return
    const dom = d.getUTCDate()
    if (dom <= 7) monthLabels.push({ label: MONTHS[d.getUTCMonth()], col: i })
  })

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">Activity</h3>
          <p className="text-xs text-gray-400 mt-0.5">{total} action{total !== 1 ? 's' : ''} in the selected period</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn('px-2.5 py-1 rounded-md text-xs font-medium transition-all',
                  period === p.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Org / Me toggle */}
          <div className="flex gap-0.5 bg-gray-100 rounded-lg p-0.5">
            {(['org', 'me'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all',
                  view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                {v === 'org' ? 'Organization' : 'Me'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max">
          {/* Month labels */}
          <div className="flex ml-8">
            {weeks.map((_, i) => {
              const lbl = monthLabels.find(m => m.col === i)
              return (
                <div key={i} className="w-3 mx-0.5 text-[9px] text-gray-400 text-center">
                  {lbl?.label ?? ''}
                </div>
              )
            })}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAYS.map((d, i) => (
                <div key={i} className="h-3 text-[9px] text-gray-400 leading-3 text-right pr-1 w-6">{d}</div>
              ))}
            </div>

            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={`${day.date.toISOString().slice(0, 10)}: ${day.count} action${day.count !== 1 ? 's' : ''}`}
                    className={cn('w-3 h-3 rounded-sm cursor-default transition-colors', colorFn(day.count))}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-1 ml-8 justify-end">
            <span className="text-[9px] text-gray-400 mr-1">Less</span>
            {[0, 1, 3, 6, 8].map(n => (
              <div key={n} className={cn('w-3 h-3 rounded-sm', colorFn(n))} />
            ))}
            <span className="text-[9px] text-gray-400 ml-1">More</span>
          </div>
        </div>
      </div>
    </div>
  )
}
