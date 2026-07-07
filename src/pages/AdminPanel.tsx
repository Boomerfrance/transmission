import { useState, useEffect } from 'react'
import {
  Settings,
  Sparkles,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Thermometer,
  MessageSquareText,
  TestTube,
  Send,
  Loader2,
  Users,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  UserCog,
} from 'lucide-react'
import { admin as adminApi, chat as chatApi, type LlmConfig, type AdminUser } from '../lib/api'

const MODEL_OPTIONS = [
  { value: 'nvidia/nemotron-3-ultra-550b-a55b:free', label: 'Nemotron Ultra 550B', provider: 'NVIDIA (gratuit)', desc: 'Puissant et gratuit via OpenRouter' },
  { value: 'openai/gpt-4o', label: 'GPT-4o', provider: 'OpenAI', desc: 'Rapide et précis, bon rapport qualité/prix' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', desc: 'Économique, adapté aux tâches simples' },
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4', provider: 'Anthropic', desc: "Excellent pour l'analyse et le raisonnement" },
  { value: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku', provider: 'Anthropic', desc: 'Ultra-rapide, faible coût' },
  { value: 'google/gemini-2.5-pro-preview', label: 'Gemini 2.5 Pro', provider: 'Google', desc: 'Performant sur les longues conversations' },
]

const DEFAULT_SYSTEM_PROMPT = `Tu es l'assistant IA de Transmission, une plateforme de gouvernance familiale patrimoniale.

Ton rôle :
- Aider les familles à comprendre les enjeux de la transmission patrimoniale en France
- Fournir des informations générales sur la fiscalité successorale (abattements, barèmes, donations)
- Guider dans la préparation du dossier pour le notaire
- Faciliter le dialogue familial autour de la transmission

Règles importantes :
- Tu fournis de l'INFORMATION GÉNÉRALE, jamais du conseil juridique ou fiscal personnalisé
- Tu recommandes systématiquement de consulter un notaire ou un CGP pour toute décision
- Tu communiques en français, avec un ton professionnel mais accessible
- Tu es pédagogue : tu expliques les termes techniques simplement
- Tu restes neutre et ne prends jamais parti dans les conflits familiaux`

type Tab = 'llm' | 'users'

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('llm')

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
            Administration
          </h1>
          <p className="text-navy-500 text-sm">
            Configurez l'IA et gérez les utilisateurs de la plateforme.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-navy-50 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('llm')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'llm'
              ? 'bg-white text-navy-800 shadow-sm'
              : 'text-navy-500 hover:text-navy-700'
          }`}
        >
          <Sparkles size={16} />
          Configuration IA
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'users'
              ? 'bg-white text-navy-800 shadow-sm'
              : 'text-navy-500 hover:text-navy-700'
          }`}
        >
          <Users size={16} />
          Utilisateurs
        </button>
      </div>

      {activeTab === 'llm' ? <LlmConfigTab /> : <UsersTab />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// LLM Configuration Tab
// ═══════════════════════════════════════════════════════

function LlmConfigTab() {
  const [config, setConfig] = useState<LlmConfig>({
    model: 'nvidia/nemotron-3-ultra-550b-a55b:free',
    temperature: 0.3,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [testMessage, setTestMessage] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testModel, setTestModel] = useState('')
  const [testing, setTesting] = useState(false)
  const [testError, setTestError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const cfg = await adminApi.getLlmConfig()
        setConfig({
          model: cfg.model || 'nvidia/nemotron-3-ultra-550b-a55b:free',
          temperature: cfg.temperature ?? 0.3,
          systemPrompt: cfg.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        })
      } catch {
        // Use defaults
      }
      setLoading(false)
    }
    load()
  }, [])

  const selectedModel = MODEL_OPTIONS.find((m) => m.value === config.model)

  const handleSave = async () => {
    setSaving(true)
    setSaveError('')
    try {
      const result = await adminApi.setLlmConfig(config)
      if (result.config) {
        setConfig({
          model: result.config.model || config.model,
          temperature: result.config.temperature ?? config.temperature,
          systemPrompt: result.config.systemPrompt || config.systemPrompt,
        })
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur de sauvegarde.')
    }
    setSaving(false)
  }

  const handleTest = async () => {
    if (!testMessage.trim()) return
    setTesting(true)
    setTestError('')
    setTestResponse('')
    try {
      const result = await chatApi.send(testMessage)
      setTestResponse(result.reply)
      setTestModel(result.model || '')
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Erreur lors du test.")
    }
    setTesting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
        <span className="ml-2 text-navy-500">Chargement...</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main config */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-navy-100 bg-navy-50/30">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-navy-600" />
              <h2 className="font-semibold text-navy-800">Configuration de l'IA</h2>
            </div>
            <p className="text-xs text-navy-500 mt-1">
              3 paramètres pour ajuster le comportement de l'assistant
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Param 1: Model */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={16} className="text-navy-500" />
                <label className="text-sm font-semibold text-navy-700">1. Modèle LLM</label>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {MODEL_OPTIONS.map((model) => (
                  <button
                    key={model.value}
                    type="button"
                    onClick={() => setConfig((c) => ({ ...c, model: model.value }))}
                    className={`text-left p-3 rounded-xl border transition-all ${
                      config.model === model.value
                        ? 'border-navy-500 bg-navy-50 ring-1 ring-navy-200'
                        : 'border-navy-100 hover:border-navy-200 hover:bg-navy-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-navy-800 text-sm">{model.label}</span>
                        <span className="ml-2 text-xs text-navy-400">{model.provider}</span>
                      </div>
                      {config.model === model.value && <CheckCircle2 size={16} className="text-navy-600" />}
                    </div>
                    <p className="text-xs text-navy-500 mt-0.5">{model.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Param 2: Temperature */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Thermometer size={16} className="text-navy-500" />
                <label className="text-sm font-semibold text-navy-700">2. Température</label>
                <span className="ml-auto text-lg font-bold text-navy-800 tabular-nums">
                  {config.temperature.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig((c) => ({ ...c, temperature: parseFloat(e.target.value) }))}
                className="w-full h-2 bg-navy-100 rounded-full appearance-none cursor-pointer accent-navy-600"
              />
              <div className="flex justify-between text-xs text-navy-400 mt-1.5">
                <span>0.0 — Précis & déterministe</span>
                <span>1.0 — Créatif & varié</span>
              </div>
              <div className="mt-2 p-3 rounded-lg bg-navy-50 border border-navy-100">
                <p className="text-xs text-navy-600">
                  {config.temperature <= 0.3
                    ? '🎯 Réponses très précises et cohérentes. Recommandé pour les informations juridiques et fiscales.'
                    : config.temperature <= 0.6
                    ? '⚖️ Bon équilibre entre précision et naturel.'
                    : '🎨 Réponses plus variées et créatives. Peut être moins fiable sur les données factuelles.'}
                </p>
              </div>
            </div>

            {/* Param 3: System Prompt */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText size={16} className="text-navy-500" />
                  <label className="text-sm font-semibold text-navy-700">3. Instructions système</label>
                </div>
                <button
                  onClick={() => setConfig((c) => ({ ...c, systemPrompt: DEFAULT_SYSTEM_PROMPT }))}
                  className="flex items-center gap-1 text-xs text-navy-400 hover:text-navy-600 transition-colors"
                >
                  <RotateCcw size={12} />
                  Réinitialiser
                </button>
              </div>
              <textarea
                value={config.systemPrompt}
                onChange={(e) => setConfig((c) => ({ ...c, systemPrompt: e.target.value }))}
                rows={10}
                className="w-full px-4 py-3 border border-navy-200 rounded-xl text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 resize-y"
              />
            </div>
          </div>

          {/* Save bar */}
          <div className="px-6 py-4 bg-navy-50/30 border-t border-navy-100 flex items-center justify-between">
            <div>
              {saved && (
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle2 size={15} />
                  Configuration sauvegardée
                </div>
              )}
              {saveError && (
                <div className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertTriangle size={15} />
                  {saveError}
                </div>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {saving ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </div>
      </div>

      {/* Right column */}
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
          <h3 className="font-semibold text-navy-800 text-sm mb-3 flex items-center gap-2">
            <Settings size={15} />
            Configuration active
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Modèle</span>
              <span className="font-medium text-navy-800">{selectedModel?.label || config.model}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Provider</span>
              <span className="font-medium text-navy-800">{selectedModel?.provider || '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Température</span>
              <span className="font-medium text-navy-800">{config.temperature.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-navy-500">Prompt</span>
              <span className="font-medium text-navy-800">{config.systemPrompt.length} car.</span>
            </div>
          </div>
        </div>

        {/* Test zone */}
        <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-navy-100 flex items-center gap-2">
            <TestTube size={15} className="text-navy-500" />
            <h3 className="font-semibold text-navy-800 text-sm">Tester l'assistant</h3>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTest()}
                placeholder="Posez une question..."
                className="flex-1 px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400"
              />
              <button
                onClick={handleTest}
                disabled={testing}
                className="px-3 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50"
              >
                {testing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
            {testing && (
              <div className="flex items-center gap-2 text-sm text-navy-500">
                <Loader2 size={16} className="animate-spin" />
                Génération en cours...
              </div>
            )}
            {testError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{testError}</div>
            )}
            {testResponse && !testing && (
              <div>
                <div className="p-3 bg-navy-50 rounded-xl text-sm text-navy-700 leading-relaxed">{testResponse}</div>
                {testModel && <p className="text-xs text-navy-400 mt-1.5">Modèle : {testModel}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
// Users Management Tab
// ═══════════════════════════════════════════════════════

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.getUsers()
      setUsers(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.')
    }
    setLoading(false)
  }

  async function handleToggleRole(user: AdminUser) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    const confirmMsg = newRole === 'admin'
      ? `Promouvoir ${user.name} en administrateur ?`
      : `Retirer les droits admin de ${user.name} ?`
    if (!confirm(confirmMsg)) return

    setActionLoading(user.id)
    try {
      const updated = await adminApi.updateUser(user.id, { role: newRole })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)))
      setActionSuccess(user.id)
      setTimeout(() => setActionSuccess(null), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur.')
    }
    setActionLoading(null)
  }

  async function handleToggleBlock(user: AdminUser) {
    const newBlocked = !user.blocked
    const confirmMsg = newBlocked
      ? `Bloquer ${user.name} ? Il ne pourra plus se connecter.`
      : `Débloquer ${user.name} ?`
    if (!confirm(confirmMsg)) return

    setActionLoading(user.id)
    try {
      const updated = await adminApi.updateUser(user.id, { blocked: newBlocked })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, ...updated } : u)))
      setActionSuccess(user.id)
      setTimeout(() => setActionSuccess(null), 2000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur.')
    }
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
        <span className="ml-2 text-navy-500">Chargement des utilisateurs...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-700">
        <AlertTriangle size={20} className="inline mr-2" />
        {error}
      </div>
    )
  }

  const admins = users.filter((u) => u.role === 'admin')
  const regularUsers = users.filter((u) => u.role !== 'admin')

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-navy-100 flex items-center justify-center">
              <Users size={20} className="text-navy-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{users.length}</p>
              <p className="text-xs text-navy-500">Total utilisateurs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
              <Shield size={20} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{admins.length}</p>
              <p className="text-xs text-navy-500">Administrateurs</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
              <Ban size={20} className="text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{users.filter((u) => u.blocked).length}</p>
              <p className="text-xs text-navy-500">Bloqués</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-navy-100 bg-navy-50/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCog size={18} className="text-navy-600" />
            <h2 className="font-semibold text-navy-800">Gestion des utilisateurs</h2>
          </div>
          <button
            onClick={loadUsers}
            className="text-xs text-navy-500 hover:text-navy-700 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} />
            Actualiser
          </button>
        </div>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-navy-500 text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3 font-medium">Utilisateur</th>
                <th className="text-left px-6 py-3 font-medium">Email</th>
                <th className="text-center px-6 py-3 font-medium">Rôle</th>
                <th className="text-center px-6 py-3 font-medium">Statut</th>
                <th className="text-left px-6 py-3 font-medium">Inscrit le</th>
                <th className="text-right px-6 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b border-navy-50 hover:bg-navy-50/30 transition-colors ${
                    user.blocked ? 'opacity-60' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
                          user.role === 'admin'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-navy-100 text-navy-600'
                        }`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-navy-800">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-navy-500">{user.email}</td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-navy-100 text-navy-600'
                      }`}
                    >
                      {user.role === 'admin' ? <Shield size={12} /> : null}
                      {user.role === 'admin' ? 'Admin' : 'Utilisateur'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {user.blocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <Ban size={12} />
                        Bloqué
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle size={12} />
                        Actif
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-navy-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {actionLoading === user.id ? (
                        <Loader2 size={16} className="animate-spin text-navy-400" />
                      ) : actionSuccess === user.id ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleToggleRole(user)}
                            title={user.role === 'admin' ? 'Retirer admin' : 'Promouvoir admin'}
                            className={`p-2 rounded-lg border transition-all ${
                              user.role === 'admin'
                                ? 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                : 'border-navy-200 text-navy-500 hover:bg-navy-50'
                            }`}
                          >
                            {user.role === 'admin' ? <ShieldOff size={15} /> : <Shield size={15} />}
                          </button>
                          <button
                            onClick={() => handleToggleBlock(user)}
                            title={user.blocked ? 'Débloquer' : 'Bloquer'}
                            className={`p-2 rounded-lg border transition-all ${
                              user.blocked
                                ? 'border-green-200 text-green-600 hover:bg-green-50'
                                : 'border-red-200 text-red-500 hover:bg-red-50'
                            }`}
                          >
                            {user.blocked ? <CheckCircle size={15} /> : <Ban size={15} />}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-navy-50">
          {users.map((user) => (
            <div key={user.id} className={`p-4 ${user.blocked ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                      user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-navy-100 text-navy-600'
                    }`}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-navy-800">{user.name}</p>
                    <p className="text-xs text-navy-500">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-navy-100 text-navy-600'
                    }`}
                  >
                    {user.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                  {user.blocked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      Bloqué
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-navy-400">
                  Inscrit le{' '}
                  {new Date(user.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <div className="flex gap-2">
                  {actionLoading === user.id ? (
                    <Loader2 size={16} className="animate-spin text-navy-400" />
                  ) : actionSuccess === user.id ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggleRole(user)}
                        className={`p-2 rounded-lg border ${
                          user.role === 'admin'
                            ? 'border-amber-200 text-amber-600'
                            : 'border-navy-200 text-navy-500'
                        }`}
                      >
                        {user.role === 'admin' ? <ShieldOff size={14} /> : <Shield size={14} />}
                      </button>
                      <button
                        onClick={() => handleToggleBlock(user)}
                        className={`p-2 rounded-lg border ${
                          user.blocked
                            ? 'border-green-200 text-green-600'
                            : 'border-red-200 text-red-500'
                        }`}
                      >
                        {user.blocked ? <CheckCircle size={14} /> : <Ban size={14} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="bg-navy-50 border border-navy-100 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="text-navy-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-navy-600 space-y-1">
            <p><strong>Rôle Admin :</strong> Accès à cette page d'administration, configuration de l'IA et gestion des utilisateurs.</p>
            <p><strong>Bloquer :</strong> Empêche l'utilisateur de se connecter. Ses données sont conservées.</p>
            <p>Vous ne pouvez pas retirer vos propres droits admin ni vous bloquer vous-même.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
