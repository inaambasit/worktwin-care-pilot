import AppLayout from '@/components/AppLayout'
import { Shield, BarChart2, AlertCircle, TrendingUp, FileText, HelpCircle } from 'lucide-react'

const INSIGHTS_CHIPS = ['Anonymised data only', 'No individual records', 'Sample figures', 'Admin view']

const topQuestions = [
  { topic: 'Medication administration', pct: 34, count: 47 },
  { topic: 'Safeguarding procedures', pct: 22, count: 30 },
  { topic: 'Leave and rota management', pct: 18, count: 25 },
  { topic: 'Food and nutrition', pct: 14, count: 19 },
  { topic: 'Incident reporting', pct: 12, count: 17 },
]

const trainingGaps = [
  { topic: 'Medication administration', groupLabel: 'Recurring theme', desc: 'Staff regularly asking about MAR completion and refusal procedures' },
  { topic: 'Mental Capacity Act application', groupLabel: 'Common question area', desc: 'Questions about when and how to apply MCA in day-to-day care' },
  { topic: 'Infection control protocols', groupLabel: 'Several staff', desc: 'Recurring questions around PPE selection and disposal' },
  { topic: 'Incident classification', groupLabel: 'Common question area', desc: 'Uncertainty around what qualifies as a notifiable incident' },
]

const unansweredThemes = [
  'Staff asking about overtime pay rates — not covered in current documents',
  'Questions about agency staff onboarding — no specific SOP available',
  'Requests for guidance on restraint procedures — needs clinical policy',
  'Questions about staff appraisal process — HR policy not yet uploaded',
  'Queries about out-of-hours GP contact process — not documented',
  'Questions about visiting family member policies — no current guidance',
  'Staff asking about uniform allowances — not in handbook',
]

const documentSuggestions = [
  {
    doc: 'Medication Administration Policy',
    issue: 'Most-questioned document. Staff frequently ask about partial doses and MAR chart completion. Consider adding a step-by-step visual guide.',
    priority: 'High',
  },
  {
    doc: 'Rota and Leave Management SOP',
    issue: 'Currently in draft. 25 questions about rota and leave this month — staff need clear guidance urgently.',
    priority: 'High',
  },
  {
    doc: 'Infection Control Procedure',
    issue: 'Questions suggest staff are confused about PPE tier selection. A decision tree could help.',
    priority: 'Medium',
  },
]

const priorityColour: Record<string, string> = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-slate-50 text-slate-600 border-slate-200',
}

export default function InsightsPage() {
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-8 space-y-6">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-5">
              <BarChart2 size={11} />
              Anonymous Insights
            </span>
            <h1 className="text-3xl font-bold mb-2.5 leading-snug">Staff Question Insights</h1>
            <p className="text-slate-200 text-sm leading-relaxed max-w-lg mb-5">
              Anonymised, aggregated question trends across the organisation. No individual staff names, conversations or private data are shown here.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {INSIGHTS_CHIPS.map(chip => (
                <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-slate-300 text-xs">
              All figures are illustrative — this is sample data, not real Thumhara Centre usage.
            </p>
          </div>
        </div>

        {/* Sample data banner */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl px-4 py-3 flex items-start gap-3">
          <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Sample data only — illustrative themes, not real staff usage.</span>{' '}
            These figures do not represent real staff activity at Thumhara Centre or any other organisation.
            In a real deployment, this view is restricted to authorised managers only.
          </p>
        </div>

        {/* Strong privacy notice */}
        <div className="bg-gradient-to-r from-teal-800 to-teal-700 rounded-2xl p-5 text-white">
          <div className="flex items-start gap-3">
            <Shield size={22} className="text-teal-300 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-base mb-1">Managers do not see private staff conversations</h2>
              <p className="text-teal-200 text-sm leading-relaxed">
                WorkTwin is private for employees. This page shows only anonymised, aggregated trends across
                the whole organisation. No individual names, questions, chat history, private notes or personal
                data are visible here. This is by design — not a setting that can be changed.
              </p>
            </div>
          </div>
        </div>

        {/* Top question areas */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <BarChart2 size={16} className="text-teal-600" />
            <h2 className="font-semibold text-slate-900">Top staff question areas — April 2025</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Illustrative example — what topics might staff ask about most in a typical month.
          </p>
          <div className="space-y-3">
            {topQuestions.map(({ topic, pct, count }) => (
              <div key={topic} className="flex items-center gap-3">
                <p className="text-sm text-slate-700 w-48 shrink-0">{topic}</p>
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                  <div
                    className="bg-teal-600 h-2.5 rounded-full transition-all"
                    style={{ width: `${pct * 2.8}%` }}
                  />
                </div>
                <div className="text-right w-20 shrink-0">
                  <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                  <span className="text-xs text-slate-400 ml-1">({count})</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Training gaps */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-amber-600" />
            <h2 className="font-semibold text-slate-900">Common policy support themes</h2>
          </div>
          <p className="text-xs text-slate-400 mb-2">
            Policy areas where recurring questions suggest clearer guidance may be helpful.
          </p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
            Shown only when group size is large enough to prevent identification of individuals.
          </p>
          <div className="space-y-3">
            {trainingGaps.map(({ topic, groupLabel, desc }) => (
              <div key={topic} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="shrink-0 mt-0.5 bg-amber-200 text-amber-800 font-semibold text-xs px-2 py-1 rounded-lg whitespace-nowrap">
                  {groupLabel}
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">{topic}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unanswered question themes */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <HelpCircle size={16} className="text-slate-500" />
            <h2 className="font-semibold text-slate-900">Unanswered question themes</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Questions that WorkTwin could not answer from current approved documents — topics where you may want to create new guidance.
          </p>
          <ul className="space-y-2">
            {unansweredThemes.map((theme, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                <AlertCircle size={15} className="text-slate-400 shrink-0 mt-0.5" />
                {theme}
              </li>
            ))}
          </ul>
        </div>

        {/* Document improvement suggestions */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-blue-600" />
            <h2 className="font-semibold text-slate-900">Document improvement suggestions</h2>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Based on question patterns, these documents may benefit from updates or additions.
          </p>
          <div className="space-y-3">
            {documentSuggestions.map(({ doc, issue, priority }) => (
              <div key={doc} className={`p-4 rounded-xl border ${priorityColour[priority]}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-sm">{doc}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${priorityColour[priority]}`}>
                    {priority} priority
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-80">{issue}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3">
          <p className="text-xs text-teal-800 font-semibold mb-1">Privacy guarantee</p>
          <p className="text-xs text-teal-700 leading-relaxed">
            Insights are aggregated and anonymised. Small groups are suppressed to reduce the risk of identifying
            individuals. Managers do not see private employee chat transcripts. WorkTwin never surfaces individual
            staff names, questions or conversation history in this view.
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
