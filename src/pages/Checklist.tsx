import { useState, useEffect } from 'react'
import {
  CheckSquare,
  Square,
  Plus,
  Trash2,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Trophy,
} from 'lucide-react'
import { checklist as checklistApi, type ChecklistItem } from '../lib/api'

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  documents: { label: 'Documents à rassembler', emoji: '📄', color: 'border-l-amber-400' },
  patrimoine: { label: 'Inventaire du patrimoine', emoji: '🏠', color: 'border-l-blue-400' },
  famille: { label: 'Dialogue familial', emoji: '👨‍👩‍👧‍👦', color: 'border-l-purple-400' },
  juridique: { label: 'Aspects juridiques', emoji: '⚖️', color: 'border-l-navy-400' },
  fiscal: { label: 'Fiscalité', emoji: '📊', color: 'border-l-green-400' },
}

const CATEGORY_ORDER = ['documents', 'patrimoine', 'famille', 'juridique', 'fiscal']

export default function Checklist() {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('documents')
  const [newDesc, setNewDesc] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set())
  const [toggling, setToggling] = useState<string | null>(null)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    try {
      const data = await checklistApi.list()
      setItems(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleToggle(item: ChecklistItem) {
    setToggling(item.id)
    try {
      const updated = await checklistApi.toggle(item.id, !item.isCompleted)
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)))
    } catch { /* ignore */ }
    setToggling(null)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    setSubmitting(true)
    try {
      const created = await checklistApi.create({
        title: newTitle,
        category: newCategory,
        description: newDesc || undefined,
      })
      setItems((prev) => [...prev, created])
      setNewTitle('')
      setNewDesc('')
      setShowAdd(false)
    } catch { /* ignore */ }
    setSubmitting(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet élément ?')) return
    try {
      await checklistApi.delete(id)
      setItems((prev) => prev.filter((i) => i.id !== id))
    } catch { /* ignore */ }
  }

  function toggleCategory(cat: string) {
    setCollapsedCats((prev) => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const completed = items.filter((i) => i.isCompleted).length
  const total = items.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = total > 0 && completed === total

  // Group items by category
  const grouped = CATEGORY_ORDER.reduce((acc, cat) => {
    const catItems = items.filter((i) => i.category === cat)
    if (catItems.length > 0) acc.push({ category: cat, items: catItems })
    return acc
  }, [] as { category: string; items: ChecklistItem[] }[])

  // Add any categories not in CATEGORY_ORDER
  const knownCats = new Set(CATEGORY_ORDER)
  const unknownItems = items.filter((i) => !knownCats.has(i.category))
  if (unknownItems.length > 0) {
    grouped.push({ category: 'autre', items: unknownItems })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
        <span className="ml-2 text-navy-500">Chargement de la checklist...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
            Checklist de préparation ✅
          </h1>
          <p className="text-navy-500 text-sm">
            Vérifiez chaque étape avant votre rendez-vous chez le notaire.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Ajouter</span>
        </button>
      </div>

      {/* Progress card */}
      <div className={`rounded-2xl border shadow-sm p-6 mb-6 ${allDone ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-white border-navy-100/60'}`}>
        {allDone ? (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <Trophy size={28} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-bold text-green-800 text-lg">Dossier complet ! 🎉</h2>
              <p className="text-sm text-green-600">Toutes les étapes sont validées. Vous êtes prêt pour le notaire.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-navy-500" />
                <span className="text-sm font-medium text-navy-700">Avancement global</span>
              </div>
              <span className="text-lg font-bold text-navy-800">{completed} / {total}</span>
            </div>
            <div className="w-full bg-navy-100 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-navy-600 to-navy-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-navy-400">{progress}% terminé</p>
          </>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-white rounded-xl border border-navy-200 shadow-lg p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-navy-800 text-sm">Ajouter une étape personnalisée</h3>
            <button onClick={() => setShowAdd(false)} className="p-1 text-navy-400 hover:text-navy-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleAdd} className="space-y-3">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titre de l'étape..."
              className="w-full px-3 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20"
              required
            />
            <div className="flex gap-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1 px-3 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20"
              >
                {CATEGORY_ORDER.map((c) => (
                  <option key={c} value={c}>{CATEGORY_META[c]?.emoji} {CATEGORY_META[c]?.label || c}</option>
                ))}
              </select>
            </div>
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optionnel)..."
              rows={2}
              className="w-full px-3 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 resize-y"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-navy-600">
                Annuler
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Ajouter
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grouped checklist */}
      <div className="space-y-4">
        {grouped.map(({ category, items: catItems }) => {
          const meta = CATEGORY_META[category] || { label: category, emoji: '📋', color: 'border-l-navy-300' }
          const catCompleted = catItems.filter((i) => i.isCompleted).length
          const collapsed = collapsedCats.has(category)
          return (
            <div key={category} className={`bg-white rounded-xl border border-navy-100/60 shadow-sm overflow-hidden border-l-4 ${meta.color}`}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-navy-50/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {collapsed ? <ChevronRight size={16} className="text-navy-400" /> : <ChevronDown size={16} className="text-navy-400" />}
                  <span className="text-lg">{meta.emoji}</span>
                  <span className="font-semibold text-navy-800 text-sm">{meta.label}</span>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  catCompleted === catItems.length
                    ? 'bg-green-100 text-green-700'
                    : 'bg-navy-100 text-navy-600'
                }`}>
                  {catCompleted} / {catItems.length}
                </span>
              </button>

              {/* Items */}
              {!collapsed && (
                <div className="divide-y divide-navy-50">
                  {catItems.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 px-5 py-3.5 group transition-colors ${
                        item.isCompleted ? 'bg-green-50/30' : 'hover:bg-navy-50/20'
                      }`}
                    >
                      <button
                        onClick={() => handleToggle(item)}
                        disabled={toggling === item.id}
                        className="mt-0.5 flex-shrink-0"
                      >
                        {toggling === item.id ? (
                          <Loader2 size={20} className="animate-spin text-navy-400" />
                        ) : item.isCompleted ? (
                          <CheckSquare size={20} className="text-green-500" />
                        ) : (
                          <Square size={20} className="text-navy-300 hover:text-navy-500" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${item.isCompleted ? 'text-navy-400 line-through' : 'text-navy-800'}`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="text-xs text-navy-400 mt-0.5">{item.description}</p>
                        )}
                      </div>
                      {!item.isDefault && (
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-navy-300 hover:text-red-500 transition-all flex-shrink-0"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
