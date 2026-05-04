import AppLayout from '@/components/AppLayout'
import { Shield, Check, Minus, Info, AlertTriangle } from 'lucide-react'

const ROLES_CHIPS = ['Intended model', 'RBAC not enforced', 'Demo only', 'Admin view']

const roles = ['Care Worker', 'Senior Carer', 'Nurse', 'Manager', 'HR Coordinator', 'Admin']

const permissions: { label: string; description: string; access: (boolean | 'partial')[] }[] = [
  {
    label: 'Ask WorkTwin',
    description: 'Ask questions and receive policy-grounded answers',
    access: [true, true, true, true, true, true],
  },
  {
    label: 'Private notes',
    description: 'Create and view personal private notes (visible only to the author)',
    access: [true, true, true, true, true, true],
  },
  {
    label: 'Practice scenarios',
    description: 'Complete and repeat interactive care scenarios',
    access: [true, true, true, true, false, false],
  },
  {
    label: 'Onboarding tracker',
    description: 'View and complete personal onboarding checklist',
    access: [true, true, true, false, false, false],
  },
  {
    label: 'View own onboarding progress',
    description: 'See your own onboarding completion status',
    access: [true, true, true, true, true, true],
  },
  {
    label: 'Escalation contacts',
    description: 'View the organisation escalation contact directory',
    access: [true, true, true, true, true, true],
  },
  {
    label: 'Anonymous insights',
    description: 'View anonymised question trends and training gaps',
    access: [false, false, false, true, true, true],
  },
  {
    label: 'Manage documents',
    description: 'Upload, review and deactivate approved documents',
    access: [false, false, false, 'partial', true, true],
  },
  {
    label: 'Manage roles & permissions',
    description: 'Assign roles and change permission settings',
    access: [false, false, false, false, false, true],
  },
  {
    label: 'Manage escalation contacts',
    description: 'Add, edit and remove escalation contacts',
    access: [false, false, false, 'partial', true, true],
  },
  {
    label: 'View individual staff data',
    description: 'See individual employee conversations or private notes',
    access: [false, false, false, false, false, false],
  },
]

const roleDescriptions: Record<string, string> = {
  'Care Worker': 'Frontline care staff, new starters',
  'Senior Carer': 'Experienced carers with additional responsibilities',
  'Nurse': 'Registered nurses providing clinical oversight',
  'Manager': 'Service managers with oversight responsibilities',
  'HR Coordinator': 'HR team managing staff and documents',
  'Admin': 'System administrators with full platform access',
}

function AccessCell({ value }: { value: boolean | 'partial' }) {
  if (value === true) return <Check size={16} className="text-teal-600 mx-auto" />
  if (value === 'partial') return (
    <div className="flex items-center justify-center">
      <span className="text-xs text-amber-600 font-medium">Partial</span>
    </div>
  )
  return <Minus size={16} className="text-slate-300 mx-auto" />
}

export default function RolesPage() {
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 pt-4 pb-8 space-y-5">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-5">
              <Shield size={11} />
              Permission model
            </span>
            <h1 className="text-3xl font-bold mb-2.5 leading-snug">Roles &amp; Permissions</h1>
            <p className="text-slate-200 text-sm leading-relaxed max-w-lg mb-5">
              Planned permission structure for WorkTwin. Role-based access control is not active in this demo — any user can navigate to any area. Do not treat this as live RBAC.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {ROLES_CHIPS.map(chip => (
                <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-slate-300 text-xs">
              No role can view individual employee conversations or private notes — this is a product-level privacy guarantee.
            </p>
          </div>
        </div>

        {/* Admin containment banner */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-5 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900">Intended permission model only — not enforced in this demo</p>
            <p className="text-sm text-amber-800 mt-0.5 leading-relaxed">
              This matrix shows the planned role and permission structure for a real deployment. Role-based
              access control is not active in the current demo — any user can navigate to any area. Do not
              treat this as live RBAC.
            </p>
          </div>
        </div>

        {/* Important notice */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <Shield size={16} className="text-teal-700 shrink-0 mt-0.5" />
          <p className="text-sm text-teal-800">
            <span className="font-semibold">No role can view individual employee conversations or private notes.</span>{' '}
            This is a product-level privacy guarantee — not a configurable permission. WorkTwin is private for employees by default.
          </p>
        </div>

        {/* Role overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {roles.map(role => (
            <div key={role} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center">
                  <span className="text-teal-700 text-xs font-bold">{role[0]}</span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{role}</p>
              </div>
              <p className="text-xs text-slate-500 leading-snug">{roleDescriptions[role]}</p>
            </div>
          ))}
        </div>

        {/* Permission matrix */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-900 text-sm">Permission matrix</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              <Check size={11} className="inline text-teal-600 mr-1" />Full access
              <span className="mx-2">·</span>
              <span className="text-amber-600 font-medium text-xs">Partial</span> = limited access
              <span className="mx-2">·</span>
              <Minus size={11} className="inline text-slate-400 mr-1" />No access
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-72">
                    Permission
                  </th>
                  {roles.map(role => (
                    <th key={role} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {role.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm, i) => (
                  <tr
                    key={perm.label}
                    className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${
                      i === permissions.length - 1 ? 'border-b-0' : ''
                    } ${perm.label === 'View individual staff data' ? 'bg-red-50/30' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 text-sm">{perm.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 leading-snug">{perm.description}</p>
                      {perm.label === 'View individual staff data' && (
                        <div className="flex items-center gap-1 mt-1">
                          <Info size={11} className="text-red-500" />
                          <span className="text-xs text-red-600 font-medium">Permanently disabled — privacy guarantee</span>
                        </div>
                      )}
                    </td>
                    {perm.access.map((value, j) => (
                      <td key={j} className="px-3 py-3.5 text-center">
                        <AccessCell value={value} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-slate-400 text-center">
          This page shows the intended permission model for the pilot. Role enforcement is not active in this demo — see the notice above.
        </p>
      </div>
    </AppLayout>
  )
}
