'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageCircle, ClipboardList, PlayCircle,
  Lock, FileText, BarChart2, Shield, Phone, ChevronRight,
  Users, AlertTriangle, BookOpen,
} from 'lucide-react'

const employeeNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ask', label: 'Ask WorkTwin', icon: MessageCircle },
  { href: '/policies', label: 'Policy Library', icon: BookOpen },
  { href: '/onboarding', label: 'My Onboarding', icon: ClipboardList },
  { href: '/scenarios', label: 'Practice Scenarios', icon: PlayCircle },
  { href: '/notes', label: 'Private Notes', icon: Lock },
]

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/documents', label: 'Document Registry', icon: FileText },
  { href: '/admin/insights', label: 'Anonymous Insights', icon: BarChart2 },
  { href: '/admin/roles', label: 'Roles & Permissions', icon: Shield },
  { href: '/admin/escalation', label: 'Escalation Contacts', icon: Phone },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const nav = isAdmin ? adminNav : employeeNav

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-white border-r border-slate-200 flex flex-col">
        {/* Logo / org */}
        <div className="px-4 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-teal-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span className="font-bold text-slate-900 text-sm">WorkTwin</span>
          </div>
          <p className="text-xs text-slate-500 pl-9">Thumhara Centre</p>
        </div>

        {/* Section label */}
        <div className="px-4 pt-4 pb-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {isAdmin ? 'Admin Portal' : 'Employee Portal'}
          </p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 pb-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal-50 text-teal-700 border border-teal-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon size={16} className={active ? 'text-teal-600' : 'text-slate-400'} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto text-teal-400" />}
              </Link>
            )
          })}

          {/* Escalation quick link for employee view */}
          {!isAdmin && (
            <>
              <div className="pt-3 pb-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3">Support</p>
              </div>
              <Link
                href="/escalation"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <AlertTriangle size={16} className="text-amber-500" />
                Escalation Contacts
              </Link>
            </>
          )}
        </nav>

        {/* Demo switcher + user */}
        <div className="border-t border-slate-200 p-3 space-y-3">
          {/* Demo-only view switcher — visually separated from employee nav */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Demo Mode — Switch View</p>
            <p className="text-xs text-amber-700 mb-2 leading-tight">
              In a real deployment, admin access is permission-controlled and not available to staff.
            </p>
            <div className="flex gap-1.5">
              <Link
                href="/dashboard"
                className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium transition-colors ${
                  !isAdmin
                    ? 'bg-teal-700 text-white'
                    : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <Users size={12} className="inline mr-1" />
                Employee
              </Link>
              <Link
                href="/admin"
                className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium transition-colors ${
                  isAdmin
                    ? 'bg-teal-700 text-white'
                    : 'bg-white border border-amber-200 text-amber-700 hover:bg-amber-100'
                }`}
              >
                <Shield size={12} className="inline mr-1" />
                Admin
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
              DU
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">Demo User</p>
              <p className="text-xs text-slate-500">{isAdmin ? 'Admin' : 'Care Worker'}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">
              {isAdmin ? 'Admin Portal' : 'Employee Portal'}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full">
              Demo Mode — Sample Data Only
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Back to landing page
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
