import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Landmark,
  Calculator,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react'

interface Step {
  icon: React.ElementType
  title: string
  description: string
  cta: string
  route: string
  color: string
}

const steps: Step[] = [
  {
    icon: Users,
    title: 'Créez votre arbre familial',
    description:
      'Ajoutez les membres de votre famille : conjoint, enfants, petits-enfants… Ces informations servent à personnaliser vos simulations et votre dossier notaire.',
    cta: 'Ajouter ma famille',
    route: '/arbre-familial',
    color: 'text-blue-500',
  },
  {
    icon: Landmark,
    title: 'Inventoriez votre patrimoine',
    description:
      'Déclarez vos biens (immobilier, financier, professionnel) et vos dettes. Le patrimoine net est la base de tout calcul de droits de succession ou de donation.',
    cta: 'Déclarer mes biens',
    route: '/patrimoine',
    color: 'text-emerald-500',
  },
  {
    icon: Calculator,
    title: 'Lancez une simulation',
    description:
      'Comparez succession et donation anticipée. Le simulateur utilise les barèmes fiscaux officiels et vos données familiales pour estimer les droits.',
    cta: 'Simuler maintenant',
    route: '/simulateur',
    color: 'text-amber-500',
  },
]

export default function OnboardingWizard({ onDismiss }: { onDismiss: () => void }) {
  const [current, setCurrent] = useState(0)
  const navigate = useNavigate()
  const step = steps[current]
  const Icon = step.icon

  return (
    <div className="bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl p-6 sm:p-8 text-white mb-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gold-400/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      {/* Close button */}
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 text-navy-400 hover:text-white transition-colors"
        title="Fermer"
      >
        <X size={16} />
      </button>

      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <Sparkles size={16} className="text-gold-400" />
          <span className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
            Bienvenue — Étape {current + 1}/{steps.length}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-2 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all ${
                i <= current ? 'bg-gold-400' : 'bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className={`w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 ${step.color}`}>
            <Icon size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-2">{step.title}</h2>
            <p className="text-sm text-navy-200 leading-relaxed mb-5">{step.description}</p>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  onDismiss()
                  navigate(step.route)
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold-400 text-navy-900 rounded-lg font-semibold text-sm hover:bg-gold-300 transition-colors"
              >
                {step.cta}
                <ArrowRight size={15} />
              </button>

              <div className="flex items-center gap-2">
                {current > 0 && (
                  <button
                    onClick={() => setCurrent((c) => c - 1)}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-navy-300 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={14} />
                    Précédent
                  </button>
                )}
                {current < steps.length - 1 ? (
                  <button
                    onClick={() => setCurrent((c) => c + 1)}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-navy-300 hover:text-white transition-colors"
                  >
                    Passer
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <button
                    onClick={onDismiss}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-navy-300 hover:text-white transition-colors"
                  >
                    <CheckCircle2 size={14} />
                    Terminer
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
