import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../apiClient'
import { useAuth } from '../AuthContext'
import { Skeleton } from '../components/Skeleton'

interface TicketRow {
  id: string
  title: string
  category?: string
  priority: string
  status: string
  created_by_name?: string
  assigned_to_name?: string
  deadline?: string | null
  ai_priority_level?: string | null
  ai_priority_score?: number | null
}

export default function TicketListDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tickets, setTickets] = useState<TicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'deadline' | 'priority' | 'ai'>('list')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [searchInput, setSearchInput] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [total, setTotal] = useState<number>(0)
  const pageSize = 20
  const [assigning, setAssigning] = useState(false)
  const [errorVisible, setErrorVisible] = useState(true)
  const [aiSortSuggestion, setAiSortSuggestion] = useState<{
    ticketIds: string[]
    explanation: string
    reasoning: { criticalCount: number; highCount: number; factors: string[] }
  } | null>(null)
  const [requestingSort, setRequestingSort] = useState(false)
  const [sortApplied, setSortApplied] = useState(false)
  const [acceptedSortOrder, setAcceptedSortOrder] = useState<string[] | null>(null)

  const currentUser = {
    name: user?.email || 'Current User',
    role: user?.role === 'admin' ? 'Administrator' : 'Agent',
  }

  // Debounce search input -> searchTerm
  useEffect(() => {
    const handle = setTimeout(() => setSearchTerm(searchInput.trim()), 400)
    return () => clearTimeout(handle)
  }, [searchInput])

  // Auto-hide error message after 3 seconds with fade
  useEffect(() => {
    if (error === 'No unassigned open/in-progress tickets to assign.') {
      setErrorVisible(true)
      const timer = setTimeout(() => {
        setErrorVisible(false)
        // Clear error after fade animation completes
        setTimeout(() => setError(null), 300)
      }, 3000)
      return () => clearTimeout(timer)
    } else {
      setErrorVisible(true)
    }
  }, [error])

  const filters = useMemo(
    () => ({
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      search: searchTerm || undefined,
      page,
    }),
    [statusFilter, priorityFilter, searchTerm, page]
  )

  // Load accepted sort order from localStorage on mount
  useEffect(() => {
    const savedSort = localStorage.getItem('acceptedTicketSort')
    if (savedSort) {
      try {
        const parsed = JSON.parse(savedSort)
        setAcceptedSortOrder(parsed.ticketIds)
        setAiSortSuggestion(parsed.suggestion)
        setSortApplied(true)
      } catch (e) {
        // Invalid data, clear it
        localStorage.removeItem('acceptedTicketSort')
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        setError(null)
        const result = await api.getTickets(filters)
        if (!cancelled) {
          let loadedTickets = result.data || []
          
          // Apply accepted sort order if it exists
          if (acceptedSortOrder && acceptedSortOrder.length > 0) {
            loadedTickets = [...loadedTickets].sort((a, b) => {
              const aIndex = acceptedSortOrder.indexOf(a.id)
              const bIndex = acceptedSortOrder.indexOf(b.id)
              if (aIndex === -1 && bIndex === -1) return 0
              if (aIndex === -1) return 1
              if (bIndex === -1) return -1
              return aIndex - bIndex
            })
          }
          
          setTickets(loadedTickets)
          setTotal(result.pagination?.total ?? 0)
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load tickets')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters, acceptedSortOrder])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
      case 'MEDIUM':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
      case 'LOW':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
      default:
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
      case 'Resolved':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
      case 'Open':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
    }
  }

  const normalizedTickets = useMemo(
    () =>
      tickets.map((t) => {
        const status = t.status?.toLowerCase()
        let statusLabel = 'Open'
        if (status === 'in_progress') statusLabel = 'In Progress'
        else if (status === 'resolved') statusLabel = 'Resolved'

        const priority = t.priority?.toLowerCase()
        let priorityLabel = 'LOW'
        if (priority === 'medium') priorityLabel = 'MEDIUM'
        else if (priority === 'high') priorityLabel = 'HIGH'
        else if (priority === 'critical') priorityLabel = 'CRITICAL'

        return {
          ...t,
          statusLabel,
          statusKey: status || 'open',
          priorityLabel,
        }
      }),
    [tickets]
  )

  // Helper function to categorize deadline
  const getDeadlineCategory = (deadline: string | null | undefined): 'today' | 'tomorrow' | 'next_week' | 'two_weeks' | 'no_deadline' => {
    if (!deadline) return 'no_deadline'
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    
    // Reset time to start of day for comparison
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate())
    
    const diffDays = Math.floor((deadlineDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'today' // Past deadlines go to today
    if (diffDays === 0) return 'today'
    if (diffDays === 1) return 'tomorrow'
    if (diffDays >= 2 && diffDays <= 7) return 'next_week'
    if (diffDays >= 8 && diffDays <= 14) return 'two_weeks'
    return 'two_weeks' // Anything further goes to two weeks
  }

  // Helper function to get deadline for a category
  const getDeadlineForCategory = (category: 'today' | 'tomorrow' | 'next_week' | 'two_weeks' | 'no_deadline'): string | null => {
    if (category === 'no_deadline') return null
    
    const now = new Date()
    const targetDate = new Date(now)
    
    switch (category) {
      case 'today':
        targetDate.setHours(17, 0, 0, 0)
        break
      case 'tomorrow':
        targetDate.setDate(targetDate.getDate() + 1)
        targetDate.setHours(17, 0, 0, 0)
        break
      case 'next_week':
        targetDate.setDate(targetDate.getDate() + 7)
        targetDate.setHours(17, 0, 0, 0)
        break
      case 'two_weeks':
        targetDate.setDate(targetDate.getDate() + 14)
        targetDate.setHours(17, 0, 0, 0)
        break
    }
    
    return targetDate.toISOString()
  }

  const handleDeadlineDrop = (columnKey: 'today' | 'tomorrow' | 'next_week' | 'two_weeks' | 'no_deadline') => async (e: React.DragEvent) => {
    e.preventDefault()
    const ticketId = e.dataTransfer.getData('text/plain')
    if (!ticketId) return

    const newDeadline = getDeadlineForCategory(columnKey)

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              deadline: newDeadline,
            }
          : t
      )
    )

    try {
      await api.updateTicket(ticketId, { deadline: newDeadline })
    } catch (err: any) {
      // revert by refetching
      try {
        const result = await api.getTickets(filters)
        setTickets(result.data || [])
        setTotal(result.pagination?.total ?? 0)
      } catch (err2) {
        setError(err.message || 'Failed to update ticket deadline')
      }
    }
  }

  const handlePriorityDrop = (priority: 'low' | 'medium' | 'high' | 'critical') => async (e: React.DragEvent) => {
    e.preventDefault()
    const ticketId = e.dataTransfer.getData('text/plain')
    if (!ticketId) return

    // Optimistic update
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              priority: priority,
            }
          : t
      )
    )

    try {
      await api.updateTicket(ticketId, { priority })
    } catch (err: any) {
      // revert by refetching
      try {
        const result = await api.getTickets(filters)
        setTickets(result.data || [])
        setTotal(result.pagination?.total ?? 0)
      } catch (err2) {
        setError(err.message || 'Failed to update ticket priority')
      }
    }
  }

  const handleCardDragStart = (id: string) => (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <Layout headerTitle="Ticket List" currentUser={currentUser}>
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Active Tickets</h1>
          <p className="text-slate-500 mt-1 flex items-center gap-2">
            <span className="inline-flex items-center justify-center size-2 rounded-full bg-primary animate-pulse"></span>
            {tickets.length} tickets currently visible
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-slate-800 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">view_list</span> List
            </button>
            <button
              onClick={() => setViewMode('deadline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                viewMode === 'deadline'
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">event</span> Deadline
            </button>
            <button
              onClick={() => setViewMode('priority')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                viewMode === 'priority'
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">flag</span> Priority
            </button>
            <button
              onClick={() => setViewMode('ai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                viewMode === 'ai'
                  ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                  : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span> AI Kanban
            </button>
          </div>
          <button
            onClick={async () => {
              try {
                setRequestingSort(true)
                setError(null)
                const suggestion = await api.suggestTicketSort({
                  status: statusFilter !== 'all' ? statusFilter : undefined,
                  priority: priorityFilter !== 'all' ? priorityFilter : undefined,
                  search: searchTerm || undefined,
                })
                setAiSortSuggestion(suggestion)
                // Don't reset sortApplied here - keep the current sort applied until user accepts new one
              } catch (err: any) {
                setError(err.message || 'Failed to get AI sort suggestion')
              } finally {
                setRequestingSort(false)
              }
            }}
            disabled={requestingSort || loading}
            className="bg-primary/10 text-primary border border-primary/20 rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 hover:bg-primary/20 transition-colors disabled:opacity-60"
          >
            {requestingSort ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                AI Suggest Sort
              </>
            )}
          </button>
          <button
            onClick={async () => {
              try {
                setAssigning(true)
                setError(null)
                setErrorVisible(true)
                const unassigned = normalizedTickets.filter(
                  (t) => !t.assigned_to_name && (t.statusKey === 'open' || t.statusKey === 'in_progress')
                )
                if (unassigned.length === 0) {
                  setError('No unassigned open/in-progress tickets to assign.')
                  setAssigning(false)
                  return
                }
                await Promise.all(unassigned.map((t) => api.smartAssign(t.id)))
                // Refresh list
                const result = await api.getTickets(filters)
                setTickets(result.data || [])
                setTotal(result.pagination?.total ?? 0)
              } catch (err: any) {
                setError(err.message || 'Smart Assign failed')
              } finally {
                setAssigning(false)
              }
            }}
            disabled={assigning || loading}
            className="bg-primary text-white rounded-xl px-4 py-2.5 text-sm font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-60"
          >
            {assigning ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">bolt</span>
                AI Smart Assign
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 mb-6 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={statusFilter}
            onChange={(e) => {
              setPage(1)
              setStatusFilter(e.target.value)
            }}
            className="h-9 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3"
          >
            <option value="all">Status: All</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => {
              setPage(1)
              setPriorityFilter(e.target.value)
            }}
            className="h-9 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3"
          >
            <option value="all">Priority: All</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 h-9">
            <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
            <input
              value={searchInput}
              onChange={(e) => {
                setPage(1)
                setSearchInput(e.target.value)
              }}
              placeholder="Search tickets..."
              className="bg-transparent border-none outline-none text-sm px-2 w-52"
            />
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="size-9 flex items-center justify-center rounded-lg text-slate-500 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="size-9 flex items-center justify-center rounded-lg text-slate-500 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
        </div>
      </div>

      {aiSortSuggestion && !sortApplied && (
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 border-2 border-primary/30 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="bg-primary/20 p-3 rounded-lg">
              <span className="material-symbols-outlined text-primary text-2xl">auto_awesome</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">AI Sort Suggestion</h3>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-[10px] font-bold rounded-full">NEW</span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4 leading-relaxed">
                {aiSortSuggestion.explanation}
              </p>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 mb-4">
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Key Factors:
                </p>
                <ul className="space-y-1">
                  {aiSortSuggestion.reasoning.factors.map((factor, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-sm">check_circle</span>
                      {factor}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-400">Critical:</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">{aiSortSuggestion.reasoning.criticalCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-600 dark:text-slate-400">High:</span>
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{aiSortSuggestion.reasoning.highCount}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    // Apply the sort by reordering tickets
                    const sortedTickets = [...tickets].sort((a, b) => {
                      const aIndex = aiSortSuggestion.ticketIds.indexOf(a.id)
                      const bIndex = aiSortSuggestion.ticketIds.indexOf(b.id)
                      if (aIndex === -1 && bIndex === -1) return 0
                      if (aIndex === -1) return 1
                      if (bIndex === -1) return -1
                      return aIndex - bIndex
                    })
                    setTickets(sortedTickets)
                    setSortApplied(true)
                    setAcceptedSortOrder(aiSortSuggestion.ticketIds)
                    
                    // Save to localStorage for persistence
                    localStorage.setItem('acceptedTicketSort', JSON.stringify({
                      ticketIds: aiSortSuggestion.ticketIds,
                      suggestion: aiSortSuggestion,
                      timestamp: Date.now(),
                    }))
                  }}
                  className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-md"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Accept & Apply Sort
                </button>
                <button
                  onClick={() => {
                    setAiSortSuggestion(null)
                    // Don't reset sortApplied or acceptedSortOrder if user just dismisses the banner
                    // They might have already accepted a sort previously
                  }}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {sortApplied && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
              AI sort order has been applied. Tickets are now sorted by AI priority score.
            </span>
          </div>
          <button
            onClick={async () => {
              // Reset to default sort
              const result = await api.getTickets(filters)
              setTickets(result.data || [])
              setTotal(result.pagination?.total ?? 0)
              setAiSortSuggestion(null)
              setSortApplied(false)
              setAcceptedSortOrder(null)
              
              // Clear from localStorage
              localStorage.removeItem('acceptedTicketSort')
            }}
            className="text-xs font-bold text-green-700 dark:text-green-400 hover:underline"
          >
            Reset to Default
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div
            className={`px-6 py-3 text-xs text-red-500 border-b border-red-100 bg-red-50 dark:bg-red-900/20 dark:border-red-900/30 transition-opacity duration-300 ${
              errorVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {error}
          </div>
        )}

        {viewMode === 'list' ? (
          <>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Title</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Assigned</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading &&
                  Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`sk-${idx}`}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-3 w-16" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-3 w-20" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-5 w-16 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Skeleton className="h-6 w-6 ml-auto" />
                      </td>
                    </tr>
                  ))}
                {!loading && normalizedTickets.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-sm text-slate-500" colSpan={7}>
                      No tickets found. Try creating a new ticket.
                    </td>
                  </tr>
                )}
                {normalizedTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-colors group cursor-pointer"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-medium text-slate-500 truncate block max-w-[120px]" title={ticket.id}>#{ticket.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{ticket.title}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                        {ticket.category || '—'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityClass(
                          ticket.priorityLabel
                        )}`}
                      >
                        {ticket.priorityLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${getStatusClass(
                          ticket.statusLabel
                        )}`}
                      >
                        <span className="size-1.5 rounded-full bg-blue-500"></span>
                        {ticket.statusLabel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {ticket.assigned_to_name ? (
                        <div className="flex items-center gap-2">
                          <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm text-primary">person</span>
                          </div>
                          <span className="text-xs font-semibold">{ticket.assigned_to_name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400">
                          <div className="size-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-sm">person</span>
                          </div>
                          <span className="text-xs font-medium">Unassigned</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-slate-400 hover:text-primary">more_vert</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <p className="text-xs text-slate-500 font-medium">
                {loading ? <Skeleton className="h-3 w-40" /> : `Showing ${tickets.length} of ${total} tickets`}
              </p>
            </div>
          </>
        ) : (
          <div className="p-4">
            {viewMode === 'deadline' && (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { key: 'today', label: 'Due Today' },
                  { key: 'tomorrow', label: 'Tomorrow' },
                  { key: 'next_week', label: 'Next Week' },
                  { key: 'two_weeks', label: 'In Two Weeks' },
                  { key: 'no_deadline', label: 'No Deadline' },
                ].map(({ key, label }) => {
                  const columnKey = key as 'today' | 'tomorrow' | 'next_week' | 'two_weeks' | 'no_deadline'
                  const columnTickets = normalizedTickets.filter((t) => getDeadlineCategory(t.deadline) === columnKey)

                  return (
                    <div
                      key={columnKey}
                      className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[240px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleDeadlineDrop(columnKey)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {columnTickets.length}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {loading &&
                          Array.from({ length: 3 }).map((_, idx) => (
                            <div
                              key={`sk-k-${columnKey}-${idx}`}
                              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                            >
                              <Skeleton className="h-3 w-3/4 mb-2" />
                              <Skeleton className="h-2 w-1/2" />
                            </div>
                          ))}
                        {!loading && columnTickets.length === 0 && (
                          <p className="text-[11px] text-slate-400 mt-2">No tickets in this column.</p>
                        )}
                        {!loading &&
                          columnTickets.map((ticket) => (
                            <button
                              key={ticket.id}
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              draggable
                              onDragStart={handleCardDragStart(ticket.id)}
                              className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:border-primary/60 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[11px] font-mono text-slate-400 truncate max-w-[100px]" title={ticket.id}>#{ticket.id}</span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityClass(
                                    ticket.priorityLabel
                                  )}`}
                                >
                                  {ticket.priorityLabel}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                                {ticket.title}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[11px] text-slate-400">{ticket.assigned_to_name || 'Unassigned'}</p>
                                {ticket.deadline && (
                                  <p className="text-[10px] text-slate-500">
                                    {new Date(ticket.deadline).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {viewMode === 'priority' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { key: 'low', label: 'Low Priority' },
                  { key: 'medium', label: 'Medium Priority' },
                  { key: 'high', label: 'High Priority' },
                  { key: 'critical', label: 'Critical Priority' },
                ].map(({ key, label }) => {
                  const priorityKey = key as 'low' | 'medium' | 'high' | 'critical'
                  const columnTickets = normalizedTickets.filter((t) => t.priority?.toLowerCase() === priorityKey)

                  return (
                    <div
                      key={priorityKey}
                      className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[240px]"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handlePriorityDrop(priorityKey)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {columnTickets.length}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {loading &&
                          Array.from({ length: 3 }).map((_, idx) => (
                            <div
                              key={`sk-p-${priorityKey}-${idx}`}
                              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                            >
                              <Skeleton className="h-3 w-3/4 mb-2" />
                              <Skeleton className="h-2 w-1/2" />
                            </div>
                          ))}
                        {!loading && columnTickets.length === 0 && (
                          <p className="text-[11px] text-slate-400 mt-2">No tickets in this column.</p>
                        )}
                        {!loading &&
                          columnTickets.map((ticket) => (
                            <button
                              key={ticket.id}
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              draggable
                              onDragStart={handleCardDragStart(ticket.id)}
                              className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:border-primary/60 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[11px] font-mono text-slate-400 truncate max-w-[100px]" title={ticket.id}>#{ticket.id}</span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityClass(
                                    ticket.priorityLabel
                                  )}`}
                                >
                                  {ticket.priorityLabel}
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                                {ticket.title}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[11px] text-slate-400">{ticket.assigned_to_name || 'Unassigned'}</p>
                                {ticket.deadline && (
                                  <p className="text-[10px] text-slate-500">
                                    {new Date(ticket.deadline).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {viewMode === 'ai' && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { key: 'low', label: 'AI: Low Priority' },
                  { key: 'medium', label: 'AI: Medium Priority' },
                  { key: 'high', label: 'AI: High Priority' },
                  { key: 'critical', label: 'AI: Critical Priority' },
                ].map(({ key, label }) => {
                  const aiPriorityKey = key as 'low' | 'medium' | 'high' | 'critical'
                  const columnTickets = normalizedTickets.filter((t) => {
                    const aiPriority = t.ai_priority_level?.toLowerCase()
                    return aiPriority === aiPriorityKey || (!aiPriority && aiPriorityKey === 'low')
                  })

                  return (
                    <div
                      key={aiPriorityKey}
                      className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col min-h-[240px]"
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-xs text-primary">auto_awesome</span>
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                            {columnTickets.length}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        {loading &&
                          Array.from({ length: 3 }).map((_, idx) => (
                            <div
                              key={`sk-ai-${aiPriorityKey}-${idx}`}
                              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3"
                            >
                              <Skeleton className="h-3 w-3/4 mb-2" />
                              <Skeleton className="h-2 w-1/2" />
                            </div>
                          ))}
                        {!loading && columnTickets.length === 0 && (
                          <p className="text-[11px] text-slate-400 mt-2">No tickets in this column.</p>
                        )}
                        {!loading &&
                          columnTickets.map((ticket) => (
                            <button
                              key={ticket.id}
                              onClick={() => navigate(`/tickets/${ticket.id}`)}
                              className="w-full text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 hover:border-primary/60 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-[11px] font-mono text-slate-400 truncate max-w-[100px]" title={ticket.id}>#{ticket.id}</span>
                                <div className="flex items-center gap-1">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${getPriorityClass(
                                      ticket.priorityLabel
                                    )}`}
                                  >
                                    {ticket.priorityLabel}
                                  </span>
                                  {ticket.ai_priority_score && (
                                    <span className="text-[9px] text-slate-500 font-semibold">
                                      AI: {Math.round(ticket.ai_priority_score * 10)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
                                {ticket.title}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-[11px] text-slate-400">{ticket.assigned_to_name || 'Unassigned'}</p>
                                {ticket.deadline && (
                                  <p className="text-[10px] text-slate-500">
                                    {new Date(ticket.deadline).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </button>
                          ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  )
}
