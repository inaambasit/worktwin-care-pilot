import AppLayout from '@/components/AppLayout'
import { Phone, Mail, AlertTriangle, Heart, Scale, Shield, Users, Activity, Clock } from 'lucide-react'
import Link from 'next/link'

interface EscalationContact {
  name: string
  role: string
  phone: string
  email: string
  availability: string
  notes?: string
}

interface EscalationCategory {
  id: string
  title: string
  icon: React.ElementType
  colour: string
  description: string
  whenToEscalate: string[]
  contacts: EscalationContact[]
}

const categories: EscalationCategory[] = [
  {
    id: 'safeguarding',
    title: 'Safeguarding',
    icon: Shield,
    colour: 'red',
    description: 'For any concern about the safety or welfare of a service user or a member of staff.',
    whenToEscalate: [
      'You suspect or witness abuse, neglect or exploitation',
      'A service user or colleague discloses harm',
      'You are worried about someone\'s immediate safety',
      'Any situation involving a child or vulnerable adult at risk',
    ],
    contacts: [
      {
        name: 'Jane Thornton',
        role: 'Designated Safeguarding Lead',
        phone: '07700 900 001',
        email: 'safeguarding@thumhara-demo.co.uk',
        availability: 'Mon–Fri, 09:00–17:00',
        notes: 'For out-of-hours concerns, call the Local Authority Safeguarding Team directly.',
      },
    ],
  },
  {
    id: 'health-safety',
    title: 'Health & Safety',
    icon: Activity,
    colour: 'amber',
    description: 'For accidents, incidents, near-misses and environmental hazards.',
    whenToEscalate: [
      'An accident or injury has occurred',
      'You identify a health or safety risk',
      'There has been a near-miss incident',
      'Equipment is faulty or unsafe',
    ],
    contacts: [
      {
        name: 'Marcus Reid',
        role: 'Health & Safety Officer',
        phone: '07700 900 002',
        email: 'hs@thumhara-demo.co.uk',
        availability: 'Mon–Fri, 08:30–16:30',
      },
    ],
  },
  {
    id: 'hr',
    title: 'HR & Disciplinary',
    icon: Users,
    colour: 'blue',
    description: 'For concerns about employment, conduct, grievances or disciplinary matters.',
    whenToEscalate: [
      'You have a formal grievance to raise',
      'You are involved in a disciplinary matter',
      'You have concerns about a colleague\'s conduct',
      'You have questions about your contract, pay or rights',
    ],
    contacts: [
      {
        name: 'Priya Kapoor',
        role: 'HR Coordinator',
        phone: '07700 900 003',
        email: 'hr@thumhara-demo.co.uk',
        availability: 'Mon–Fri, 09:00–17:00',
        notes: 'All HR conversations are confidential.',
      },
    ],
  },
  {
    id: 'medical',
    title: 'Medical & Clinical',
    icon: Heart,
    colour: 'teal',
    description: 'For clinical queries, medication concerns and medical emergencies.',
    whenToEscalate: [
      'You have a clinical concern about a service user',
      'A medication error has occurred or is suspected',
      'A service user shows signs of unexpected deterioration',
      'You need clinical guidance not covered in policy',
    ],
    contacts: [
      {
        name: 'On-duty Nurse',
        role: 'Registered Nurse (on shift)',
        phone: 'Internal: ext. 201',
        email: '',
        availability: '24 hours / 7 days',
      },
      {
        name: 'GP Surgery',
        role: 'Thumhara Centre GP Contact',
        phone: '01234 567 890',
        email: '',
        availability: 'Mon–Fri, 08:00–18:30',
        notes: 'For out-of-hours medical advice call 111. For emergencies call 999.',
      },
    ],
  },
  {
    id: 'legal',
    title: 'Legal & Compliance',
    icon: Scale,
    colour: 'violet',
    description: 'For regulatory, legal or compliance concerns.',
    whenToEscalate: [
      'A formal legal notice or complaint has been received',
      'You have a concern about regulatory compliance',
      'A CQC or inspection matter arises',
      'You need advice on data protection or GDPR',
    ],
    contacts: [
      {
        name: 'Director of Operations',
        role: 'Responsible Person',
        phone: '07700 900 004',
        email: 'director@thumhara-demo.co.uk',
        availability: 'Mon–Fri, 09:00–17:00',
      },
    ],
  },
  {
    id: 'wellbeing',
    title: 'Wellbeing & Mental Health',
    icon: Heart,
    colour: 'green',
    description: 'Confidential support for your own wellbeing, stress or mental health.',
    whenToEscalate: [
      'You are feeling overwhelmed, stressed or burnt out',
      'You need confidential support',
      'You are concerned about a colleague\'s wellbeing',
    ],
    contacts: [
      {
        name: 'Employee Assistance Programme',
        role: 'Free confidential counselling service',
        phone: '0800 028 3766',
        email: '',
        availability: '24 hours / 7 days — completely confidential',
        notes: 'Free, independent and confidential. Not connected to your employer.',
      },
    ],
  },
]

const colourMap: Record<string, string> = {
  red: 'border-red-200 bg-red-50',
  amber: 'border-amber-200 bg-amber-50',
  blue: 'border-blue-200 bg-blue-50',
  teal: 'border-teal-200 bg-teal-50',
  violet: 'border-violet-200 bg-violet-50',
  green: 'border-green-200 bg-green-50',
}

const iconColourMap: Record<string, string> = {
  red: 'text-red-600 bg-red-100',
  amber: 'text-amber-600 bg-amber-100',
  blue: 'text-blue-600 bg-blue-100',
  teal: 'text-teal-700 bg-teal-100',
  violet: 'text-violet-600 bg-violet-100',
  green: 'text-green-600 bg-green-100',
}

export default function EscalationPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Escalation Contacts</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            For sensitive concerns, always escalate to a person. WorkTwin does not provide final guidance on these topics.
          </p>
        </div>

        {/* Important reminder */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              WorkTwin is not a substitute for a human expert in sensitive situations.
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              For safeguarding, medication incidents, HR matters, legal concerns, health &amp; safety, or anything you are unsure about —
              always speak to the relevant contact below. If in doubt, escalate.
            </p>
          </div>
        </div>

        {/* Emergency call-out */}
        <div className="bg-red-700 rounded-2xl px-5 py-4 flex items-center gap-4 text-white">
          <Phone size={22} className="shrink-0" />
          <div className="flex-1">
            <p className="font-bold">Emergency — immediate risk to life</p>
            <p className="text-red-200 text-sm">Call 999 immediately. Do not wait to consult WorkTwin or your manager.</p>
          </div>
          <div className="text-2xl font-bold">999</div>
        </div>

        {/* Out of hours */}
        <div className="bg-slate-800 rounded-2xl px-5 py-4 flex items-center gap-4 text-white">
          <Clock size={18} className="shrink-0 text-slate-300" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Out-of-hours on-call manager</p>
            <p className="text-slate-400 text-xs">For urgent non-emergency concerns outside office hours</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm">07700 900 999</p>
            <p className="text-xs text-slate-400">18:00–08:00 &amp; weekends</p>
          </div>
        </div>

        {/* Category cards */}
        <div className="space-y-4">
          {categories.map(cat => {
            const Icon = cat.icon
            return (
              <div key={cat.id} className={`border rounded-2xl overflow-hidden ${colourMap[cat.colour]}`}>
                <div className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconColourMap[cat.colour]}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-slate-900">{cat.title}</h2>
                      <p className="text-xs text-slate-500">{cat.description}</p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">When to escalate</p>
                    <ul className="space-y-1">
                      {cat.whenToEscalate.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
                          <span className="text-slate-400 shrink-0 mt-0.5">·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2.5">
                    {cat.contacts.map((contact) => (
                      <div key={contact.name} className="bg-white/70 rounded-xl p-3.5 border border-white">
                        <div className="flex items-start justify-between gap-3 mb-1">
                          <div>
                            <p className="font-semibold text-slate-900 text-sm">
                          {contact.name}
                          <span className="font-normal text-xs text-slate-400 ml-1">(sample)</span>
                        </p>
                            <p className="text-xs text-slate-500">{contact.role}</p>
                          </div>
                          <span className="text-xs text-slate-400 whitespace-nowrap">{contact.availability}</span>
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2">
                          {contact.phone && (
                            <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900">
                              <Phone size={12} />
                              {contact.phone}
                            </a>
                          )}
                          {contact.email && (
                            <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-900">
                              <Mail size={12} />
                              {contact.email}
                            </a>
                          )}
                        </div>
                        {contact.notes && (
                          <p className="text-xs text-slate-500 mt-2 italic">{contact.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-slate-400 text-center pb-2">
          This page is visible to all staff.{' '}
          <Link href="/admin/roles" className="underline">Manage access in Roles &amp; Permissions.</Link>{' '}
          Contact details are fictional — this is a demo only.
        </p>
      </div>
    </AppLayout>
  )
}
