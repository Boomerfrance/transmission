import { useState, useEffect } from 'react'
import {
  Home,
  Briefcase,
  PiggyBank,
  TrendingUp,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Landmark,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { assets as assetsApi, type Asset as ApiAsset } from '../lib/api'

type AssetCategory = 'immobilier' | 'financier' | 'professionnel' | 'autre'

interface Asset {
  id: string
  category: AssetCategory
  label: string
  value: number
  notes: string
}

const categoryConfig: Record<AssetCategory, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  immobilier: { icon: Home, label: 'Immobilier', color: 'text-blue-600', bg: 'bg-blue-50' },
  financier: { icon: PiggyBank, label: 'Financier', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  professionnel: { icon: Briefcase, label: 'Professionnel', color: 'text-amber-600', bg: 'bg-amber-50' },
  autre: { icon: TrendingUp, label: 'Autre', color: 'text-purple-600', bg: 'bg-purple-50' },
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function apiToLocal(a: ApiAsset): Asset {
  return {
    id: a.id,
    category: (a.category as AssetCategory) || 'autre',
    label: a.label,
    value: parseFloat(a.value) || 0,
    notes: a.notes || '',
  }
}

export default function Patrimony() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ category: 'immobilier' as AssetCategory, label: '', value: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  // Load assets on mount
  useEffect(() => {
    async function load() {
      try {
        const items = await assetsApi.list()
        setAssets(items.map(apiToLocal))
      } catch (err) {
        setError('Impossible de charger les biens.')
        console.error(err)
      }
      setLoading(false)
    }
    load()
  }, [])

  const total = assets.reduce((s, a) => s + a.value, 0)
  const byCategory = assets.reduce((acc, a) => {
    acc[a.category] = (acc[a.category] || 0) + a.value
    return acc
  }, {} as Record<AssetCategory, number>)

  const openForm = (asset?: Asset) => {
    if (asset) {
      setEditId(asset.id)
      setForm({ category: asset.category, label: asset.label, value: String(asset.value), notes: asset.notes })
    } else {
      setEditId(null)
      setForm({ category: 'immobilier', label: '', value: '', notes: '' })
    }
    setShowForm(true)
  }

  const saveAsset = async () => {
    const value = parseFloat(form.value.replace(/\s/g, '')) || 0
    if (!form.label.trim()) return

    setSubmitting(true)
    try {
      if (editId) {
        const updated = await assetsApi.update({ id: editId, category: form.category, label: form.label, value, notes: form.notes || undefined })
        setAssets((prev) => prev.map((a) => a.id === editId ? apiToLocal(updated) : a))
      } else {
        const created = await assetsApi.create({ category: form.category, label: form.label, value, notes: form.notes || undefined })
        setAssets((prev) => [...prev, apiToLocal(created)])
      }
      setShowForm(false)
    } catch (err) {
      console.error('Save error:', err)
      setError('Erreur lors de la sauvegarde.')
    }
    setSubmitting(false)
  }

  const deleteAsset = async (id: string) => {
    try {
      await assetsApi.delete(id)
      setAssets((prev) => prev.filter((a) => a.id !== id))
    } catch (err) {
      console.error('Delete error:', err)
      setError('Erreur lors de la suppression.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
        <span className="ml-2 text-navy-500">Chargement du patrimoine...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
            Cartographie du patrimoine
          </h1>
          <p className="text-navy-500 text-sm">
            Inventoriez l'ensemble de vos biens pour préparer la transmission.
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
        >
          <Plus size={15} />
          Ajouter un bien
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle size={16} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
        <div className="col-span-2 lg:col-span-1 bg-gradient-to-br from-navy-800 to-navy-700 rounded-xl p-5 text-white">
          <div className="flex items-center gap-2 mb-2 text-navy-200">
            <Landmark size={16} />
            <span className="text-xs font-medium uppercase tracking-wide">Total</span>
          </div>
          <div className="text-2xl font-bold">{fmt(total)}</div>
          <div className="text-xs text-navy-300 mt-1">{assets.length} bien{assets.length > 1 ? 's' : ''}</div>
        </div>
        {(Object.keys(categoryConfig) as AssetCategory[]).map((cat) => {
          const cfg = categoryConfig[cat]
          const Icon = cfg.icon
          const val = byCategory[cat] || 0
          const pct = total > 0 ? ((val / total) * 100).toFixed(0) : 0
          return (
            <div key={cat} className="bg-white rounded-xl border border-navy-100 p-4">
              <div className={`flex items-center gap-1.5 mb-2 ${cfg.color}`}>
                <Icon size={14} />
                <span className="text-xs font-medium">{cfg.label}</span>
              </div>
              <div className="text-lg font-bold text-navy-800">{fmt(val)}</div>
              <div className="text-xs text-navy-400">{pct}% du total</div>
            </div>
          )
        })}
      </div>

      {/* Asset list */}
      <div className="bg-white rounded-2xl border border-navy-100/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100 flex items-center justify-between">
          <h2 className="font-semibold text-navy-800">Liste des biens</h2>
        </div>

        <div className="divide-y divide-navy-100/60">
          {assets.map((asset) => {
            const cfg = categoryConfig[asset.category]
            const Icon = cfg.icon
            return (
              <div key={asset.id} className="flex items-center gap-4 px-6 py-4 hover:bg-navy-50/30 transition-colors">
                <div className={`w-10 h-10 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-navy-800 text-sm">{asset.label}</div>
                  {asset.notes && (
                    <div className="text-xs text-navy-400 mt-0.5">{asset.notes}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-semibold text-navy-800">{fmt(asset.value)}</div>
                  <div className="text-xs text-navy-400">
                    {total > 0 ? ((asset.value / total) * 100).toFixed(1) : 0}%
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openForm(asset)}
                    className="p-1.5 text-navy-400 hover:text-navy-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => deleteAsset(asset.id)}
                    className="p-1.5 text-navy-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}

          {assets.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Landmark size={32} className="mx-auto text-navy-200 mb-3" />
              <p className="text-navy-500 text-sm">Aucun bien ajouté pour le moment.</p>
              <button
                onClick={() => openForm()}
                className="mt-3 text-sm font-medium text-navy-600 hover:text-navy-800"
              >
                Ajouter votre premier bien
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100">
              <h3 className="font-semibold text-navy-800">
                {editId ? 'Modifier le bien' : 'Ajouter un bien'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 text-navy-400 hover:text-navy-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Catégorie</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(categoryConfig) as AssetCategory[]).map((cat) => {
                    const cfg = categoryConfig[cat]
                    const Icon = cfg.icon
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, category: cat }))}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                          form.category === cat
                            ? 'border-navy-600 bg-navy-800 text-white'
                            : 'border-navy-200 text-navy-600 hover:border-navy-300'
                        }`}
                      >
                        <Icon size={15} />
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Description du bien</label>
                <input
                  type="text"
                  value={form.label}
                  onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder="Ex : Appartement Paris 15e"
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Valeur estimée (€)</label>
                <input
                  type="text"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="500 000"
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">Notes (optionnel)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Détails supplémentaires..."
                  rows={2}
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-navy-100">
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm font-medium text-navy-600 border border-navy-200 rounded-lg hover:bg-navy-50"
              >
                Annuler
              </button>
              <button
                onClick={saveAsset}
                disabled={submitting}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50"
              >
                {submitting ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                {editId ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
