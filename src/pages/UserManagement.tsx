import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { api } from '../apiClient'
import { useAuth } from '../AuthContext'
import { Skeleton } from '../components/Skeleton'

interface UserRow {
  id: string
  name: string
  email: string
  role: 'admin' | 'agent' | string
  is_active: boolean
  created_at: string
}

export default function UserManagement() {
  const { user } = useAuth()
  const currentUser = {
    name: user?.email || 'Admin',
    role: 'Enterprise Admin',
  }

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'agent'>('agent')
  const [newPassword, setNewPassword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'agent'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const result = await api.getUsers()
        if (!cancelled) {
          setUsers(result.data || [])
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load users')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function formatJoined(date: string) {
    try {
      const d = new Date(date)
      return d.toLocaleDateString()
    } catch {
      return '—'
    }
  }

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (statusFilter === 'active' && !u.is_active) return false
    if (statusFilter === 'inactive' && u.is_active) return false
    return true
  })

  const getRoleClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'agent':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200'
    }
  }

  async function toggleActive(userId: string, isActive: boolean) {
    setUpdatingId(userId)
    try {
      const updated = await api.updateUserActive(userId, !isActive)
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: updated.is_active } : u)))
    } catch (err: any) {
      setError(err.message || 'Failed to update user')
    } finally {
      setUpdatingId(null)
    }
  }

  async function toggleRole(userId: string, role: string) {
    const nextRole = role === 'admin' ? 'agent' : 'admin'
    setUpdatingId(userId)
    try {
      const updated = await api.updateUserRole(userId, nextRole as 'admin' | 'agent')
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)))
    } catch (err: any) {
      setError(err.message || 'Failed to update role')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setError('Name, email, and password are required.')
      return
    }
    setCreating(true)
    try {
      const created = await api.createUser({
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        password: newPassword,
      })
      setUsers((prev) => [created, ...prev])
      setShowAddModal(false)
      setNewName('')
      setNewEmail('')
      setNewPassword('')
      setNewRole('agent')
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Layout headerTitle="User Management" currentUser={currentUser}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">User Management</h2>
          <p className="text-slate-500 mt-1">Manage your team members and their access levels across the platform.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-white font-bold rounded-lg shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[20px]">person_add</span>
          <span>Add User</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() =>
              setRoleFilter((prev) => (prev === 'all' ? 'admin' : prev === 'admin' ? 'agent' : 'all'))
            }
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-slate-400 text-[20px]">filter_list</span>
            <span className="text-sm font-semibold">
              Role: {roleFilter === 'all' ? 'All' : roleFilter === 'admin' ? 'Admins' : 'Agents'}
            </span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
          </button>
          <button
            type="button"
            onClick={() =>
              setStatusFilter((prev) =>
                prev === 'all' ? 'active' : prev === 'active' ? 'inactive' : 'all',
              )
            }
            className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-primary transition-colors"
          >
            <span className="material-symbols-outlined text-slate-400 text-[20px]">task_alt</span>
            <span className="text-sm font-semibold">
              Status:{' '}
              {statusFilter === 'all'
                ? 'All'
                : statusFilter === 'active'
                ? 'Active'
                : 'Inactive'}
            </span>
            <span className="material-symbols-outlined text-slate-400 text-[18px]">expand_more</span>
          </button>
          <div className="flex-1"></div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {loading ? 'Loading users...' : `Showing ${filteredUsers.length} of ${users.length} users`}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {error && (
          <div className="px-6 py-3 text-xs text-red-500 border-b border-red-100 bg-red-50">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <input className="rounded border-slate-300 text-primary focus:ring-primary" type="checkbox" />
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Name & Profile</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Email Address</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loading && (
                <>
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`sk-u-${idx}`}>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-4 rounded" />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-4 w-52" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </td>
                      <td className="px-6 py-4">
                        <Skeleton className="h-6 w-20 rounded-md" />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Skeleton className="h-10 w-10 rounded-lg" />
                          <Skeleton className="h-10 w-10 rounded-lg" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td className="px-6 py-6 text-sm text-slate-500" colSpan={6}>
                    No users found.
                  </td>
                </tr>
              )}
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    user.is_active ? '' : 'opacity-70'
                  }`}
                >
                  <td className="px-6 py-4">
                    <input className="rounded border-slate-300 text-primary focus:ring-primary" type="checkbox" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold overflow-hidden border border-primary/20">
                        {user.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className={`font-bold text-slate-900 dark:text-white ${user.is_active ? '' : 'line-through'}`}>
                          {user.name}
                        </p>
                        <p className="text-xs text-slate-500">Joined {formatJoined(user.created_at)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{user.email}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRoleClass(user.role)}`}>
                      <span className="size-1.5 rounded-full bg-primary"></span>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold">
                        <span className="material-symbols-outlined text-[14px]">block</span>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        disabled={updatingId === user.id}
                        onClick={() => toggleRole(user.id, user.role)}
                        className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Toggle role"
                      >
                        <span className="material-symbols-outlined text-[20px]">switch_account</span>
                      </button>
                      {user.is_active ? (
                        <button
                          disabled={updatingId === user.id}
                          onClick={() => toggleActive(user.id, user.is_active)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Deactivate User"
                        >
                          <span className="material-symbols-outlined text-[20px]">person_off</span>
                        </button>
                      ) : (
                        <button
                          disabled={updatingId === user.id}
                          onClick={() => toggleActive(user.id, user.is_active)}
                          className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Reactivate User"
                        >
                          <span className="material-symbols-outlined text-[20px]">person_check</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900 dark:text-white">{filteredUsers.length}</span> of{' '}
            <span className="font-bold text-slate-900 dark:text-white">{users.length}</span> users
          </p>
        </div>
      </div>

      <div className="mt-8 p-6 bg-gradient-to-br from-primary/5 to-transparent rounded-2xl border border-primary/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[28px]">smart_toy</span>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white">AI Seat Optimization</h4>
            <p className="text-sm text-slate-500 max-w-md">3 redundant "Agent" seats identified. AI analysis suggests you could reallocate these to "Analyst" roles based on current ticket volume.</p>
          </div>
        </div>
        <button className="px-4 py-2 text-primary font-bold text-sm hover:underline">View Analysis</button>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-900 dark:text-white">Add New User</h3>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="jane@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="At least 8 characters"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Share this password securely with the user. They can change it from their profile page.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'agent')}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (creating) return
                    setShowAddModal(false)
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? 'Creating...' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  )
}
