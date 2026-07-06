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
} from 'lucide-react'
import { admin as adminApi, chat as chatApi, type LlmConfig } from '../lib/api'

const MODEL_OPTIONS = [
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', desc: 'Rapide et précis, bon rapport qualité/prix' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', desc: 'Économique, adapté aux tâches simples' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', provider: 'Anthropic', desc: "Excellent pour l'analyse et le raisonnement" },
  { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', provider: 'Anthropic', desc: 'Ultra-rapide, faible coût' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'Google', desc: 'Performant sur les longues conversations' },
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

export default function AdminPanel() {
  const [config, setConfig] = useState<LlmConfig>({
    model: 'gpt-4o',
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

  // Load config on mount
  useEffect(() => {
    async function load() {
      try {
        const cfg = await adminApi.getLlmConfig()
        setConfig({
          model: cfg.model || 'gpt-4o',
          temperature: cfg.temperature ?? 0.3,
          systemPrompt: cfg.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        })
      } catch {
        // Use defaults if no config saved yet
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
      setTestError(err instanceof Error ? err.message : "Erreur lors du test. Vérifiez la clé API OpenRouter.")
    }
    setTesting(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
        <span className="ml-2 text-navy-500">Chargement de la configuration...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
            Administration
          </h1>
          <p className="text-navy-500 text-sm">
            Configurez les paramètres de l'assistant IA et de la plateforme.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main config — left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* LLM Configuration card */}
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
                  <label className="text-sm font-semibold text-navy-700">
                    1. Modèle LLM
                  </label>
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
                        {config.model === model.value && (
                          <CheckCircle2 size={16} className="text-navy-600" />
                        )}
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
                  <label className="text-sm font-semibold text-navy-700">
                    2. Température
                  </label>
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
                      ? '⚖️ Bon équilibre entre précision et naturel. Adapté à la plupart des conversations.'
                      : '🎨 Réponses plus variées et créatives. Peut être moins fiable sur les données factuelles.'}
                  </p>
                </div>
              </div>

              {/* Param 3: System Prompt */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareText size={16} className="text-navy-500" />
                    <label className="text-sm font-semibold text-navy-700">
                      3. Instructions système (System Prompt)
                    </label>
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
                <p className="text-xs text-navy-400 mt-1.5">
                  Ce texte définit la personnalité et les règles de l'assistant. Modifiez avec précaution.
                </p>
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

        {/* Right column — Test & info */}
        <div className="space-y-6">
          {/* Current config summary */}
          <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-5">
            <h3 className="font-semibold text-navy-800 text-sm mb-3 flex items-center gap-2">
              <Settings size={15} />
              Configuration active
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-navy-500">Modèle</span>
                <span className="font-medium text-navy-800">{selectedModel?.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-navy-500">Provider</span>
                <span className="font-medium text-navy-800">{selectedModel?.provider}</span>
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {testError}
                </div>
              )}

              {testResponse && !testing && (
                <div>
                  <div className="p-3 bg-navy-50 rounded-xl text-sm text-navy-700 leading-relaxed">
                    {testResponse}
                  </div>
                  {testModel && (
                    <p className="text-xs text-navy-400 mt-1.5">Modèle : {testModel}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">Attention</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Les modifications du système prompt affectent immédiatement les réponses de l'assistant.
                  Testez avant de déployer en production.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
