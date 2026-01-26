import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../apiClient'
import { useAuth } from '../AuthContext'
import Logo from '../components/Logo'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('Password123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const result = await api.login(email, password)
      login(result.token, result.user)
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-background-light dark:bg-background-dark min-h-screen flex flex-col font-display">
      <div className="fixed inset-0 ai-pattern pointer-events-none"></div>
      <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <div className="px-6 md:px-20 lg:px-40 flex justify-center py-5">
            <div className="layout-content-container flex flex-col max-w-[960px] flex-1">
              <header className="flex items-center justify-between whitespace-nowrap px-4 py-3">
                <Logo />
              </header>
            </div>
          </div>
          <main className="flex flex-1 items-center justify-center p-4">
            <div className="w-full max-w-[440px] flex flex-col gap-6">
              <div className="bg-white dark:bg-[#23272b] rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 dark:border-slate-800 p-8 md:p-10">
                <div className="mb-8">
                  <h1 className="text-[#0c1b1d] dark:text-white tracking-tight text-3xl font-bold leading-tight mb-2">Welcome back</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Access your AI-assisted ticket dashboard.</p>
                </div>
                <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                  <div className="flex flex-col gap-2">
                    <label className="text-[#0c1b1d] dark:text-white text-sm font-semibold leading-normal">
                      Email Address
                    </label>
                      <input
                      className="flex w-full min-w-0 flex-1 rounded-lg text-[#0c1b1d] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2024] focus:border-primary h-12 placeholder:text-slate-400 p-[15px] text-base font-normal transition-all"
                      placeholder="e.g. name@company.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[#0c1b1d] dark:text-white text-sm font-semibold leading-normal">
                        Password
                      </label>
                      <a className="text-primary text-xs font-semibold hover:underline" href="#">
                        Forgot password?
                      </a>
                    </div>
                    <div className="relative flex w-full flex-1 items-stretch rounded-lg">
                      <input
                        className="flex w-full min-w-0 flex-1 rounded-lg text-[#0c1b1d] dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/20 border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1c2024] focus:border-primary h-12 placeholder:text-slate-400 p-[15px] pr-12 text-base font-normal transition-all"
                        placeholder="••••••••"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <div className="absolute right-0 top-0 h-full flex items-center pr-3 text-slate-400 cursor-pointer">
                        <span className="material-symbols-outlined text-xl">visibility</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" id="remember" type="checkbox" />
                    <label className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer" htmlFor="remember">
                      Remember this device
                    </label>
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary hover:bg-[#006a75] disabled:bg-primary/60 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-lg transition-colors shadow-lg shadow-primary/10 flex items-center justify-center gap-2 mt-2"
                  >
                    <span>{loading ? 'Signing in...' : 'Login to Dashboard'}</span>
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </form>
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-slate-500 dark:text-slate-400 text-xs">
                    Don't have an account? <a className="text-primary font-bold hover:underline" href="#">Request access</a>
                  </p>
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-primary/40 text-[18px]">auto_awesome</span>
                  <p className="text-[#4597a1] text-[11px] font-bold tracking-widest uppercase">Powered by SmartTriage AI Engine</p>
                </div>
                <p className="text-slate-400 text-[10px]">© 2024 SmartTriage Inc. All rights reserved.</p>
              </div>
            </div>
          </main>
          <div className="hidden lg:block fixed right-10 bottom-10 w-64 h-64 opacity-10">
            <div className="w-full h-full bg-primary rounded-full blur-[80px]"></div>
          </div>
          <div className="hidden lg:block fixed left-10 top-10 w-64 h-64 opacity-5">
            <div className="w-full h-full bg-primary rounded-full blur-[80px]"></div>
          </div>
        </div>
      </div>
    </div>
  )
}
