import { useState, useEffect, useCallback } from 'react'
import { Users, Plus, Edit3, Trash2, X, ChevronDown, ChevronRight, UserPlus } from 'lucide-react'
import { family as familyApi, type FamilyMember } from '../lib/api'

const RELATIONSHIPS = [
  { value: 'conjoint', label: 'Conjoint(e)' },
  { value: 'fils', label: 'Fils' },
  { value: 'fille', label: 'Fille' },
  { value: 'pere', label: 'Père' },
  { value: 'mere', label: 'Mère' },
  { value: 'frere', label: 'Frère' },
  { value: 'soeur', label: 'Sœur' },
  { value: 'petit-fils', label: 'Petit-fils' },
  { value: 'petite-fille', label: 'Petite-fille' },
  { value: 'oncle', label: 'Oncle' },
  { value: 'tante', label: 'Tante' },
  { value: 'neveu', label: 'Neveu' },
  { value: 'niece', label: 'Nièce' },
  { value: 'autre', label: 'Autre' },
]

const REL_COLORS: Record<string, string> = {
  conjoint: 'bg-rose-100 text-rose-700 border-rose-200',
  fils: 'bg-blue-100 text-blue-700 border-blue-200',
  fille: 'bg-purple-100 text-purple-700 border-purple-200',
  pere: 'bg-amber-100 text-amber-700 border-amber-200',
  mere: 'bg-amber-100 text-amber-700 border-amber-200',
  frere: 'bg-teal-100 text-teal-700 border-teal-200',
  soeur: 'bg-teal-100 text-teal-700 border-teal-200',
  'petit-fils': 'bg-indigo-100 text-indigo-700 border-indigo-200',
  'petite-fille': 'bg-indigo-100 text-indigo-700 border-indigo-200',
}

interface TreeNode extends FamilyMember {
  children: TreeNode[]
}

function buildTree(members: FamilyMember[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  // Create nodes
  members.forEach(m => nodeMap.set(m.id, { ...m, children: [] }))

  // Build hierarchy
  members.forEach(m => {
    const node = nodeMap.get(m.id)!
    if (m.parentId && nodeMap.has(m.parentId)) {
      nodeMap.get(m.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function TreeNodeCard({ node, members, onEdit, onDelete, onAddChild, depth = 0 }: {
  node: TreeNode
  members: FamilyMember[]
  onEdit: (m: FamilyMember) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  depth?: number
}) {
  const [expanded, setExpanded] = useState(true)
  const relLabel = RELATIONSHIPS.find(r => r.value === node.relationship)?.label || node.relationship
  const colorClass = REL_COLORS[node.relationship] || 'bg-gray-100 text-gray-700 border-gray-200'

  return (
    <div className={depth > 0 ? 'ml-6 border-l-2 border-navy-100 pl-4' : ''}>
      <div className="group flex items-start gap-3 py-2">
        {node.children.length > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="mt-1.5 text-navy-400 hover:text-navy-600">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
        )}
        {node.children.length === 0 && <div className="w-4" />}

        <div className="flex-1 bg-white rounded-xl border border-navy-100 p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-700 to-navy-500 flex items-center justify-center shadow-sm">
                <span className="text-white font-semibold text-sm">
                  {node.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </span>
              </div>
              <div>
                <h3 className="font-semibold text-navy-800 text-lg">{node.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
                    {relLabel}
                  </span>
                  {node.birthYear && (
                    <span className="text-xs text-navy-400">né(e) en {node.birthYear}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onAddChild(node.id)}
                title="Ajouter un enfant"
                className="p-1.5 text-navy-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              >
                <UserPlus size={16} />
              </button>
              <button
                onClick={() => onEdit(node)}
                className="p-1.5 text-navy-400 hover:text-navy-600 hover:bg-navy-50 rounded-lg transition-colors"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => onDelete(node.id)}
                className="p-1.5 text-navy-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {node.notes && (
            <p className="text-sm text-navy-500 mt-2 pl-13">{node.notes}</p>
          )}
        </div>
      </div>

      {expanded && node.children.length > 0 && (
        <div className="space-y-1">
          {node.children.map(child => (
            <TreeNodeCard
              key={child.id}
              node={child}
              members={members}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function FamilyTree() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<FamilyMember | null>(null)
  const [formParentId, setFormParentId] = useState<string | undefined>()
  const [form, setForm] = useState({ name: '', relationship: 'fils', birthYear: '', notes: '', parentId: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await familyApi.listMembers()
      setMembers(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openAdd = (parentId?: string) => {
    setEditing(null)
    setForm({ name: '', relationship: 'fils', birthYear: '', notes: '', parentId: parentId || '' })
    setFormParentId(parentId)
    setShowForm(true)
  }

  const openEdit = (m: FamilyMember) => {
    setEditing(m)
    setForm({
      name: m.name,
      relationship: m.relationship,
      birthYear: m.birthYear?.toString() || '',
      notes: m.notes || '',
      parentId: m.parentId || '',
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = {
        name: form.name,
        relationship: form.relationship,
        birthYear: form.birthYear ? parseInt(form.birthYear) : undefined,
        notes: form.notes || undefined,
        parentId: form.parentId || undefined,
      }

      if (editing) {
        await familyApi.updateMember({ id: editing.id, ...data })
      } else {
        await familyApi.addMember(data)
      }
      setShowForm(false)
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce membre ?')) return
    try {
      await familyApi.deleteMember(id)
      await load()
    } catch (err) {
      console.error(err)
    }
  }

  const tree = buildTree(members)

  // Stats
  const generations = new Set<string>()
  members.forEach(m => {
    if (['pere', 'mere'].includes(m.relationship)) generations.add('parents')
    else if (['conjoint'].includes(m.relationship)) generations.add('self')
    else if (['fils', 'fille'].includes(m.relationship)) generations.add('children')
    else if (['petit-fils', 'petite-fille'].includes(m.relationship)) generations.add('grandchildren')
    else generations.add('other')
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-navy-800 flex items-center gap-3">
            <Users className="text-gold-500" size={28} />
            Arbre Familial
          </h1>
          <p className="text-navy-500 mt-1">Visualisez et gérez les membres de votre famille</p>
        </div>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-2 bg-navy-800 text-white px-4 py-2.5 rounded-xl hover:bg-navy-700 transition-colors shadow-sm text-sm font-medium"
        >
          <Plus size={18} />
          Ajouter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-navy-100 p-4 text-center">
          <div className="text-2xl font-bold text-navy-800">{members.length}</div>
          <div className="text-sm text-navy-500">Membres</div>
        </div>
        <div className="bg-white rounded-xl border border-navy-100 p-4 text-center">
          <div className="text-2xl font-bold text-navy-800">{generations.size}</div>
          <div className="text-sm text-navy-500">Générations</div>
        </div>
        <div className="bg-white rounded-xl border border-navy-100 p-4 text-center">
          <div className="text-2xl font-bold text-navy-800">{members.filter(m => ['fils', 'fille'].includes(m.relationship)).length}</div>
          <div className="text-sm text-navy-500">Enfants</div>
        </div>
        <div className="bg-white rounded-xl border border-navy-100 p-4 text-center">
          <div className="text-2xl font-bold text-navy-800">{members.filter(m => ['petit-fils', 'petite-fille'].includes(m.relationship)).length}</div>
          <div className="text-sm text-navy-500">Petits-enfants</div>
        </div>
      </div>

      {/* Tree */}
      {loading ? (
        <div className="text-center py-12 text-navy-400">Chargement...</div>
      ) : members.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100 p-12 text-center">
          <Users className="mx-auto text-navy-200 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-navy-800 mb-2">Aucun membre ajouté</h3>
          <p className="text-navy-500 mb-6">Commencez par ajouter les membres de votre famille pour construire votre arbre.</p>
          <button
            onClick={() => openAdd()}
            className="bg-navy-800 text-white px-6 py-2.5 rounded-xl hover:bg-navy-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} className="inline mr-2" />
            Ajouter le premier membre
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100 p-6">
          <div className="space-y-1">
            {tree.map(node => (
              <TreeNodeCard
                key={node.id}
                node={node}
                members={members}
                onEdit={openEdit}
                onDelete={handleDelete}
                onAddChild={(parentId) => openAdd(parentId)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-navy-100">
              <h2 className="text-lg font-semibold text-navy-800">
                {editing ? 'Modifier le membre' : 'Ajouter un membre'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-navy-400 hover:text-navy-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Nom complet *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-xl focus:ring-2 focus:ring-navy-300 focus:border-navy-400 outline-none text-navy-800"
                  placeholder="Prénom Nom"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Lien de parenté *</label>
                <select
                  value={form.relationship}
                  onChange={e => setForm({ ...form, relationship: e.target.value })}
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-xl focus:ring-2 focus:ring-navy-300 focus:border-navy-400 outline-none text-navy-800"
                >
                  {RELATIONSHIPS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Année de naissance</label>
                <input
                  type="number"
                  value={form.birthYear}
                  onChange={e => setForm({ ...form, birthYear: e.target.value })}
                  min="1900"
                  max="2030"
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-xl focus:ring-2 focus:ring-navy-300 focus:border-navy-400 outline-none text-navy-800"
                  placeholder="1965"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Rattaché à</label>
                <select
                  value={form.parentId}
                  onChange={e => setForm({ ...form, parentId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-xl focus:ring-2 focus:ring-navy-300 focus:border-navy-400 outline-none text-navy-800"
                >
                  <option value="">— Racine de l'arbre —</option>
                  {members.filter(m => m.id !== editing?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({RELATIONSHIPS.find(r => r.value === m.relationship)?.label})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-xl focus:ring-2 focus:ring-navy-300 focus:border-navy-400 outline-none text-navy-800 resize-none"
                  placeholder="Informations complémentaires..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-navy-200 rounded-xl text-navy-600 hover:bg-navy-50 transition-colors text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-navy-800 text-white rounded-xl hover:bg-navy-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Enregistrement...' : (editing ? 'Modifier' : 'Ajouter')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
