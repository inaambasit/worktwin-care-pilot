'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { Lock, Plus, Trash2, Save, Shield, AlertTriangle } from 'lucide-react'

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
    title: 'Medication questions to ask my supervisor',
    content: `Things I want to clarify about medication administration:
- What happens if a service user hides their medication?
- How do I record a partially taken dose?
- Who signs off the MAR chart at end of shift?

Asked WorkTwin about medication refusal — need to practise the scenario.`,
    tag: 'Medication',
    date: '23 Apr 2025',
  },
  {
    id: 2,
    title: 'Notes from my induction — Week 1',
    content: `Key things I learned this week:
- Fire exits are on the ground floor east and north wings
- Handover happens at 07:00, 14:00 and 22:00
- Always sign in on the paper rota AND the digital system
- My line manager is happy to answer questions any time

Feeling a bit overwhelmed by the medication policy but the WorkTwin answer helped a lot.`,
    tag: 'Induction',
    date: '17 Apr 2025',
  },
  {
    id: 3,
    title: 'Learning ideas — things I want to practise',
    content: `Scenarios I want to work through before I feel confident:
1. Medication refusal
2. Safeguarding disclosure
3. End of life conversations
4. Managing distress

Also want to read the full complaints policy — came up in conversation today.`,
    tag: 'Learning',
    date: '21 Apr 2025',
  },
]

const tagColours: Record<string, string> = {
  Medication: 'bg-blue-50 text-blue-700',
  Induction: 'bg-teal-50 text-teal-700',
  Learning: 'bg-violet-50 text-violet-700',
  General: 'bg-slate-100 text-slate-600',
}

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
      <div className="max-w-4xl mx-auto">
        {/* Privacy notice */}
        <div className="bg-teal-50 border border-teal-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-3">
          <Shield size={16} className="text-teal-700 shrink-0" />
          <p className="text-sm text-teal-800">
            <span className="font-semibold">Notes are private in this demo.</span> In a real deployment, notes would not be accessible to managers or colleagues.
          </p>
        </div>
        {/* Demo disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-center gap-3 mb-5">
          <AlertTriangle size={16} className="text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <span className="font-semibold">Demo only:</span> In this demo, notes are stored in this browser session only and are not saved to a server.
          </p>
        </div>

        <div className="flex gap-4 h-[calc(100vh-260px)] min-h-[400px]">
          {/* Note list */}
          <div className="w-64 shrink-0 flex flex-col gap-2">
            <button
              onClick={createNewNote}
              className="flex items-center gap-2 w-full px-3 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              New note
            </button>
            <div className="flex-1 overflow-y-auto space-y-1.5">
              {notes.map(note => (
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
              ))}
            </div>
          </div>

          {/* Note editor */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-sm">
            {notes.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                <div className="text-center">
                  <Lock size={32} className="mx-auto mb-3 text-slate-300" />
                  <p>No notes yet. Create your first private note.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Editor header */}
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    className="flex-1 text-base font-semibold text-slate-900 outline-none bg-transparent"
                    placeholder="Note title…"
                  />
                  <div className="flex items-center gap-2">
                    {saved && (
                      <span className="text-xs text-teal-600 font-medium">Saved ✓</span>
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

                {/* Text area */}
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  placeholder="Start writing your private note…"
                  className="flex-1 px-5 py-4 text-sm text-slate-700 leading-relaxed outline-none resize-none placeholder-slate-300"
                />

                {/* Footer */}
                <div className="px-5 py-2 border-t border-slate-100 flex items-center gap-2">
                  <Lock size={12} className="text-slate-400" />
                  <p className="text-xs text-slate-400">Demo only — session storage · Not persisted between sessions</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
