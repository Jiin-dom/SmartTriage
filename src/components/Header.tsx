import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

interface HeaderProps {
  title?: string
  currentUser?: {
    name: string
    role: string
    avatar?: string
  }
}

export default function Header({ title, currentUser }: HeaderProps) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 z-10">
      <div className="flex items-center gap-6 flex-1 max-w-2xl">
        {title && <h2 className="text-lg font-bold whitespace-nowrap">{title}</h2>}
        <div className="relative w-full group">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors text-xl">
            search
          </span>
          <input
            className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            placeholder="Search tickets or press '/' "
            type="text"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-50 group-focus-within:opacity-100">
            <span className="text-[10px] font-bold border border-slate-300 dark:border-slate-600 px-1 rounded bg-white dark:bg-slate-700">⌘</span>
            <span className="text-[10px] font-bold border border-slate-300 dark:border-slate-600 px-1 rounded bg-white dark:bg-slate-700">K</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4 ml-6">
        <button className="size-10 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10 hover:text-primary transition-all">
          <span className="material-symbols-outlined text-[22px]">notifications</span>
        </button>
        <div className="h-8 w-[1px] bg-slate-200 dark:border-slate-700 mx-1"></div>
        <button
          onClick={handleLogout}
          className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary transition-all"
        >
          Logout
        </button>
        {currentUser && (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">{currentUser.role}</p>
            </div>
            <div
              className="size-10 rounded-full border-2 border-primary/20 bg-cover bg-center"
              style={{ backgroundImage: currentUser.avatar ? `url(${currentUser.avatar})` : undefined }}
            >
              {!currentUser.avatar && (
                <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  {currentUser.name.charAt(0)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
