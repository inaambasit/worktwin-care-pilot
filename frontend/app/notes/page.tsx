'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { Lock, Plus, Trash2, Save, Shield, ShieldCheck, Clock } from 'lucide-react'

interface Note {
  id: number
  title: string
  content: string
  tag: string
  date: string
}

const initialNotes: Note[] = [
  {
    id: 1,
    title: 'Example medication-awareness questions',
    content: `Example reflections for discussion with a trained lead:
- What should I do if a medication concern comes up during a visit?
- Which approved route should I use to record medication-related concerns?
- Who should I escalate to if I am unsure?

This is example reflection only. Do not write real medication records, MAR details or service-user information here.`,
    tag: 'Awareness',
    date: '23 Apr 2025',
  },
  {
    id: 2,
    title: 'Notes from my induction - Week 1',
    content: `Key things I learned this week:
- Fire exits are on the ground floor east and north wings
- Handover happens at 07:00, 14:00 and 22:00
- Always sign in on the paper rota AND the digital system
- My line manager is happy to answer questions any time

Feeling a bit overwhelmed by policy guidance — I should use WorkTwin for approved guidance only and speak to a human lead where needed.`,
    tag: 'Induction',
    date: '17 Apr 2025',
  },
  {
    id: 3,
    title: 'Learning ideas - things I want to practise',
    content: `Scenarios I want to work through before I feel confident:
1. Medication-related escalation awareness
2. Safeguarding escalation awareness
3. End of life conversations
4. Managing distress

Also want to read the full complaints policy - came up in conversation today.`,
    tag: 'Learning',
    date: '21 Apr 2025',
  },
]

const tagColours: Record<string, string> = {
  Awareness: 'bg-blue-50 text-blue-700',
  Induction: 'bg-teal-50 text-teal-700',
  Learning: 'bg-violet-50 text-violet-700',
  General: 'bg-slate-100 text-slate-600',
}

const CONTEXT_CHIPS = ['Example reflection', 'Session-only pilot', 'Not manager-visible', 'Staff support']

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [selected, setSelected] = useState<Note>(initialNotes[0])
  const [editContent, setEditContent] = useState(initialNotes[0].content)
  const [editTitle, setEditTitle] = useState(initialNotes[0].title)
  const [saved, setSaved] = useState(false)
  const [newNote, setNewNote] = useState(false)

  function selectNote(note: Note) {
    setSelected(note)
    setEditContent(note.content)
    setEditTitle(note.title)
    setSaved(false)
    setNewNote(false)
  }

  function saveNote() {
    setNotes(prev => prev.map(n => n.id === selected.id ? { ...n, title: editTitle, content: editContent, date: 'Just now' } : n))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function deleteNote(id: number) {
    const remaining = notes.filter(n => n.id !== id)
    setNotes(remaining)
    if (remaining.length > 0) selectNote(remaining[0])
  }

  function createNewNote() {
    const blank: Note = {
      id: Date.now(),
      title: 'New note',
      content: '',
      tag: 'General',
      date: 'Just now',
    }
    setNotes(prev => [blank, ...prev])
    selectNote(blank)
    setNewNote(true)
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 pt-4 pb-8 space-y-6">

        {/* Hero card */}
        <div className="bg-gradient-to-br from-teal-700 via-teal-800 to-teal-900 rounded-3xl p-7 text-white relative overflow-hidden shadow-lg">
          <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-6 -bottom-14 w-40 h-40 rounded-full bg-teal-600/25 pointer-events-none" />
          <div className="absolute -left-6 bottom-4 w-24 h-24 rounded-full bg-teal-800/40 pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 rounded-full text-xs font-semibold mb-5">
              <Lock size={11} />
              Private notes
            </span>
            <h1 className="text-3xl font-bold mb-2.5 leading-snug">Private Notes</h1>
            <p className="text-teal-100 text-sm leading-relaxed max-w-lg mb-5">
              Use this session-only space for example reflections during the controlled pilot. Do not enter real staff, service-user, HR, safeguarding, medication, complaint, care-plan or confidential data.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CONTEXT_CHIPS.map(chip => (
                <span key={chip} className="bg-white/15 text-white text-xs px-3 py-1.5 rounded-full font-medium">
                  {chip}
                </span>
              ))}
            </div>
            <p className="text-teal-200 text-xs">
              These example notes stay in this browser session only and are not shown on admin pages.
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center shrink-0">
              <Clock size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight">Session-only notes</p>
              <p className="text-xs text-slate-500">Not saved between sessions</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
              <Lock size={18} className="text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight">Private in this session</p>
              <p className="text-xs text-slate-500">Do not enter real personal data</p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
              <Shield size={18} className="text-slate-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-700 leading-tight">Not a formal record</p>
              <p className="text-xs text-slate-500">Not care, HR or compliance evidence</p>
            </div>
          </div>
        </div>

        {/* Note editor section */}
        <div>
          <h2 className="font-semibold text-slate-900 mb-1">Your example session note</h2>
          <p className="text-sm text-slate-500 mb-3">Write example reminders or reflections only. Do not enter real names, incidents, medication details, safeguarding concerns, HR issues, complaints or care notes.</p>

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5 mb-4">
            <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              <span className="font-semibold">Session only — notes will not be saved.</span>{' '}
              These notes are private to you during this session-only pilot view. Managers and admins cannot view them.
              They are not a care record, HR record, medication record, safeguarding record, supervision note or compliance record.
              Closing or refreshing this tab will clear all notes. Do not rely on notes surviving a browser close.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:h-[480px]">

            {/* Note list sidebar */}
            <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
              <button
                onClick={createNewNote}
                className="flex items-center gap-2 w-full px-3 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                New note
              </button>
              <div className="max-h-44 md:max-h-none md:flex-1 overflow-y-auto space-y-1.5">
                {notes.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-xl px-4 py-5 text-center">
                    <Lock size={24} className="mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium text-slate-500">No private note written yet.</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Start with an example reflection only. Do not enter real confidential or personal data.
                    </p>
                  </div>
                ) : (
                  notes.map(note => (
                    <button
                      key={note.id}
                      onClick={() => selectNote(note)}
                      className={`w-full text-left px-3 py-3 rounded-xl border transition-colors ${
                        selected.id === note.id
                          ? 'bg-white border-teal-200 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2">{note.title}</p>
                        <Lock size={12} className="text-slate-300 shrink-0 mt-0.5" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${tagColours[note.tag] || tagColours.General}`}>
                          {note.tag}
                        </span>
                        <span className="text-xs text-slate-400">{note.date}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Note editor panel */}
            <div className="flex-1 min-h-[320px] md:min-h-0 bg-white border border-slate-200 rounded-3xl flex flex-col overflow-hidden shadow-sm">
              {notes.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center px-8">
                    <Lock size={36} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-semibold text-slate-500 mb-1.5">No private note written yet.</p>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
                      Start with an example reflection only. Do not enter real confidential or personal data.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Editor header */}
                  <div className="px-6 py-4 border-b border-slate-100 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Example session note</p>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full text-base font-semibold text-slate-900 outline-none bg-transparent placeholder-slate-300"
                        placeholder="Example note title..."
                      />
                    </div>
                    <div className="flex items-center gap-2 shrink-0 pt-5">
                      {saved && (
                        <span className="text-xs text-teal-600 font-medium">Updated in session</span>
                      )}
                      <button
                        onClick={saveNote}
                        className="flex items-center gap-1.5 text-sm bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        <Save size={14} />
                        Save
                      </button>
                      <button
                        onClick={() => deleteNote(selected.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Textarea */}
                  <textarea
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="Start writing an example session reflection..."
                    className="flex-1 px-6 py-5 text-sm text-slate-700 leading-relaxed outline-none resize-none placeholder-slate-300"
                  />

                  {/* Footer */}
                  <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-2">
                    <Lock size={12} className="text-slate-400" />
                    <p className="text-xs text-slate-400">Session only - not a formal record</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Privacy by design card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex items-start gap-3">
          <div className="w-9 h-9 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <Shield size={16} className="text-teal-700" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800 text-sm mb-1">Session-only by design</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              These example session notes are not shown to managers in this controlled pilot. They are not formal records and must not be used for care documentation, HR evidence, compliance evidence, performance scoring, staff monitoring or admin review.
            </p>
          </div>
        </div>

        {/* Safe support reminders */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
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
                These notes are for example reflection during the controlled pilot only. Do not enter real staff, service-user, HR, safeguarding, medication, legal, complaint, care-plan or confidential information. If an issue is real, speak to the right human lead.
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

      </div>
    </AppLayout>
  )
}
