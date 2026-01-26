import { FormEvent, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../apiClient'
import { useAuth } from '../AuthContext'
import { Skeleton, SkeletonText } from '../components/Skeleton'

interface TicketDetailsResponse {
  id: string
  title: string
  description: string
  status: string
  priority: string
  deadline?: string | null
  created_at: string
  created_by_name?: string
  assigned_to_name?: string
  assigned_to?: string
  predicted_category?: string
  category_confidence?: number
  urgency_score?: number
  urgency_level?: string
  sentiment_score?: number
  sentiment_label?: string
  priority_score?: number
  priority_level?: string
  summary?: string
  suggested_steps?: string
  explanation_json?: {
    reasoning?: string
    [key: string]: any
  }
}

interface Comment {
  id: string
  message: string
  created_at: string
  author_name?: string
}

function formatActivityLog(message: string, users: { id: string; name: string }[]): string {
  // Check if this is an activity log
  const activityMatch = message.match(/^\[ACTIVITY\] (.+?): (.+)$/)
  if (!activityMatch) {
    return message // Return as-is if not an activity log
  }

  const action = activityMatch[1]
  let details: Record<string, any> = {}
  
  try {
    details = JSON.parse(activityMatch[2] || '{}')
  } catch {
    return message // Return as-is if JSON parsing fails
  }

  if (action === 'ticket_updated') {
    const changes: string[] = []
    
    if (details.status) {
      const statusLabel = details.status === 'in_progress' ? 'In Progress' 
        : details.status === 'resolved' ? 'Resolved' 
        : 'Open'
      changes.push(`status changed to ${statusLabel}`)
    }
    
    if (details.priority) {
      const priorityLabel = details.priority.charAt(0).toUpperCase() + details.priority.slice(1)
      changes.push(`priority set to ${priorityLabel}`)
    }
    
    if (details.assignedTo !== undefined) {
      if (details.assignedTo === null) {
        changes.push('assignment removed')
      } else {
        const assignedUser = users.find(u => u.id === details.assignedTo)
        const assignedName = assignedUser ? assignedUser.name : 'Unknown User'
        changes.push(`assigned to ${assignedName}`)
      }
    }
    
    if (details.title) {
      if (details.title.from && details.title.to) {
        changes.push(`title changed from "${details.title.from}" to "${details.title.to}"`)
      } else {
        changes.push(`title updated`)
      }
    }
    
    if (details.description) {
      if (details.description.changed) {
        changes.push('description updated')
      }
    }
    
    if (details.deadline !== undefined) {
      if (details.deadline === null) {
        changes.push('deadline removed')
      } else {
        const deadlineDate = new Date(details.deadline)
        changes.push(`deadline set to ${deadlineDate.toLocaleString()}`)
      }
    }
    
    if (changes.length === 0) {
      return 'Ticket updated'
    }
    
    return `Updated ticket: ${changes.join(', ')}`
  }
  
  // Fallback for other activity types
  return `${action}: ${JSON.stringify(details)}`
}

export default function TicketDetails() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const currentUser = {
    name: user?.email || 'Current User',
    role: user?.role === 'admin' ? 'Administrator' : 'Agent',
    avatar:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB7gSLzQ6CD5NxvejH2LK-XTPYAdjMn6ApAiddAPXXN-6Bdy2aL-8oUPqrrPVST1r7jTCk2UXZEtMFUU81GyZAuNRLH0wuYxvu3k-vNZ9BrCdNzA6UkTcu9Esk8G5gaKWsItyub8xgdy1vey1pnPjm7N7nagTaLSFywzuezwZYLef_HQ8nMh-md7HgMmxFYdiCgncPXKnO3eUBhe6peTBsMRYw6pgWwjtT5xdYcPnJ-QBjsYfRFJZcP5jgSs5Lgq3DN0fYoc8qGkOQ',
  }

  const [ticket, setTicket] = useState<TicketDetailsResponse | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [updating, setUpdating] = useState(false)
  const [statusDraft, setStatusDraft] = useState<'open' | 'in_progress' | 'resolved'>('open')
  const [assignedDraft, setAssignedDraft] = useState<string | null>(null)
  const [priorityDraft, setPriorityDraft] = useState<'low' | 'medium' | 'high' | 'critical'>('low')
  const [editMode, setEditMode] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [deadlineDraft, setDeadlineDraft] = useState<string>('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    let cancelled = false
    async function load() {
      if (!id) return // Type guard for TypeScript
      try {
        setLoading(true)
        const [ticketRes, commentsRes, usersRes] = await Promise.all([
          api.getTicketDetails(id),
          api.getTicketComments(id),
          user?.role === 'admin' ? api.getUsers() : Promise.resolve({ data: [] }),
        ])
        if (!cancelled) {
          setTicket(ticketRes)
          setComments(commentsRes.data || [])
          setStatusDraft(ticketRes.status || 'open')
          setAssignedDraft(ticketRes.assigned_to ?? null)
          setPriorityDraft(ticketRes.priority || 'low')
          setTitleDraft(ticketRes.title || '')
          setDescriptionDraft(ticketRes.description || '')
          // Convert deadline to datetime-local format (YYYY-MM-DDTHH:mm)
          if (ticketRes.deadline) {
            const deadlineDate = new Date(ticketRes.deadline)
            const year = deadlineDate.getFullYear()
            const month = String(deadlineDate.getMonth() + 1).padStart(2, '0')
            const day = String(deadlineDate.getDate()).padStart(2, '0')
            const hours = String(deadlineDate.getHours()).padStart(2, '0')
            const minutes = String(deadlineDate.getMinutes()).padStart(2, '0')
            setDeadlineDraft(`${year}-${month}-${day}T${hours}:${minutes}`)
          } else {
            setDeadlineDraft('')
          }
          if (usersRes.data) {
            setUsers(usersRes.data.map((u: any) => ({ id: u.id, name: u.name || u.email })))
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load ticket')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [id])

  async function handleAddComment(e: FormEvent) {
    e.preventDefault()
    if (!id || !commentText.trim()) return
    const ticketId = id // Type guard
    try {
      setCommentSubmitting(true)
      const newComment = await api.addTicketComment(ticketId, commentText.trim())
      setComments((prev) => [...prev, newComment])
      setCommentText('')
    } catch (err: any) {
      setError(err.message || 'Failed to add comment')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const createdDate =
    ticket && ticket.created_at ? new Date(ticket.created_at).toLocaleString() : '—'

  const statusLabel =
    statusDraft === 'in_progress' ? 'In Progress' : statusDraft === 'resolved' ? 'Resolved' : 'Open'
  const statusBadgeClass =
    statusDraft === 'resolved'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : statusDraft === 'in_progress'
        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'

  const priorityLabel = priorityDraft.charAt(0).toUpperCase() + priorityDraft.slice(1)
  const priorityBadgeClass =
    priorityDraft === 'critical'
      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
      : priorityDraft === 'high'
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
        : priorityDraft === 'medium'
          ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'

  async function handleUpdateTicket() {
    if (!id) return
    const ticketId = id // Type guard
    setUpdating(true)
    try {
      // Convert deadline to ISO 8601 format if provided
      let deadlineISO: string | null = null
      if (deadlineDraft) {
        deadlineISO = new Date(deadlineDraft).toISOString()
      }

      const updated = await api.updateTicket(ticketId, {
        status: statusDraft,
        priority: priorityDraft,
        assignedTo: assignedDraft,
        title: editMode ? titleDraft : undefined,
        description: editMode ? descriptionDraft : undefined,
        deadline: deadlineISO,
      })
      setTicket((prev) => (prev ? { ...prev, ...updated } : updated))
      setEditMode(false)
      // Reload comments to show the new activity log
      const commentsRes = await api.getTicketComments(ticketId)
      setComments(commentsRes.data || [])
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket')
    } finally {
      setUpdating(false)
    }
  }

  function handleCancelEdit() {
    setEditMode(false)
    setTitleDraft(ticket?.title || '')
    setDescriptionDraft(ticket?.description || '')
    if (ticket?.deadline) {
      const deadlineDate = new Date(ticket.deadline)
      const year = deadlineDate.getFullYear()
      const month = String(deadlineDate.getMonth() + 1).padStart(2, '0')
      const day = String(deadlineDate.getDate()).padStart(2, '0')
      const hours = String(deadlineDate.getHours()).padStart(2, '0')
      const minutes = String(deadlineDate.getMinutes()).padStart(2, '0')
      setDeadlineDraft(`${year}-${month}-${day}T${hours}:${minutes}`)
    } else {
      setDeadlineDraft('')
    }
  }

  async function handleDeleteTicket() {
    if (!id) return
    const ticketId = id // Type guard
    setDeleting(true)
    setError(null) // Clear any previous errors
    try {
      console.log('Deleting ticket:', ticketId)
      const result = await api.deleteTicket(ticketId)
      console.log('Delete result:', result)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      console.error('Delete error:', err)
      setError(err.message || 'Failed to delete ticket')
      // Don't close the dialog on error so user can see the error message
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="flex flex-col lg:flex-row gap-8 p-8 overflow-y-visible">
        <div className="flex-[3] flex flex-col gap-6">
          <div className="flex items-center gap-2 px-8 py-4">
            <a className="text-gray-500 text-xs font-semibold hover:text-primary transition-colors" href="#">
              Service Desk
            </a>
            <span className="text-gray-300 text-xs">/</span>
            <a className="text-gray-500 text-xs font-semibold hover:text-primary transition-colors" href="#">
              Active Tickets
            </a>
            <span className="text-gray-300 text-xs">/</span>
            <span className="text-primary text-xs font-bold bg-primary/10 px-2 py-0.5 rounded">
              TICKET-{id}
            </span>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-4 px-8 pb-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex-1 min-w-[300px]">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-2/3" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-24 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </div>
              ) : editMode ? (
                <input
                  className="w-full text-3xl font-black leading-tight tracking-tight bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2"
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                />
              ) : (
                <h1 className="text-gray-900 dark:text-white text-3xl font-black leading-tight tracking-tight">
                  {ticket?.title || (loading ? 'Loading ticket...' : 'Ticket not found')}
                </h1>
              )}
              <div className="flex items-center gap-3 mt-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${statusBadgeClass}`}>
                  <span className="size-1.5 rounded-full bg-current opacity-60"></span>
                  {statusLabel}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${priorityBadgeClass}`}>
                  {priorityLabel}
                </span>
                <span className="text-gray-400 text-xs">•</span>
                <p className="text-gray-500 text-xs font-medium">
                  Created on{' '}
                  <span className="text-gray-700 dark:text-gray-300">{createdDate}</span> by{' '}
                  <span className="text-gray-700 dark:text-gray-300">
                    {ticket?.created_by_name || 'Unknown'}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {loading ? (
                <>
                  <Skeleton className="h-10 w-20 rounded-lg" />
                  <Skeleton className="h-10 w-28 rounded-lg" />
                </>
              ) : !editMode ? (
                <>
                  {user?.role === 'admin' && (
                    <button
                      onClick={() => {
                        console.log('Delete button clicked, opening confirmation dialog')
                        setShowDeleteConfirm(true)
                      }}
                      className="flex items-center justify-center rounded-lg h-10 px-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-bold shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <span className="material-symbols-outlined mr-2 text-lg">delete</span>
                      Delete
                    </button>
                  )}
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center justify-center rounded-lg h-10 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold shadow-sm"
                  >
                    <span className="material-symbols-outlined mr-2 text-lg">edit</span>
                    Edit
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center justify-center rounded-lg h-10 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 text-sm font-bold shadow-sm"
                  >
                    <span className="material-symbols-outlined mr-2 text-lg">close</span>
                    Cancel
                  </button>

                  <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 h-10 shadow-sm">
                    <label className="text-xs font-semibold text-gray-500">Status</label>
                    <select
                      value={statusDraft}
                      onChange={(e) => setStatusDraft(e.target.value as 'open' | 'in_progress' | 'resolved')}
                      className="text-xs font-semibold bg-transparent outline-none"
                    >
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 h-10 shadow-sm">
                    <label className="text-xs font-semibold text-gray-500">Priority</label>
                    <select
                      value={priorityDraft}
                      onChange={(e) => setPriorityDraft(e.target.value as 'low' | 'medium' | 'high' | 'critical')}
                      className="text-xs font-semibold bg-transparent outline-none"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  {user?.role === 'admin' && (
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 h-10 shadow-sm">
                      <label className="text-xs font-semibold text-gray-500">Assignee</label>
                      <select
                        value={assignedDraft || ''}
                        onChange={(e) => setAssignedDraft(e.target.value || null)}
                        className="text-xs font-semibold bg-transparent outline-none max-w-[180px]"
                      >
                        <option value="">Unassigned</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 h-10 shadow-sm">
                    <label className="text-xs font-semibold text-gray-500">Deadline</label>
                    <input
                      type="datetime-local"
                      value={deadlineDraft}
                      onChange={(e) => setDeadlineDraft(e.target.value)}
                      className="text-xs font-semibold bg-transparent outline-none"
                    />
                  </div>

                  <button
                    onClick={handleUpdateTicket}
                    disabled={updating}
                    className="flex items-center justify-center rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold shadow-sm disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined mr-2 text-lg">save</span>
                    {updating ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Assignee</p>
                <div className="flex items-center gap-2">
                  {loading ? (
                    <>
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-4 w-24" />
                    </>
                  ) : (
                    <>
                      <div className="size-6 rounded-full bg-center bg-cover" style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuDo2pJS3S5DvDYoeYThjWNKeqtxrdT4h4N7PpanVhFMCpM1uM8158bVlXcRSl6HFtn3lXUVaX7YysXYgww5R8fSGb9DCvjvRPGZIEHWiVXHcGBUHSGlmb1-1x-lHteXgYp1bxgE_z-buz0vYcA2SjF8_dTjUw8NHMdGUlTEwEpFHlonWCuCXPrIgJWfCDoKP4ed90gvzzTDqLq3W_Xx21AzCGgNTMN_Z7hS40nwwqo8LDyYl3EnyqTUfaeSK7ZeXCR1DD8Z3Jp_qdc')` }}></div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                        {ticket?.assigned_to_name || 'Unassigned'}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Priority</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500 text-lg">keyboard_double_arrow_up</span>
                  {loading ? <Skeleton className="h-4 w-16" /> : (
                    <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {ticket?.priority || '—'}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Deadline</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-lg">event</span>
                  {loading ? <Skeleton className="h-4 w-32" /> : (
                    <span className={`text-sm font-semibold ${
                      ticket?.deadline 
                        ? new Date(ticket.deadline) < new Date()
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-800 dark:text-gray-200'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {ticket?.deadline 
                        ? new Date(ticket.deadline).toLocaleString()
                        : 'No deadline'}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Source</p>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-gray-400 text-lg">language</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Web Portal</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-gray-900 dark:text-white font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">description</span>
              Description
            </h3>
            {loading ? (
              <SkeletonText lines={6} />
            ) : editMode ? (
              <textarea
                className="w-full min-h-[160px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 text-sm text-gray-700 dark:text-gray-300"
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
              />
            ) : (
              <div className="prose dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 text-sm leading-relaxed space-y-4 whitespace-pre-wrap">
                <p>{ticket?.description || 'No description available.'}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-900 dark:text-white font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">forum</span>
                Activity Log
              </h3>
              <div className="flex gap-2">
                <button className="text-xs font-bold text-primary px-2 py-1 rounded hover:bg-primary/5">Newest First</button>
                <button className="text-xs font-bold text-gray-400 px-2 py-1 rounded">All Logs</button>
              </div>
            </div>

            <div className="space-y-3">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-800 flex gap-4"
                >
                  <div className="shrink-0">
                    <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {(c.author_name || '?').charAt(0)}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">
                        {c.author_name || 'User'}
                      </span>
                      <span className="text-[10px] text-gray-400 ml-auto">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {formatActivityLog(c.message, users)}
                    </p>
                  </div>
                </div>
              ))}
              {!loading && comments.length === 0 && (
                <p className="text-xs text-gray-400">No comments yet. Start the conversation.</p>
              )}
            </div>

            <form
              onSubmit={handleAddComment}
              className="bg-white dark:bg-gray-900 rounded-xl p-2 shadow-sm border border-gray-200 dark:border-gray-700 focus-within:border-primary transition-colors"
            >
              <textarea
                className="w-full border-none focus:ring-0 bg-transparent text-sm min-h-[100px] resize-none p-4 placeholder:text-gray-400"
                placeholder="Type a message or use '/' for internal commands..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              ></textarea>
              <div className="flex items-center justify-between p-2 border-t border-gray-100 dark:border-gray-800">
                <div className="flex gap-1">
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 transition-colors">
                    <span className="material-symbols-outlined text-xl">attach_file</span>
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 transition-colors">
                    <span className="material-symbols-outlined text-xl">alternate_email</span>
                  </button>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-400 transition-colors">
                    <span className="material-symbols-outlined text-xl">mood</span>
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={commentSubmitting || !commentText.trim()}
                  className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow-md shadow-primary/20 disabled:bg-primary/60 disabled:cursor-not-allowed"
                >
                  {commentSubmitting ? 'Sending...' : 'Send'}
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="flex-[1.2] min-w-[320px]">
          <div className="bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 p-6 sticky top-0 ai-glow">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-white">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                </div>
                <h3 className="text-gray-900 dark:text-white font-bold">AI Analysis</h3>
              </div>
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded border border-primary/20 tracking-widest uppercase">Live Insights</span>
            </div>

            <div className="space-y-8">
              <div className="flex items-center gap-6">
                <div className="relative size-20">
                  <svg className="size-full -rotate-90" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                    <circle className="stroke-current text-gray-200 dark:text-gray-800" cx="18" cy="18" fill="none" r="16" strokeWidth="3"></circle>
                    <circle className="stroke-current text-primary" cx="18" cy="18" fill="none" r="16" strokeDasharray="100" strokeDashoffset="15" strokeLinecap="round" strokeWidth="3"></circle>
                  </svg>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                  <span className="text-lg font-black text-gray-900 dark:text-white">
                    {ticket?.priority_score ?? 0}
                  </span>
                    <p className="text-[8px] text-gray-500 font-bold uppercase">Priority</p>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Impact Level</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    {ticket?.priority_level || 'Unknown priority'}
                  </p>
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min(100, (ticket?.priority_score || 0) * 10)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 dark:bg-gray-900/40 p-3 rounded-xl border border-white/50 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Sentiment</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">sentiment_dissatisfied</span>
                    <span className="text-sm font-bold text-amber-700 dark:text-amber-500">
                      {ticket?.sentiment_label || 'Unknown'}
                    </span>
                  </div>
                </div>
                <div className="bg-white/60 dark:bg-gray-900/40 p-3 rounded-xl border border-white/50 dark:border-gray-800">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Urgency</p>
                  <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                    <span className="material-symbols-outlined">bolt</span>
                    <span className="text-sm font-bold">
                      {ticket?.urgency_level || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">AI Reasoning</p>
                <div className="relative bg-white/40 dark:bg-gray-900/20 rounded-xl p-4 border border-white/40 dark:border-gray-800 text-xs leading-relaxed text-gray-700 dark:text-gray-300">
                  <span className="material-symbols-outlined absolute -top-3 -right-2 text-primary opacity-50">format_quote</span>
                  {ticket?.explanation_json?.reasoning ? (
                    <div className="whitespace-pre-wrap">{ticket.explanation_json.reasoning}</div>
                  ) : (
                    <div className="italic">
                      {ticket?.summary || 'AI analysis summary will appear here after the ticket is created.'}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suggested Actions</p>
                <div className="bg-white/60 dark:bg-slate-800/60 rounded-lg p-4 border border-white/50 dark:border-slate-700">
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {ticket?.suggested_steps ||
                      'AI will suggest next actions based on ticket content.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-primary/10">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-gray-400">Analysis updated 45s ago</p>
                <button className="text-[10px] font-bold text-primary flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  Re-Analyze
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="size-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Ticket</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete ticket <span className="font-bold">"{ticket?.title}"</span>? 
              This will permanently delete the ticket and all associated comments, tags, and attachments.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setError(null)
                }}
                disabled={deleting}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTicket}
                disabled={deleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                    Deleting...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-lg">delete</span>
                    Delete Ticket
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
