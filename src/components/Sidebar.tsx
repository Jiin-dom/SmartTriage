import { Link, useLocation } from 'react-router-dom'
import Logo from './Logo'
import { useAuth } from '../AuthContext'

interface SidebarProps {
  currentUser?: {
    name: string
    role: string
    avatar?: string
  }
}

export default function Sidebar({ currentUser }: SidebarProps) {
  const location = useLocation()
  const { user } = useAuth()
  
  // Use the actual user role from auth context instead of the prop
  const isAdmin = user?.role?.toLowerCase() === 'admin'
  
  const navItems = [
    { path: '/dashboard', icon: 'confirmation_number', label: 'Tickets' },
    { path: '/tickets/create', icon: 'add_circle', label: 'Create' },
    { path: '/analytics', icon: 'bar_chart', label: 'Analytics' },
    { path: '/users', icon: 'group', label: 'Users', adminOnly: true },
    { path: '/profile', icon: 'settings', label: 'Settings' },
  ]

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard'
    }
    // For paths like '/tickets/create', we want exact match or starts with '/tickets/'
    // For paths like '/analytics', '/users', '/profile', we want exact match
    if (path === '/analytics' || path === '/users' || path === '/profile') {
      return location.pathname === path
    }
    return location.pathname.startsWith(path)
  }

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sticky top-0 h-screen">
      <div className="p-6">
        <Logo titleClassName="text-base font-bold leading-none" />
        <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-1">Enterprise AI</p>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {navItems
          .filter((item) => !(item.adminOnly && !isAdmin))
          .map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
              isActive(item.path)
                ? 'sidebar-active'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
            <span className="text-sm font-semibold">{item.label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <Link
          to="/tickets/create"
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-lg py-2.5 px-4 text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Ticket
        </Link>
      </div>
      {currentUser && (
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
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
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold leading-none">{currentUser.name}</p>
              <p className="text-[10px] text-slate-500 font-medium mt-1">{currentUser.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
