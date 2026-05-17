import AppLayout from '@/components/AppLayout'
import { Phone, Mail, AlertTriangle, Shield, Heart, Users, Activity, Star, MessageSquare, ShieldCheck, PhoneCall } from 'lucide-react'

interface Contact {
  name: string
  role: string
  phone?: string
  email?: string
  availability: string
  notes?: string
}

interface Category {
  id: string
  title: string
  whenToUse: string
  icon: React.ElementType
  iconColour: string
  contact: Contact
}

const categories: Category[] = [
  {
    id: 'safeguarding',
    title: 'Safeguarding Lead / Registered Manager',
    whenToUse: 'Safeguarding disclosures, welfare or capacity concerns, access-refusal situations, abuse or neglect',
    icon: Shield,
    iconColour: 'bg-red-100 text-red-600',
    contact: {
      name: 'Registered Manager (sample)',
      role: 'Safeguarding Lead / Registered Manager',
      phone: '07700 900 412',
      email: 'safeguarding@example.com',
      availability: 'Mon-Fri, 09:00–17:00',
      notes: 'First escalation point for welfare concerns, access refusals and safeguarding. For out-of-hours emergencies, call 999.',
    },
  },
  {
    id: 'medication',
    title: 'Medication Lead / Senior on Duty',
    whenToUse: 'Medication queries, refusal to take medication, drug errors or urgent clinical concerns',
    icon: Heart,
    iconColour: 'bg-teal-100 text-teal-700',
    contact: {
      name: 'Senior Carer / Registered Nurse on Shift',
      role: 'Medication lead and senior on duty',
      phone: 'Internal: ext. 201',
      availability: '24 hours / 7 days',
      notes: 'For medication queries, refusal of medication or clinical concerns. For emergencies call 999.',
    },
  },
  {
    id: 'hr',
    title: 'HR Contact',
    whenToUse: 'Employment concerns, disciplinary matters, confidential staff issues or wellbeing support',
    icon: Users,
    iconColour: 'bg-blue-100 text-blue-600',
    contact: {
      name: 'Priya Kapoor (sample name)',
      role: 'HR Coordinator',
      phone: '07700 900 003',
      email: 'hr@example.com',
      availability: 'Mon-Fri, 09:00–17:00',
      notes: 'HR concerns should be handled through the correct authorised route and shared only with appropriate people.',
    },
  },
  {
    id: 'manager',
    title: 'Registered Manager',
    whenToUse: 'Escalated operational issues, formal decisions or out-of-hours urgent concerns',
    icon: Star,
    iconColour: 'bg-violet-100 text-violet-600',
    contact: {
      name: 'Manager on Duty (sample name)',
      role: 'Registered Manager',
      phone: '07700 900 005',
      email: 'manager@example.com',
      availability: 'Mon-Sun, 08:00–20:00',
      notes: 'For out-of-hours urgent concerns, use the on-call number: 07700 900 999.',
    },
  },
  {
    id: 'complaints',
    title: 'Complaints Contact',
    whenToUse: 'Formal complaints from service users, families or visitors',
    icon: MessageSquare,
    iconColour: 'bg-orange-100 text-orange-600',
    contact: {
      name: 'Registered Manager (Complaints)',
      role: 'Formal complaints lead',
      phone: '07700 900 005',
      email: 'complaints@example.com',
      availability: 'Mon-Fri, 09:00–17:00',
      notes: 'You have the right to raise complaints without fear of detriment. Concerns may also be raised in writing.',
    },
  },
  {
    id: 'health-safety',
    title: 'Health & Safety Contact',
    whenToUse: 'Accidents, near-misses, hazards, equipment faults or RIDDOR notifications',
    icon: Activity,
    iconColour: 'bg-amber-100 text-amber-600',
    contact: {
      name: 'Marcus Reid (sample name)',
      role: 'Health & Safety Officer',
      phone: '07700 900 002',
      email: 'hs@example.com',
      availability: 'Mon-Fri, 08:30–16:30',
      notes: 'Report accidents, near-misses and hazards immediately — even if no injury occurred.',
    },
  },
]

const CONTEXT_CHIPS = ['Human escalation', 'Staff support', 'Thumhara Centre', 'Pilot placeholder contacts']

export default function EscalationPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto px-4 pt-4 pb-8 space-y-6">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
          <div className="absolute -left-6 bottom-4 w-24 h-24 rounded-full bg-teal-800/40 pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-5">
              <PhoneCall size={11} />
              Human escalation
            </span>
            <h1 className="text-3xl font-bold mb-2.5 leading-snug">Escalation Contacts</h1>
            <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
              This page helps you find the right human contact quickly. For urgent or sensitive concerns, always speak to the relevant lead — do not rely on WorkTwin alone.
            </p>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_CHIPS.map(chip => (
                <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Emergency */}
        <div className="bg-red-600 rounded-2xl px-5 py-4 flex items-center gap-4 text-white shadow-sm">
          <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center shrink-0">
            <Phone size={20} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-base">Immediate risk to life — call 999</p>
            <p className="text-red-200 text-sm mt-0.5">Do not wait. Call 999 and follow your emergency procedures.</p>
          </div>
          <div className="text-3xl font-bold tabular-nums">999</div>
        </div>

        {/* WorkTwin reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              WorkTwin does not replace human escalation.
            </p>
            <p className="text-sm text-amber-800 mt-1 leading-relaxed">
              For safeguarding, medication, HR, complaints or health and safety concerns — always use the contacts below. If in doubt, escalate.
            </p>
          </div>
        </div>

        {/* Contact cards */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-1">Contact routes</h2>
          <p className="text-sm text-slate-500 mb-4">Find the right lead for your situation. Each route includes availability and guidance on when to use it.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categories.map(({ id, title, whenToUse, icon: Icon, iconColour, contact }) => (
              <div key={id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconColour}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 text-sm leading-snug">{title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{whenToUse}</p>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.role}</p>
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap shrink-0 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">{contact.availability}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900"
                      >
                        <Phone size={12} />
                        {contact.phone}
                      </a>
                    )}
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900"
                      >
                        <Mail size={12} />
                        {contact.email}
                      </a>
                    )}
                  </div>
                  {contact.notes && (
                    <p className="text-xs text-slate-500 mt-2 italic">{contact.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Safe support reminders */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck size={17} className="text-teal-600" />
            </div>
            <h2 className="font-semibold text-slate-900 text-sm">Safe support reminders</h2>
          </div>
          <ul className="space-y-3">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[7px]" />
              <span className="text-sm text-slate-600 leading-relaxed">
                Always speak to a human lead for sensitive concerns — WorkTwin supports policy understanding, not emergency decision-making.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 mt-[7px]" />
              <span className="text-sm text-slate-600 leading-relaxed">
                HR and safeguarding concerns should be handled through the correct human route and shared only with appropriate authorised people.
              </span>
            </li>
            <li className="flex items-start gap-2.5 bg-red-50 rounded-xl px-3 py-2.5 -mx-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-[7px]" />
              <span className="text-sm text-red-700 font-medium leading-relaxed">
                If someone is in immediate danger, call{' '}
                <a href="tel:999" className="font-bold underline">999</a>.
              </span>
            </li>
          </ul>
        </div>

        <p className="text-xs text-slate-400 text-center pb-2">
          All contact names and numbers shown here are fictional sample data for controlled pilot display only.
        </p>

      </div>
    </AppLayout>
  )
}
