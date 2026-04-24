'use client'
import { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { FileText, Upload, CheckCircle, Clock, AlertCircle, Users, Eye } from 'lucide-react'

interface Document {
  id: number
  name: string
  category: string
  status: 'Active' | 'Under Review' | 'Draft'
  access: string[]
  lastUpdated: string
  size: string
}

const documents: Document[] = [
  { id: 1, name: 'Staff Handbook', category: 'HR & General', status: 'Active', access: ['All staff'], lastUpdated: '12 Jan 2025', size: '1.4 MB' },
  { id: 2, name: 'Medication Administration Policy', category: 'Clinical', status: 'Active', access: ['Care Workers', 'Senior Carers', 'Nurses'], lastUpdated: '20 Jan 2025', size: '890 KB' },
  { id: 3, name: 'Safeguarding Policy and Procedure', category: 'Safeguarding', status: 'Active', access: ['All staff'], lastUpdated: '5 Feb 2025', size: '1.1 MB' },
  { id: 4, name: 'Health and Safety Policy', category: 'H&S', status: 'Under Review', access: ['All staff'], lastUpdated: '8 Mar 2025', size: '760 KB' },
  { id: 5, name: 'Complaints Procedure', category: 'Quality', status: 'Active', access: ['All staff'], lastUpdated: '14 Feb 2025', size: '430 KB' },
  { id: 6, name: 'Infection Control Procedure', category: 'Clinical', status: 'Active', access: ['All staff'], lastUpdated: '1 Mar 2025', size: '680 KB' },
  { id: 7, name: 'Mental Capacity Act Guidance', category: 'Clinical', status: 'Active', access: ['Care Workers', 'Senior Carers', 'Nurses'], lastUpdated: '22 Nov 2024', size: '520 KB' },
  { id: 8, name: 'Incident Reporting Procedure', category: 'Quality', status: 'Active', access: ['All staff'], lastUpdated: '3 Apr 2025', size: '340 KB' },
  { id: 9, name: 'Disciplinary and Grievance Policy', category: 'HR & General', status: 'Active', access: ['Managers', 'HR'], lastUpdated: '10 Jan 2025', size: '610 KB' },
  { id: 10, name: 'End of Life Care Policy', category: 'Clinical', status: 'Under Review', access: ['Senior Carers', 'Nurses', 'Managers'], lastUpdated: '15 Mar 2025', size: '480 KB' },
  { id: 11, name: 'Rota and Leave Management SOP', category: 'HR & General', status: 'Draft', access: ['Managers', 'HR'], lastUpdated: '22 Apr 2025', size: '210 KB' },
]

const statusIcon: Record<string, React.ReactNode> = {
  Active: <CheckCircle size={14} className="text-teal-600" />,
  'Under Review': <Clock size={14} className="text-amber-500" />,
  Draft: <AlertCircle size={14} className="text-slate-400" />,
}

const statusColour: Record<string, string> = {
  Active: 'bg-teal-50 text-teal-700',
  'Under Review': 'bg-amber-50 text-amber-700',
  Draft: 'bg-slate-100 text-slate-500',
}

const categories = ['All', ...Array.from(new Set(documents.map(d => d.category)))]

export default function DocumentsPage() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [dragging, setDragging] = useState(false)

  const filtered = activeCategory === 'All' ? documents : documents.filter(d => d.category === activeCategory)

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Company Documents</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Approved documents that WorkTwin uses to answer staff questions. All answers are grounded in these files.
            </p>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1.5 font-medium whitespace-nowrap shrink-0">
            {documents.filter(d => d.status === 'Active').length} active documents
          </span>
        </div>

        {/* Upload area */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false) }}
          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-colors ${
            dragging ? 'border-teal-400 bg-teal-50' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-teal-50/50'
          }`}
        >
          <Upload size={24} className="mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-semibold text-slate-700">Drop documents here to upload</p>
          <p className="text-xs text-slate-400 mt-1">Supports PDF, DOCX, TXT · Max 25 MB per file</p>
          <button className="mt-3 text-sm bg-teal-700 hover:bg-teal-800 text-white font-medium px-4 py-2 rounded-lg transition-colors">
            Browse files
          </button>
          <p className="text-xs text-slate-400 mt-2">
            Uploaded documents are processed and indexed for staff queries. Set access by role before publishing.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === cat
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'border-slate-200 text-slate-600 hover:border-teal-300 bg-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Document table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Access</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Updated</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc, i) => (
                <tr key={doc.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i === filtered.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FileText size={15} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-800">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{doc.category}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {statusIcon[doc.status]}
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColour[doc.status]}`}>
                        {doc.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Users size={12} className="text-slate-400" />
                      {doc.access.join(', ')}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">{doc.lastUpdated}</td>
                  <td className="px-4 py-3.5">
                    <button className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-900 font-medium">
                      <Eye size={13} />
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-slate-400 text-center">
          Only documents listed here are used to answer staff questions. WorkTwin does not use the internet or external sources.
        </p>
      </div>
    </AppLayout>
  )
}
