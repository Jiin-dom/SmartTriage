import { ReactNode } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface LayoutProps {
  children: ReactNode
  headerTitle?: string
  currentUser?: {
    name: string
    role: string
    avatar?: string
  }
}

export default function Layout({ children, headerTitle, currentUser }: LayoutProps) {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex">
      <Sidebar currentUser={currentUser} />
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header title={headerTitle} currentUser={currentUser} />
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  )
}
