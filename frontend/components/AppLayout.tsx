'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageCircle, ClipboardList, PlayCircle,
  Lock, FileText, BarChart2, Shield, Phone, ChevronRight,
  Users, AlertTriangle, BookOpen, Menu, X, LogOut,
} from 'lucide-react'

const ADMIN_DEMO_ENABLED = process.env.NEXT_PUBLIC_ADMIN_DEMO_ENABLED === 'true'

const employeeNav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/ask', label: 'Ask WorkTwin', icon: MessageCircle },
  { href: '/policies', label: 'Policy Library', icon: BookOpen },
  { href: '/onboarding', label: 'My Onboarding', icon: ClipboardList },
  { href: '/scenarios', label: 'Scenario Guidance', icon: PlayCircle },
  { href: '/notes', label: 'Private Notes', icon: Lock },
]

const adminNav = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/documents', label: 'Document Registry', icon: FileText },
  { href: '/admin/insights', label: 'Anonymous Insights', icon: BarChart2 },
  { href: '/admin/roles', label: 'Roles & Permissions', icon: Shield },
  { href: '/admin/escalation', label: 'Escalation Contacts', icon: Phone },
]

function SidebarContent({
  isAdmin,
  pathname,
  nav,
  onNavClick,
}: {
  isAdmin: boolean
  pathname: string
  nav: typeof employeeNav
  onNavClick?: () => void
}) {
  return (
    <div className="flex flex-col h-full">
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
              onClick={onNavClick}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
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
              onClick={onNavClick}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/escalation'
                  ? 'bg-teal-50 text-teal-700 border border-teal-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <AlertTriangle size={16} className="text-amber-500" />
              Escalation Contacts
              {pathname === '/escalation' && <ChevronRight size={14} className="ml-auto text-teal-400" />}
            </Link>
            <Link
              href="/privacy-model"
              onClick={onNavClick}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/privacy-model'
                  ? 'bg-teal-50 text-teal-700 border border-teal-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Shield size={16} className="text-teal-500" />
              Privacy model
              {pathname === '/privacy-model' && <ChevronRight size={14} className="ml-auto text-teal-400" />}
            </Link>
          </>
        )}
      </nav>

      {/* Demo switcher + user */}
      <div className="border-t border-slate-200 p-3 space-y-3">
        {/* Demo-only view switcher — only shown when admin demo is explicitly enabled */}
        {ADMIN_DEMO_ENABLED && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Host View — Switch Area</p>
            <p className="text-xs text-amber-700 mb-2 leading-tight">
              Pilot host only — staff users do not see admin access.
            </p>
            <div className="flex gap-1.5">
              <Link
                href="/dashboard"
                onClick={onNavClick}
                className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium transition-colors ${
                  !isAdmin
                    ? 'bg-teal-700 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Users size={12} className="inline mr-1" />
                Employee
              </Link>
              <Link
                href="/admin"
                onClick={onNavClick}
                className={`flex-1 text-center text-xs py-1.5 rounded-md font-medium transition-colors ${
                  isAdmin
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100 border border-amber-300 text-amber-800 hover:bg-amber-200'
                }`}
              >
                <Shield size={12} className="inline mr-1" />
                Admin ↗
              </Link>
            </div>
            {!isAdmin && (
              <p className="text-xs text-amber-600 mt-1.5 text-center">
                Host-only area — not a staff feature
              </p>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
            PU
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800 truncate">Pilot User</p>
            <p className="text-xs text-slate-500">{isAdmin ? 'Admin pilot view' : 'Staff pilot view'}</p>
          </div>
          <Link
            href="/logout"
            title="Sign out"
            aria-label="Sign out"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
          >
            <LogOut size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const nav = isAdmin ? adminNav : employeeNav
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop sidebar — hidden on mobile */}
      <aside className="hidden md:flex md:flex-col w-60 shrink-0 bg-white border-r border-slate-200">
        <SidebarContent isAdmin={isAdmin} pathname={pathname} nav={nav} />
      </aside>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer panel */}
      <aside
        id="mobile-nav-drawer"
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 md:hidden ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Navigation menu"
        role="dialog"
        aria-modal={drawerOpen ? true : undefined}
        aria-hidden={!drawerOpen}
      >
        <div className="flex items-center justify-end px-3 py-3 border-b border-slate-200 shrink-0">
          <button
            onClick={() => setDrawerOpen(false)}
            className="p-2.5 rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
        {/* min-h-0 allows the internal flex-col to scroll correctly */}
        <div className="flex-1 min-h-0">
          <SidebarContent
            isAdmin={isAdmin}
            pathname={pathname}
            nav={nav}
            onNavClick={() => setDrawerOpen(false)}
          />
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 shrink-0">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2.5 rounded-lg text-slate-500 hover:bg-slate-100 shrink-0"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            aria-expanded={drawerOpen}
            aria-controls="mobile-nav-drawer"
          >
            <Menu size={20} />
          </button>

          <div className="flex flex-1 items-center justify-between min-w-0 gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-slate-500 hidden sm:inline">
                {isAdmin ? 'Admin Portal' : 'Employee Portal'}
              </span>
              <span className="text-slate-300 hidden sm:inline">·</span>
              <span className="text-xs bg-amber-100 text-amber-700 font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                <span className="sm:hidden">Pilot</span>
                <span className="hidden sm:inline">Controlled Pilot — No Real Data</span>
              </span>
            </div>
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors whitespace-nowrap shrink-0"
            >
              <span className="sm:hidden">← Back</span>
              <span className="hidden sm:inline">← Back to landing page</span>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>

        {/* Subtle privacy footer */}
        <div className="shrink-0 px-4 md:px-6 py-2 border-t border-slate-100 text-right">
          <Link href="/privacy-model" className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            Privacy model
          </Link>
        </div>
      </div>
    </div>
  )
}
