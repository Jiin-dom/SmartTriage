import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { api } from '../apiClient'
import { useAuth } from '../AuthContext'

export default function CreateNewTicket() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const currentUser = {
    name: user?.email || 'Current User',
    role: user?.role === 'admin' ? 'Administrator' : 'Agent',
  }

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title || !description) {
      setError('Title and description are required.')
      return
    }
    try {
      setSubmitting(true)
      // Convert deadline to ISO 8601 format if provided
      let deadlineISO: string | null = null
      if (deadline) {
        deadlineISO = new Date(deadline).toISOString()
      }
      const result = await api.createTicket({ 
        title, 
        description, 
        priority,
        deadline: deadlineISO
      })
      navigate(`/tickets/${result.ticket.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout headerTitle="Create New Ticket" currentUser={currentUser}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h2 className="text-[#0c1b1d] dark:text-white text-3xl font-extrabold tracking-tight">Create New Ticket</h2>
          <p className="text-gray-500 dark:text-gray-400 text-base mt-2">Fill out the details below to log a new support request.</p>
        </div>

        <div className="bg-white dark:bg-background-dark rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="ai-banner-gradient px-6 py-4 flex items-center gap-4 border-b border-primary/10">
            <div className="bg-primary/20 p-2 rounded-lg text-primary">
              <span className="material-symbols-outlined fill-[1]">psychology</span>
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#0c1b1d] dark:text-white">AI-Assisted Processing Enabled</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">SmartTriage AI will automatically categorize and prioritize this ticket based on your description.</p>
            </div>
          </div>

          <form className="p-8 space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                Ticket Title
                <span className="text-red-500">*</span>
              </label>
              <input
                className="form-input w-full px-4 py-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none transition-all placeholder:text-gray-400"
                placeholder="e.g., Server instability in US-East-1 region"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Department / Category</label>
                <div className="relative">
                  <select className="form-input w-full appearance-none px-4 py-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none transition-all pr-10">
                    <option value="">Select a department</option>
                    <option value="infra">Cloud Infrastructure</option>
                    <option value="security">Security & Compliance</option>
                    <option value="billing">Billing & Finance</option>
                    <option value="dev">Product Development</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-400">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Initial Priority (Suggested)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPriority('low')}
                    className={`flex-1 py-3 text-xs font-bold border rounded-lg transition-all ${
                      priority === 'low'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                    }`}
                  >
                    LOW
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('medium')}
                    className={`flex-1 py-3 text-xs font-bold border rounded-lg transition-all ${
                      priority === 'medium'
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-gray-200 dark:border-gray-700 hover:border-primary'
                    }`}
                  >
                    MEDIUM
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriority('high')}
                    className={`flex-1 py-3 text-xs font-bold border rounded-lg transition-all ${
                      priority === 'high'
                        ? 'border-red-400 bg-red-50/40 text-red-600'
                        : 'border-gray-200 dark:border-gray-700 hover:border-red-400'
                    }`}
                  >
                    HIGH
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                Deadline (Optional)
                <span className="material-symbols-outlined text-sm text-gray-400">event</span>
              </label>
              <input
                type="datetime-local"
                className="form-input w-full px-4 py-3.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none transition-all"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">Set a target completion date and time for this ticket</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  Detailed Description
                  <span className="text-red-500">*</span>
                </label>
                <span className="text-[10px] text-gray-400 font-medium">Markdown supported</span>
              </div>
              <textarea
                className="form-input w-full px-4 py-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none transition-all placeholder:text-gray-400 resize-none"
                placeholder="Describe the technical issue in detail, including steps to reproduce..."
                rows={8}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <span className="material-symbols-outlined text-[16px]">info</span>
                <span>You can attach files after the initial submission.</span>
              </div>
              <div className="flex gap-3 items-center">
                {error && <p className="text-xs text-red-500 mr-4">{error}</p>}
                <Link
                  to="/dashboard"
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-2.5 bg-primary hover:bg-[#006672] disabled:bg-primary/60 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg shadow-md shadow-primary/20 transition-all flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                  <span className="material-symbols-outlined text-[18px]">send</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        <div className="mt-8 flex justify-center">
          <p className="text-xs text-gray-400 flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">lock</span>
            Secure end-to-end encrypted ticket submission
          </p>
        </div>
      </div>
    </Layout>
  )
}
