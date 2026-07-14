import { useState, useEffect, useRef } from 'react'
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  FolderOpen,
  Filter,
  Upload,
  Download,
  File,
} from 'lucide-react'
import { documents as docsApi, type Document } from '../lib/api'

const CATEGORIES = [
  { value: 'identite', label: 'Identité', emoji: '🪪' },
  { value: 'patrimoine', label: 'Patrimoine', emoji: '🏠' },
  { value: 'juridique', label: 'Juridique', emoji: '⚖️' },
  { value: 'fiscal', label: 'Fiscal', emoji: '📊' },
  { value: 'autre', label: 'Autre', emoji: '📎' },
]

const STATUS_OPTIONS = [
  { value: 'a_fournir', label: 'À fournir', icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  { value: 'en_cours', label: 'En cours', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  { value: 'obtenu', label: 'Obtenu', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
]

const SUGGESTED_DOCS = [
  { name: 'Livret de famille', category: 'identite' },
  { name: 'Pièces d\'identité (CNI / Passeport)', category: 'identite' },
  { name: 'Acte de mariage / PACS', category: 'juridique' },
  { name: 'Titre(s) de propriété', category: 'patrimoine' },
  { name: 'Contrat(s) d\'assurance-vie', category: 'patrimoine' },
  { name: 'Relevés de comptes bancaires', category: 'patrimoine' },
  { name: 'Dernier avis d\'imposition', category: 'fiscal' },
  { name: 'Déclaration ISF/IFI (si applicable)', category: 'fiscal' },
  { name: 'Testament (si existant)', category: 'juridique' },
  { name: 'Contrat de mariage', category: 'juridique' },
  { name: 'Acte de donation antérieur', category: 'juridique' },
]

interface FormData {
  name: string
  category: string
  status: string
  notes: string
}

const emptyForm: FormData = { name: '', category: 'identite', status: 'a_fournir', notes: '' }

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

export default function Documents() {
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [pendingFile, setPendingFile] = useState<{ name: string; type: string; size: number; data: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [submitting, setSubmitting] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => { loadDocs() }, [])

  async function loadDocs() {
    try {
      const data = await docsApi.list()
      setDocs(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSubmitting(true)
    try {
      const payload: any = { ...form }
      if (pendingFile) {
        payload.fileName = pendingFile.name
        payload.fileType = pendingFile.type
        payload.fileSize = pendingFile.size
        payload.fileData = pendingFile.data
        if (!payload.status || payload.status === 'a_fournir') payload.status = 'obtenu'
      }
      if (editingId) {
        const updated = await docsApi.update({ id: editingId, ...payload })
        setDocs((prev) => prev.map((d) => (d.id === editingId ? updated : d)))
      } else {
        const created = await docsApi.create(payload)
        setDocs((prev) => [...prev, created])
      }
      resetForm()
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      alert('Fichier trop volumineux (max 2 Mo)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      setPendingFile({ name: file.name, type: file.type, size: file.size, data: base64 })
      if (!form.name.trim()) setForm(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, '') }))
    }
    reader.readAsDataURL(file)
  }

  async function handleDownload(doc: Document) {
    try {
      const result = await docsApi.download(doc.id)
      const link = document.createElement('a')
      link.href = `data:${result.fileType};base64,${result.fileData}`
      link.download = result.fileName || doc.name
      link.click()
    } catch {
      alert('Erreur lors du téléchargement.')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer ce document ?')) return
    try {
      await docsApi.delete(id)
      setDocs((prev) => prev.filter((d) => d.id !== id))
    } catch { /* ignore */ }
  }

  async function handleStatusChange(doc: Document, newStatus: string) {
    try {
      const updated = await docsApi.update({ id: doc.id, status: newStatus })
      setDocs((prev) => prev.map((d) => (d.id === doc.id ? updated : d)))
    } catch { /* ignore */ }
  }

  function startEdit(doc: Document) {
    setForm({ name: doc.name, category: doc.category, status: doc.status, notes: doc.notes || '' })
    setEditingId(doc.id)
    setShowForm(true)
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setPendingFile(null)
  }

  async function addSuggested(sug: { name: string; category: string }) {
    // Don't add if already exists
    if (docs.some((d) => d.name === sug.name)) return
    try {
      const created = await docsApi.create({ name: sug.name, category: sug.category })
      setDocs((prev) => [...prev, created])
    } catch { /* ignore */ }
  }

  const filtered = docs.filter((d) => {
    if (filterCat !== 'all' && d.category !== filterCat) return false
    if (filterStatus !== 'all' && d.status !== filterStatus) return false
    return true
  })

  const stats = {
    total: docs.length,
    obtenu: docs.filter((d) => d.status === 'obtenu').length,
    enCours: docs.filter((d) => d.status === 'en_cours').length,
    aFournir: docs.filter((d) => d.status === 'a_fournir').length,
  }

  const progress = stats.total > 0 ? Math.round((stats.obtenu / stats.total) * 100) : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
        <span className="ml-2 text-navy-500">Chargement des documents...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
            Documents 📄
          </h1>
          <p className="text-navy-500 text-sm">
            Suivez l'état des pièces à fournir pour le dossier de transmission.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true) }}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-navy-700">Progression des documents</span>
          <span className="text-lg font-bold text-navy-800">{progress}%</span>
        </div>
        <div className="w-full bg-navy-100 rounded-full h-2.5 mb-3">
          <div
            className="bg-gradient-to-r from-green-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-green-50 rounded-lg p-2">
            <div className="text-lg font-bold text-green-700">{stats.obtenu}</div>
            <div className="text-xs text-green-600">Obtenus</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-lg font-bold text-blue-700">{stats.enCours}</div>
            <div className="text-xs text-blue-600">En cours</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-2">
            <div className="text-lg font-bold text-amber-700">{stats.aFournir}</div>
            <div className="text-xs text-amber-600">À fournir</div>
          </div>
        </div>
      </div>

      {/* Suggestions (only if < 5 docs) */}
      {docs.length < 5 && (
        <div className="bg-navy-50 border border-navy-100 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-navy-700 mb-2">📋 Documents recommandés :</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_DOCS.filter((s) => !docs.some((d) => d.name === s.name)).slice(0, 6).map((sug) => (
              <button
                key={sug.name}
                onClick={() => addSuggested(sug)}
                className="text-xs px-3 py-1.5 rounded-full border border-navy-200 text-navy-600 hover:bg-white hover:border-navy-300 transition-colors"
              >
                + {sug.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      {docs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4 items-center">
          <Filter size={14} className="text-navy-400" />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="text-xs px-2 py-1.5 border border-navy-200 rounded-lg bg-white text-navy-600"
          >
            <option value="all">Toutes catégories</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs px-2 py-1.5 border border-navy-200 rounded-lg bg-white text-navy-600"
          >
            <option value="all">Tous statuts</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Form (modal-like) */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-navy-200 shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-navy-800">
              {editingId ? 'Modifier le document' : 'Ajouter un document'}
            </h2>
            <button onClick={resetForm} className="p-1 text-navy-400 hover:text-navy-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Nom du document</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Titre de propriété — résidence principale"
                className="w-full px-3 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Catégorie</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Statut</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Notes (optionnel)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Où trouver ce document, remarques..."
                rows={2}
                className="w-full px-3 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 resize-y"
              />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Fichier (optionnel, max 2 Mo)</label>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                className="hidden"
              />
              {pendingFile ? (
                <div className="flex items-center gap-2 px-3 py-2.5 border border-emerald-200 bg-emerald-50 rounded-lg">
                  <File size={16} className="text-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-emerald-700 flex-1 truncate">{pendingFile.name}</span>
                  <span className="text-xs text-emerald-500">{(pendingFile.size / 1024).toFixed(0)} Ko</span>
                  <button type="button" onClick={() => setPendingFile(null)} className="text-emerald-400 hover:text-red-500">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-navy-200 rounded-lg text-sm text-navy-500 hover:border-navy-400 hover:text-navy-700 transition-colors"
                >
                  <Upload size={16} />
                  Choisir un fichier
                </button>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-navy-600 hover:text-navy-800">
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                {editingId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Document list */}
      {filtered.length === 0 && docs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-navy-100/60">
          <FolderOpen size={48} className="mx-auto text-navy-300 mb-4" />
          <h3 className="font-semibold text-navy-700 mb-1">Aucun document</h3>
          <p className="text-sm text-navy-500 mb-4">
            Commencez par ajouter les documents nécessaires à votre dossier.
          </p>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="text-sm font-medium text-navy-600 hover:text-navy-800"
          >
            + Ajouter un document
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-navy-500 text-sm">
          Aucun document ne correspond aux filtres.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((doc) => {
            const cat = CATEGORIES.find((c) => c.value === doc.category)
            const statusCfg = STATUS_OPTIONS.find((s) => s.value === doc.status) || STATUS_OPTIONS[0]
            const StatusIcon = statusCfg.icon
            return (
              <div
                key={doc.id}
                className="bg-white rounded-xl border border-navy-100/60 shadow-sm p-4 hover:border-navy-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0 text-lg">
                      {cat?.emoji || '📎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-navy-800 text-sm flex items-center gap-1.5">
                        {doc.name}
                        {doc.fileName && <File size={12} className="text-emerald-500 flex-shrink-0" />}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-navy-400">{cat?.label || doc.category}</span>
                        {doc.fileName && (
                          <span className="text-xs text-emerald-500">{doc.fileName}</span>
                        )}
                        {doc.notes && (
                          <span className="text-xs text-navy-400 truncate max-w-48">• {doc.notes}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status selector */}
                    <select
                      value={doc.status}
                      onChange={(e) => handleStatusChange(doc, e.target.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border font-medium ${statusCfg.bg} ${statusCfg.color} appearance-none cursor-pointer`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                    {doc.fileName && (
                      <button onClick={() => handleDownload(doc)} className="p-1.5 text-navy-400 hover:text-emerald-600" title="Télécharger">
                        <Download size={14} />
                      </button>
                    )}
                    <button onClick={() => startEdit(doc)} className="p-1.5 text-navy-400 hover:text-navy-600">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-navy-400 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
