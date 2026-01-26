import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { api } from '../apiClient'
import { useAuth } from '../AuthContext'
import { Skeleton } from '../components/Skeleton'

interface Summary {
  total: number
  status: { status: string; count: number }[]
  priority: { priority: string; count: number }[]
}

export default function AdminAnalyticsOverview() {
  const { user } = useAuth()
  const currentUser = {
    name: user?.email || 'Admin',
    role: user?.role || 'Admin',
  }

  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await api.getTicketSummary()
        if (!cancelled) setSummary(data)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load analytics')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const statusCount = (key: string) =>
    summary?.status?.find((s) => s.status === key)?.count ?? 0
  const priorityCount = (key: string) =>
    summary?.priority?.find((p) => p.priority === key)?.count ?? 0

  return (
    <Layout headerTitle="Admin Analytics Overview" currentUser={currentUser}>
      <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Live ticket analytics</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => api.exportTickets('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span className="material-symbols-outlined text-gray-400">download</span>
              Export CSV
            </button>
            <button
              onClick={() => api.exportTickets('json')}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 transition-all"
            >
              <span className="material-symbols-outlined">download</span>
              Export JSON
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {loading ? (
            <>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={`sk-a-${i}`}
                  className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm"
                >
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-9 w-20 mt-4" />
                </div>
              ))}
            </>
          ) : (
            <>
              <StatCard label="Total Tickets" value={summary?.total ?? 0} />
              <StatCard label="Open Tickets" value={statusCount('open')} accent="amber" />
              <StatCard label="In Progress" value={statusCount('in_progress')} accent="blue" />
              <StatCard label="Resolved" value={statusCount('resolved')} accent="emerald" />
            </>
          )}
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7 bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-bold">Tickets by Priority</h3>
                <p className="text-sm text-gray-500">Live counts</p>
              </div>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={`sk-m-${i}`} className="p-4 rounded-lg border border-gray-100 dark:border-zinc-800">
                    <Skeleton className="h-3 w-14" />
                    <Skeleton className="h-8 w-10 mt-3" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MiniStat label="Low" value={priorityCount('low')} color="gray" />
                <MiniStat label="Medium" value={priorityCount('medium')} color="primary" />
                <MiniStat label="High" value={priorityCount('high')} color="primary-strong" />
                <MiniStat label="Critical" value={priorityCount('critical')} color="red" />
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-5 bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col">
            <div className="mb-4">
              <h3 className="text-lg font-bold">Status Snapshot</h3>
              <p className="text-sm text-gray-500">Open vs resolved</p>
            </div>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={`sk-b-${i}`}>
                    <div className="flex justify-between mb-2">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <Bar label="Open" value={statusCount('open')} total={summary?.total ?? 0} color="amber" />
                <Bar label="In Progress" value={statusCount('in_progress')} total={summary?.total ?? 0} color="blue" />
                <Bar label="Resolved" value={statusCount('resolved')} total={summary?.total ?? 0} color="emerald" />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: 'amber' | 'emerald' | 'blue' }) {
  const color = accent === 'amber' ? 'text-amber-500' : accent === 'emerald' ? 'text-emerald-500' : accent === 'blue' ? 'text-blue-500' : 'text-slate-900 dark:text-white'
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm flex flex-col gap-1">
      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <div className="flex items-baseline justify-between mt-2">
        <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      </div>
    </div>
  )
}

function MiniStat({ label, value, color }: { label: string; value: number; color: 'gray' | 'primary' | 'primary-strong' | 'red' }) {
  const colorClass =
    color === 'primary'
      ? 'bg-primary/20 text-primary'
      : color === 'primary-strong'
        ? 'bg-primary text-white'
        : color === 'red'
          ? 'bg-red-500 text-white'
          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-100'

  return (
    <div className={`p-4 rounded-lg border border-transparent ${color === 'gray' ? 'border-slate-200 dark:border-slate-700' : 'border-transparent'} ${colorClass}`}>
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold mt-1">{value}</p>
    </div>
  )
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: 'amber' | 'emerald' | 'blue' }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  const barColor =
    color === 'amber' ? 'bg-amber-400' : color === 'emerald' ? 'bg-emerald-500' : 'bg-blue-500'

  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-gray-500 mb-1">
        <span>{label}</span>
        <span>{value} ({percent}%)</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  )
}
