import { useEffect, useState, FormEvent } from 'react'
import Layout from '../components/Layout'
import { api } from '../apiClient'
import { useAuth } from '../AuthContext'
import { Skeleton } from '../components/Skeleton'

interface ProfileData {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  notification_preferences?: {
    highPriorityAlerts?: boolean
    weeklyPerformance?: boolean
    channels?: string[]
  }
  ai_preferences?: {
    predictiveCategorization?: boolean
    autoDraftSuggestions?: boolean
    priorityEscalation?: boolean
  }
}

export default function ProfileAndSettings() {
  const { user: authUser } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordUpdating, setPasswordUpdating] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Preferences
  const [notifications, setNotifications] = useState({
    highPriorityAlerts: true,
    weeklyPerformance: false,
    channels: ['email', 'browser'] as string[],
  })
  const [aiPrefs, setAiPrefs] = useState({
    predictiveCategorization: true,
    autoDraftSuggestions: true,
    priorityEscalation: false,
  })

  const currentUser = {
    name: profile?.name || authUser?.email || 'User',
    role: profile?.role === 'admin' ? 'Administrator' : 'Agent',
  }

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const data = await api.getProfile()
        if (!cancelled) {
          setProfile(data)
          if (data.notification_preferences) {
            setNotifications({
              highPriorityAlerts: data.notification_preferences.highPriorityAlerts ?? true,
              weeklyPerformance: data.notification_preferences.weeklyPerformance ?? false,
              channels: data.notification_preferences.channels || ['email', 'browser'],
            })
          }
          if (data.ai_preferences) {
            setAiPrefs({
              predictiveCategorization: data.ai_preferences.predictiveCategorization ?? true,
              autoDraftSuggestions: data.ai_preferences.autoDraftSuggestions ?? true,
              priorityEscalation: data.ai_preferences.priorityEscalation ?? false,
            })
          }
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  async function handlePasswordUpdate(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters long')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    try {
      setPasswordUpdating(true)
      await api.updatePassword(currentPassword, newPassword)
      setPasswordSuccess('Password updated successfully')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(null), 5000)
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password')
    } finally {
      setPasswordUpdating(false)
    }
  }

  async function handleSavePreferences() {
    try {
      setSaving(true)
      setError(null)
      await api.updatePreferences({
        notification_preferences: notifications,
        ai_preferences: aiPrefs,
      })
      setSuccess('Preferences saved successfully')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err: any) {
      setError(err.message || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  function toggleChannel(channel: string) {
    setNotifications((prev) => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter((c) => c !== channel)
        : [...prev.channels, channel],
    }))
  }

  function formatDate(dateString: string) {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
    } catch {
      return '—'
    }
  }

  return (
    <Layout currentUser={currentUser}>
      <div className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-8 py-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col">
          <nav className="flex items-center gap-2 mb-1">
            <a className="text-xs font-bold text-primary uppercase tracking-widest" href="#">
              Enterprise
            </a>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Settings</span>
          </nav>
          <h1 className="text-2xl font-black tracking-tight">Profile & Preferences</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </div>

      {(error || success) && (
        <div className={`px-8 py-3 mx-8 mt-4 rounded-lg text-sm ${
          error ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'
        }`}>
          {error || success}
        </div>
      )}

      <div className="max-w-6xl mx-auto p-8 grid grid-cols-12 gap-8">
        <section className="col-span-12 bg-white dark:bg-[#1f2327] rounded-xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center gap-8">
          {loading ? (
            <>
              <Skeleton className="size-32 rounded-2xl" />
              <div className="flex-1 space-y-4">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-32" />
              </div>
            </>
          ) : (
            <>
              <div className="relative group">
                <div className="size-32 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold ring-4 ring-primary/10 shadow-xl">
                  {profile?.name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-col md:flex-row md:items-end gap-3 mb-2">
                  <h2 className="text-3xl font-black">{profile?.name || profile?.email || 'User'}</h2>
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest rounded-full mb-1 inline-block w-fit mx-auto md:mx-0">
                    {profile?.role === 'admin' ? 'Administrator' : 'Support Agent'}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-4">
                  {profile?.email} • {profile?.role === 'admin' ? 'Administrator' : 'Support Agent'}
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">badge</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                      ID: {profile?.id?.slice(0, 8) || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-sm">schedule</span>
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                      Joined: {profile?.created_at ? formatDate(profile.created_at) : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        <div className="col-span-12 lg:col-span-7 flex flex-col gap-8">
          <section className="bg-white dark:bg-[#1f2327] rounded-xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/10 text-orange-600 rounded-lg">
                <span className="material-symbols-outlined">security</span>
              </div>
              <h3 className="text-lg font-bold">Account Security</h3>
            </div>
            <form onSubmit={handlePasswordUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Current Password</label>
                  <div className="relative">
                    <input
                      className="bg-background-light dark:bg-background-dark border-none rounded-lg focus:ring-2 focus:ring-primary/50 py-3 px-4 pr-12 text-sm w-full"
                      placeholder="••••••••••••"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showCurrentPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Two-Factor Auth</label>
                  <div className="bg-background-light dark:bg-background-dark px-4 py-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm font-medium">Not available</span>
                    <span className="text-[10px] font-black bg-gray-500/10 text-gray-500 px-2 py-0.5 rounded">DISABLED</span>
                  </div>
                </div>
              </div>
              <div className="h-px bg-gray-50 dark:bg-gray-800"></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">New Password</label>
                  <div className="relative">
                    <input
                      className="bg-background-light dark:bg-background-dark border-none rounded-lg focus:ring-2 focus:ring-primary/50 py-3 px-4 pr-12 text-sm w-full"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showNewPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Confirm New Password</label>
                  <div className="relative">
                    <input
                      className="bg-background-light dark:bg-background-dark border-none rounded-lg focus:ring-2 focus:ring-primary/50 py-3 px-4 pr-12 text-sm w-full"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <span className="material-symbols-outlined text-xl">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
              {passwordError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  {passwordSuccess}
                </div>
              )}
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                <p className="text-xs font-medium text-primary flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm mt-0.5">info</span>
                  Strong passwords must be at least 8 characters long and contain a mix of uppercase letters, numbers, and symbols.
                </p>
              </div>
              <button
                type="submit"
                disabled={passwordUpdating}
                className="bg-gray-900 dark:bg-white dark:text-gray-900 text-white px-6 py-3 rounded-lg text-sm font-black transition-all hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {passwordUpdating ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-sm">refresh</span>
                    Updating Password...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Update Password
                  </>
                )}
              </button>
            </form>
          </section>
        </div>

        <div className="col-span-12 lg:col-span-5 flex flex-col gap-8">
          <section className="bg-white dark:bg-[#1f2327] rounded-xl p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <span className="material-symbols-outlined">notifications_active</span>
              </div>
              <h3 className="text-lg font-bold">Communication</h3>
            </div>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">High Priority Alerts</p>
                  <p className="text-xs text-gray-500">Get notified for critical ticket escalations</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={notifications.highPriorityAlerts}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, highPriorityAlerts: e.target.checked }))}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">Weekly Performance</p>
                  <p className="text-xs text-gray-500">AI-generated summary of your team tickets</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    checked={notifications.weeklyPerformance}
                    onChange={(e) => setNotifications((prev) => ({ ...prev, weeklyPerformance: e.target.checked }))}
                    className="sr-only peer"
                    type="checkbox"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
              <div className="h-px bg-gray-50 dark:bg-gray-800"></div>
              <div className="flex flex-col gap-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Notification Channels</p>
                <div className="grid grid-cols-2 gap-3">
                  {['email', 'sms', 'browser', 'slack'].map((channel) => (
                    <button
                      key={channel}
                      type="button"
                      onClick={() => toggleChannel(channel)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        notifications.channels.includes(channel)
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-100 dark:border-gray-800 bg-transparent opacity-60'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-sm ${
                          notifications.channels.includes(channel) ? 'text-primary' : 'text-gray-400'
                        }`}
                      >
                        {channel === 'email' ? 'mail' : channel === 'sms' ? 'sms' : channel === 'browser' ? 'desktop_windows' : 'chat'}
                      </span>
                      <span className={`text-xs font-bold ${notifications.channels.includes(channel) ? 'text-primary' : 'text-gray-400'}`}>
                        {channel.charAt(0).toUpperCase() + channel.slice(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-gradient-to-br from-primary to-[#005f6a] rounded-xl p-8 shadow-xl text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-white/80">psychology</span>
              <h3 className="text-lg font-bold">AI Assistant Prefs</h3>
            </div>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">Customize how the SmartTriage Engine interacts with your workflow.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  checked={aiPrefs.predictiveCategorization}
                  onChange={(e) => setAiPrefs((prev) => ({ ...prev, predictiveCategorization: e.target.checked }))}
                  className="rounded bg-white/20 border-none text-primary focus:ring-offset-primary"
                  type="checkbox"
                />
                <span className="text-sm font-medium">Predictive ticket categorization</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  checked={aiPrefs.autoDraftSuggestions}
                  onChange={(e) => setAiPrefs((prev) => ({ ...prev, autoDraftSuggestions: e.target.checked }))}
                  className="rounded bg-white/20 border-none text-primary focus:ring-offset-primary"
                  type="checkbox"
                />
                <span className="text-sm font-medium">Auto-draft response suggestions</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  checked={aiPrefs.priorityEscalation}
                  onChange={(e) => setAiPrefs((prev) => ({ ...prev, priorityEscalation: e.target.checked }))}
                  className="rounded bg-white/20 border-none text-primary focus:ring-offset-primary"
                  type="checkbox"
                />
                <span className="text-sm font-medium">Priority escalation sentiment analysis</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Layout>
  )
}


