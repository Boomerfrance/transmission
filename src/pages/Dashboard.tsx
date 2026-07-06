import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import {
  Users,
  Landmark,
  FileText,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { assets as assetsApi, canvas as canvasApi } from '../lib/api'

const steps = [
  {
    icon: Calculator,
    title: 'Simulation fiscale',
    desc: 'Estimez vos droits de succession',
    to: '/simulateur',
    key: 'simulator',
  },
  {
    icon: Landmark,
    title: 'Cartographie patrimoine',
    desc: 'Inventoriez vos biens et avoirs',
    to: '/patrimoine',
    key: 'patrimony',
  },
  {
    icon: Users,
    title: 'Canvas familial',
    desc: 'Alignez les souhaits de la famille',
    to: '/canvas-familial',
    key: 'canvas',
  },
  {
    icon: FileText,
    title: 'Dossier Notaire',
    desc: 'Préparez le dossier pour le notaire',
    to: '#',
    key: 'dossier',
  },
]

const statusConfig = {
  done: { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', label: 'Terminé' },
  current: { icon: Clock, color: 'text-navy-600', bg: 'bg-navy-100', label: 'En cours' },
  todo: { icon: AlertCircle, color: 'text-navy-300', bg: 'bg-navy-50', label: 'À faire' },
}

// Total number of canvas questions across all sections
const TOTAL_CANVAS_QUESTIONS = 15

export default function Dashboard() {
  const { user } = useAuth()
  const [assetCount, setAssetCount] = useState(0)
  const [canvasAnswered, setCanvasAnswered] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [assetList, canvasList] = await Promise.all([
          assetsApi.list().catch(() => []),
          canvasApi.list().catch(() => []),
        ])
        setAssetCount(assetList.length)
        setCanvasAnswered(canvasList.filter((a) => a.answer.trim().length > 0).length)
      } catch { /* ignore */ }
      setLoading(false)
    }
    load()
  }, [])

  // Compute step status dynamically
  const hasAssets = assetCount > 0
  const canvasDone = canvasAnswered >= TOTAL_CANVAS_QUESTIONS
  const canvasStarted = canvasAnswered > 0

  function getStatus(key: string): 'done' | 'current' | 'todo' {
    switch (key) {
      case 'simulator': return 'done' // always available
      case 'patrimony':
        return hasAssets ? 'done' : 'current'
      case 'canvas':
        if (canvasDone) return 'done'
        if (canvasStarted || hasAssets) return 'current'
        return 'todo'
      case 'dossier':
        return canvasDone && hasAssets ? 'current' : 'todo'
      default: return 'todo'
    }
  }

  const doneCount = steps.filter((s) => getStatus(s.key) === 'done').length
  const progress = Math.round((doneCount / steps.length) * 100)

  const firstName = user?.name?.split(' ')[0] || 'Bonjour'

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-2">
          Bonjour, {firstName} 👋
        </h1>
        <p className="text-navy-500">
          Voici l'avancement de la préparation de votre transmission patrimoniale.
        </p>
      </div>

      {/* Progress overview */}
      <div className="bg-gradient-to-r from-navy-800 to-navy-700 rounded-2xl p-6 sm:p-8 mb-8 text-white">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="text-navy-200 text-sm mb-1">Progression globale</div>
            <div className="text-3xl font-bold">{loading ? '…' : `${progress}%`}</div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-navy-600/50 text-sm">
            <Sparkles size={14} />
            {progress < 50 ? 'Phase 1 : Découverte' : progress < 100 ? 'Phase 2 : Préparation' : 'Phase 3 : Finalisation'}
          </div>
        </div>
        <div className="w-full bg-navy-600/50 rounded-full h-2.5">
          <div
            className="bg-gradient-to-r from-gold-400 to-gold-300 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-navy-300 mt-2">
          <span>Simulation</span>
          <span>Patrimoine</span>
          <span>Canvas</span>
          <span>Dossier</span>
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {steps.map(({ icon: Icon, title, desc, to, key }) => {
          const status = getStatus(key)
          const cfg = statusConfig[status]
          const StatusIcon = cfg.icon
          return (
            <Link
              key={key}
              to={to}
              className={`group p-5 rounded-xl border transition-all ${
                status === 'current'
                  ? 'border-navy-300 bg-white shadow-md shadow-navy-100/40 ring-1 ring-navy-200'
                  : 'border-navy-100 bg-white hover:border-navy-200 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${cfg.bg} ${cfg.color} flex items-center justify-center`}>
                  <Icon size={20} />
                </div>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${cfg.color}`}>
                  <StatusIcon size={13} />
                  {cfg.label}
                </div>
              </div>
              <h3 className="font-semibold text-navy-800 mb-1">{title}</h3>
              <p className="text-navy-500 text-sm mb-3">{desc}</p>
              {status === 'current' && (
                <div className="flex items-center gap-1 text-sm font-medium text-navy-600 group-hover:text-navy-800">
                  Continuer
                  <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-navy-100 p-4">
            <div className="text-xs text-navy-500 mb-1">Biens inventoriés</div>
            <div className="text-2xl font-bold text-navy-800">{assetCount}</div>
          </div>
          <div className="bg-white rounded-xl border border-navy-100 p-4">
            <div className="text-xs text-navy-500 mb-1">Questions canvas</div>
            <div className="text-2xl font-bold text-navy-800">{canvasAnswered} / {TOTAL_CANVAS_QUESTIONS}</div>
          </div>
        </div>
      )}

      {/* AI Assistant hint */}
      <div className="bg-gradient-to-r from-gold-50 to-amber-50/50 border border-gold-200/60 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gold-100 text-gold-600 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-medium text-navy-800 mb-1">Assistant IA disponible</h3>
            <p className="text-sm text-navy-600">
              Vous pouvez poser vos questions sur la transmission patrimoniale à notre assistant.
              Il vous guidera avec des informations générales adaptées à votre situation.
            </p>
            <button className="mt-3 text-sm font-medium text-gold-700 hover:text-gold-800 flex items-center gap-1">
              Poser une question
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
