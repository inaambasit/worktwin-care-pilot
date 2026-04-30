import Link from 'next/link'
import AppLayout from '@/components/AppLayout'
import { Phone, Mail, AlertTriangle, Shield, Heart, Users, Activity, Star, MessageSquare, ArrowLeft } from 'lucide-react'

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
  icon: React.ElementType
  bgColour: string
  iconColour: string
  contact: Contact
}

const categories: Category[] = [
  {
    id: 'safeguarding',
    title: 'Safeguarding Lead',
    icon: Shield,
    bgColour: 'bg-red-50 border-red-200',
    iconColour: 'bg-red-100 text-red-600',
    contact: {
      name: 'Jane Thornton (sample name)',
      role: 'Designated Safeguarding Lead',
      phone: '07700 900 001',
      email: 'safeguarding@thumhara-demo.co.uk',
      availability: 'Mon–Fri, 09:00–17:00',
      notes: 'For out-of-hours concerns, contact the Local Authority Safeguarding Team directly.',
    },
  },
  {
    id: 'medication',
    title: 'Medication Lead / Senior on Duty',
    icon: Heart,
    bgColour: 'bg-teal-50 border-teal-200',
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
    icon: Users,
    bgColour: 'bg-blue-50 border-blue-200',
    iconColour: 'bg-blue-100 text-blue-600',
    contact: {
      name: 'Priya Kapoor (sample name)',
      role: 'HR Coordinator',
      phone: '07700 900 003',
      email: 'hr@thumhara-demo.co.uk',
      availability: 'Mon–Fri, 09:00–17:00',
      notes: 'All HR conversations are confidential.',
    },
  },
  {
    id: 'manager',
    title: 'Registered Manager',
    icon: Star,
    bgColour: 'bg-violet-50 border-violet-200',
    iconColour: 'bg-violet-100 text-violet-600',
    contact: {
      name: 'Manager on Duty (sample name)',
      role: 'Registered Manager',
      phone: '07700 900 005',
      email: 'manager@thumhara-demo.co.uk',
      availability: 'Mon–Sun, 08:00–20:00',
      notes: 'For out-of-hours urgent concerns, use the on-call number: 07700 900 999.',
    },
  },
  {
    id: 'complaints',
    title: 'Complaints Contact',
    icon: MessageSquare,
    bgColour: 'bg-orange-50 border-orange-200',
    iconColour: 'bg-orange-100 text-orange-600',
    contact: {
      name: 'Registered Manager (Complaints)',
      role: 'Formal complaints lead',
      phone: '07700 900 005',
      email: 'complaints@thumhara-demo.co.uk',
      availability: 'Mon–Fri, 09:00–17:00',
      notes: 'You have the right to raise complaints without fear of detriment. Concerns may also be raised in writing.',
    },
  },
  {
    id: 'health-safety',
    title: 'Health & Safety Contact',
    icon: Activity,
    bgColour: 'bg-amber-50 border-amber-200',
    iconColour: 'bg-amber-100 text-amber-600',
    contact: {
      name: 'Marcus Reid (sample name)',
      role: 'Health & Safety Officer',
      phone: '07700 900 002',
      email: 'hs@thumhara-demo.co.uk',
      availability: 'Mon–Fri, 08:30–16:30',
      notes: 'Report accidents, near-misses and hazards immediately — even if no injury occurred.',
    },
  },
]

export default function EscalationPage() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        <Link
          href="/ask"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Ask WorkTwin
        </Link>

        <div>
          <h1 className="text-xl font-bold text-slate-900">Escalation Contacts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            For urgent or sensitive issues, speak to the relevant human contact below.
          </p>
        </div>

        {/* Core notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">
                WorkTwin supports policy understanding but does not replace human escalation.
              </p>
              <p className="text-sm text-amber-800 mt-1 leading-relaxed">
                For safeguarding, medication concerns, HR matters, complaints or health and safety —
                always speak to the relevant human contact below. If in doubt, escalate.
                Do not rely on WorkTwin alone for these situations.
              </p>
            </div>
          </div>
        </div>

        {/* Emergency */}
        <div className="bg-red-700 rounded-2xl px-5 py-4 flex items-center gap-4 text-white">
          <Phone size={22} className="shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Emergency — immediate risk to life</p>
            <p className="text-red-200 text-sm">Call 999 immediately. Do not wait.</p>
          </div>
          <div className="text-2xl font-bold">999</div>
        </div>

        {/* Contact cards */}
        <div className="space-y-3">
          {categories.map(({ id, title, icon: Icon, bgColour, iconColour, contact }) => (
            <div key={id} className={`border rounded-2xl p-5 ${bgColour}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColour}`}>
                  <Icon size={18} />
                </div>
                <h2 className="font-semibold text-slate-900">{title}</h2>
              </div>
              <div className="bg-white/70 rounded-xl p-4 border border-white">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{contact.name}</p>
                    <p className="text-xs text-slate-500">{contact.role}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">{contact.availability}</span>
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

        <p className="text-xs text-slate-400 text-center pb-2">
          All contact names and numbers shown here are fictional sample data — this is a demo only.
        </p>
      </div>
    </AppLayout>
  )
}
