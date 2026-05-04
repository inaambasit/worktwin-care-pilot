import Link from 'next/link'
import { CheckCircle, Shield, BookOpen, MessageCircle, PlayCircle, BarChart2 } from 'lucide-react'

const features = [
  {
    icon: MessageCircle,
    title: 'Ask questions safely',
    description:
      'Employees can get guided, policy-grounded support for work, policy and workflow questions without feeling embarrassed or interrupting managers.',
  },
  {
    icon: BookOpen,
    title: 'Onboarding and learning support',
    description:
      'New starters follow structured, AI-guided journeys with documents, checklists, knowledge checks and role-specific learning built in.',
  },
  {
    icon: PlayCircle,
    title: 'Vertical scenario templates',
    description:
      'Teams can practise realistic scenarios for their sector. In the Care Pilot, this includes medication refusal, safeguarding and incident reporting.',
  },
  {
    icon: Shield,
    title: 'Privacy by default',
    description:
      'Employee chats are private. WorkTwin is designed so managers see anonymised themes only, not individual conversations.',
  },
  {
    icon: BarChart2,
    title: 'Anonymous insights for leaders',
    description:
      'Identify policy areas needing clearer guidance, repeated workflow questions and common support themes without breaching staff trust.',
  },
  {
    icon: CheckCircle,
    title: 'Source-cited answers',
    description:
      'WorkTwin is designed to show approved sources for answers, so staff can see where guidance comes from and audit trails stay clear.',
  },
]

const trustItems = [
  'Employee chat content is not shown on manager pages in this demo',
  'Designed for answers grounded in approved documents',
  'Sensitive topics are escalated to a human - never answered automatically',
  'No performance scoring, surveillance or sentiment tracking',
  'Designed around UK GDPR principles',
]

const steps = [
  {
    step: '1',
    title: 'Upload approved documents',
    description: 'Upload existing handbooks, SOPs, policies, workflows and training documents. WorkTwin prepares approved documents for governed retrieval.',
  },
  {
    step: '2',
    title: 'Employees ask questions',
    description: 'Staff ask questions in plain English. WorkTwin is designed to answer from approved documents and show the source when the required document and governance checks are in place.',
  },
  {
    step: '3',
    title: 'Leaders see trends, not transcripts',
    description: 'Leaders view anonymised themes: repeated questions, unclear policies and documents needing improvement. Never private chats.',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-700 flex items-center justify-center">
              <span className="text-white text-sm font-bold">W</span>
            </div>
            <span className="font-bold text-slate-900 text-lg">WorkTwin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
              Explore demo
            </Link>
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 font-medium">
              Staff sign in
            </Link>
            <Link
              href="/book-pilot"
              className="text-sm bg-teal-700 hover:bg-teal-800 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Book a pilot
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <div className="inline-block mb-5 text-xs font-semibold text-teal-400 border border-teal-800 bg-teal-900/40 px-3 py-1.5 rounded-full uppercase tracking-wider">
            WorkTwin | Care Pilot
          </div>
          <p className="mb-4 text-sm font-medium text-teal-200">
            The first vertical of the WorkTwin platform for regulated SMEs.
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
            Give regulated teams a private AI{' '}
            <span className="text-teal-400">work companion.</span>
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto mb-10">
            WorkTwin is a privacy-first AI work, onboarding, policy, workflow and learning companion
            for employees in regulated SMEs. WorkTwin Care Pilot is the first vertical demo, showing
            how the platform can support UK care providers with care-specific policies and scenarios.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/book-pilot"
              className="w-full sm:w-auto px-8 py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-base transition-colors shadow-lg shadow-teal-900/40"
            >
              Book a pilot
            </Link>
            <Link
              href="#privacy"
              className="w-full sm:w-auto px-8 py-3.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-base transition-colors"
            >
              See how privacy works
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-500">
            First internal test: Thumhara Centre | Sample documents only | No real staff, service-user or client data
          </p>
        </div>
      </section>

      {/* Demo links bar */}
      <div className="bg-teal-700 py-3">
        <div className="max-w-6xl mx-auto px-6 flex flex-wrap items-center justify-center gap-4 text-sm text-teal-100">
          <span className="font-medium text-white">Explore the demo:</span>
          <Link href="/dashboard" className="hover:text-white underline underline-offset-2">Employee Dashboard</Link>
          <Link href="/ask" className="hover:text-white underline underline-offset-2">Ask WorkTwin</Link>
          <Link href="/onboarding" className="hover:text-white underline underline-offset-2">My Onboarding</Link>
          <Link href="/scenarios" className="hover:text-white underline underline-offset-2">Practice Scenarios</Link>
        </div>
      </div>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">
              One platform, focused vertical pilots
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Built for regulated SMEs that need consistent onboarding, trusted policy guidance,
              workflow support and safe learning without employee surveillance.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-teal-700" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-3">How it works</h2>
            <p className="text-slate-500">Set up in hours, not months.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map(({ step, title, description }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-teal-700 text-white font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy section */}
      <section id="privacy" className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 md:p-14 flex flex-col md:flex-row gap-10 items-start">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 bg-teal-900/40 border border-teal-800 text-teal-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-5 uppercase tracking-wider">
                <Shield size={12} />
                Privacy-first by design
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                Private for the employee.<br />Useful for the employer.<br />Safe for both.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                WorkTwin is built on a simple principle: employees in regulated workplaces should be
                able to ask questions without fear. That means private conversations stay private by default.
              </p>
            </div>
            <div className="md:w-1/2 space-y-3">
              {trustItems.map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle size={18} className="text-teal-400 shrink-0 mt-0.5" />
                  <p className="text-slate-300 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-teal-700">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to test a focused WorkTwin vertical?
          </h2>
          <p className="text-teal-100 mb-8 leading-relaxed">
            We start small with approved documents, a narrow employee group and anonymised insight
            reporting. No surveillance, no performance scoring, no productivity tracking.
          </p>
          <Link
            href="/book-pilot"
            className="inline-block px-10 py-3.5 bg-white text-teal-700 font-bold rounded-xl hover:bg-teal-50 transition-colors text-base shadow-lg"
          >
            Book a pilot
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">W</span>
            </div>
            <span className="text-white text-sm font-semibold">WorkTwin</span>
          </div>
          <p className="text-slate-500 text-xs text-center">
            This is a demo build using sample data only. No real staff, service-user, client or private care data is used.<br />
            WorkTwin Care Pilot is the first vertical test of the broader WorkTwin platform. &copy; {new Date().getFullYear()} WorkTwin.
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="/#privacy" className="hover:text-slate-300">Privacy model</Link>
            <Link href="/escalation" className="hover:text-slate-300">Escalation</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
