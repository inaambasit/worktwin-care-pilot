import AppLayout from '@/components/AppLayout'
import Link from 'next/link'
import { Users, FileText, BarChart2, Shield, Phone, AlertTriangle, TrendingUp, BookOpen } from 'lucide-react'

const summaryCards = [
  { label: 'Pilot participants', value: '24', sub: 'Organisation usage', icon: Users, colour: 'teal' },
  { label: 'Approved documents', value: '18', sub: '2 under review', icon: FileText, colour: 'blue' },
  { label: 'Escalations this month', value: '3', sub: 'All resolved', icon: AlertTriangle, colour: 'amber' },
  { label: 'Onboarding cohorts', value: '4', sub: 'New starters', icon: BookOpen, colour: 'violet' },
]

const adminSections = [
  {
    href: '/admin/documents',
    icon: FileText,
    label: 'Company Documents',
    desc: 'Upload, manage and control access to approved policy documents.',
  },
  {
    href: '/admin/insights',
    icon: BarChart2,
    label: 'Anonymous Insights',
    desc: 'View anonymised staff question trends, training gaps and document suggestions.',
  },
  {
    href: '/admin/roles',
    icon: Shield,
    label: 'Roles & Permissions',
    desc: 'Define which roles can access which features and document categories.',
  },
  {
    href: '/admin/escalation',
    icon: Phone,
    label: 'Escalation Contacts',
    desc: 'Manage the human contacts staff are directed to for sensitive concerns.',
  },
]

const topTrends = [
  { topic: 'Medication administration', count: 34 },
  { topic: 'Safeguarding procedures', count: 22 },
  { topic: 'Leave and rota management', count: 18 },
  { topic: 'Incident reporting', count: 14 },
]

export default function AdminOverviewPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Thumhara Centre · WorkTwin Care Pilot</p>
        </div>

        {/* Privacy reminder */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Shield size={16} className="text-teal-700 shrink-0 mt-0.5" />
          <p className="text-sm text-teal-800">
            <span className="font-semibold">Manager view only shows anonymised data.</span> You cannot see individual staff chat transcripts, private notes or personal conversations. WorkTwin is private for employees by design.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {summaryCards.map(({ label, value, sub, icon: Icon }) => (
            <div key={label} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center">
                  <Icon size={18} className="text-teal-700" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs font-medium text-slate-600 mt-0.5">{label}</p>
              <p className="text-xs text-slate-400">{sub}</p>
            </div>
          ))}
        </div>

        {/* Admin sections */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-3">Admin tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {adminSections.map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md hover:border-slate-300 transition-all group flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 group-hover:bg-teal-50 transition-colors">
                  <Icon size={20} className="text-slate-500 group-hover:text-teal-700" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-sm mb-1">{label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Top trends preview */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-teal-600" />
              <h2 className="font-semibold text-slate-900 text-sm">Top question areas this month</h2>
            </div>
            <Link href="/admin/insights" className="text-xs text-teal-700 hover:text-teal-800 font-medium">
              Full report →
            </Link>
          </div>
          <p className="text-xs text-slate-400 mb-3">
            Anonymised topic trends — no individual staff data is shown
          </p>
          <div className="space-y-3">
            {topTrends.map(({ topic, count }) => (
              <div key={topic} className="flex items-center gap-3">
                <p className="text-sm text-slate-700 w-44 shrink-0">{topic}</p>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-teal-600 h-2 rounded-full"
                    style={{ width: `${count * 2.5}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 w-8 text-right">{count}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
