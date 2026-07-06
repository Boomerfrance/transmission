import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  Heart,
  Home,
  Shield,
  MessageSquare,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Save,
  Loader2,
} from 'lucide-react'
import { canvas as canvasApi, type CanvasAnswer } from '../lib/api'

interface Section {
  id: string
  icon: React.ElementType
  title: string
  subtitle: string
  questions: {
    id: string
    label: string
    type: 'text' | 'textarea' | 'select' | 'scale'
    options?: string[]
    placeholder?: string
  }[]
}

const sections: Section[] = [
  {
    id: 'values',
    icon: Heart,
    title: 'Valeurs familiales',
    subtitle: 'Ce qui compte le plus pour votre famille',
    questions: [
      {
        id: 'core_values',
        label: 'Quelles sont les 3 valeurs les plus importantes de votre famille ?',
        type: 'textarea',
        placeholder: 'Ex : solidarité, éducation, prudence financière...',
      },
      {
        id: 'transmission_goal',
        label: "Quel est l'objectif principal de votre transmission ?",
        type: 'select',
        options: [
          'Équité entre les héritiers',
          'Protection du conjoint',
          'Préservation du patrimoine familial',
          'Soutien aux projets des enfants',
          'Optimisation fiscale',
          'Autre',
        ],
      },
      {
        id: 'family_story',
        label: "Y a-t-il une histoire familiale à préserver dans la transmission ?",
        type: 'textarea',
        placeholder: 'Maison de famille, entreprise familiale, tradition...',
      },
    ],
  },
  {
    id: 'family',
    icon: Users,
    title: 'Structure familiale',
    subtitle: 'Les personnes concernées par la transmission',
    questions: [
      {
        id: 'family_situation',
        label: 'Situation matrimoniale',
        type: 'select',
        options: ['Marié(e) — Communauté réduite aux acquêts', 'Marié(e) — Séparation de biens', 'Marié(e) — Communauté universelle', 'Pacsé(e)', 'Concubin(e)', 'Célibataire', 'Veuf/Veuve', 'Divorcé(e)'],
      },
      {
        id: 'children_desc',
        label: 'Décrivez brièvement vos enfants (âge, situation)',
        type: 'textarea',
        placeholder: 'Ex : 2 enfants — Marie (32 ans, mariée, 2 enfants) et Paul (28 ans, célibataire)',
      },
      {
        id: 'special_situations',
        label: 'Situations particulières à prendre en compte ?',
        type: 'textarea',
        placeholder: "Enfant handicapé, enfant d'un autre lit, enfant à l'étranger...",
      },
    ],
  },
  {
    id: 'housing',
    icon: Home,
    title: 'Résidence & biens clés',
    subtitle: 'Les biens importants de votre patrimoine',
    questions: [
      {
        id: 'main_residence',
        label: 'Souhaitez-vous que le conjoint puisse rester dans la résidence principale ?',
        type: 'select',
        options: ["Oui, c'est prioritaire", 'Oui, si possible', "Ce n'est pas une préoccupation", 'Non applicable'],
      },
      {
        id: 'key_assets',
        label: 'Quels biens ont une importance particulière (affective ou financière) ?',
        type: 'textarea',
        placeholder: "Maison de famille, portefeuille d'investissement, entreprise...",
      },
      {
        id: 'asset_wishes',
        label: 'Avez-vous des souhaits spécifiques pour certains biens ?',
        type: 'textarea',
        placeholder: 'Ex : La maison de Bretagne doit rester dans la famille...',
      },
    ],
  },
  {
    id: 'protection',
    icon: Shield,
    title: 'Protection & anticipation',
    subtitle: 'Protéger vos proches et anticiper',
    questions: [
      {
        id: 'protection_priority',
        label: 'Qui souhaitez-vous protéger en priorité ?',
        type: 'select',
        options: ['Le conjoint', 'Les enfants à parts égales', 'Un enfant en particulier', 'Les petits-enfants', 'Autre'],
      },
      {
        id: 'existing_donations',
        label: 'Avez-vous déjà réalisé des donations ?',
        type: 'select',
        options: ['Non, aucune', 'Oui, des donations simples', 'Oui, une donation-partage', "Oui, des donations avec réserve d'usufruit", 'Je ne suis pas sûr(e)'],
      },
      {
        id: 'concerns',
        label: 'Quelles sont vos principales inquiétudes concernant la transmission ?',
        type: 'textarea',
        placeholder: 'Conflits entre héritiers, fiscalité, complexité administrative...',
      },
    ],
  },
  {
    id: 'communication',
    icon: MessageSquare,
    title: 'Communication familiale',
    subtitle: 'Le dialogue autour de la transmission',
    questions: [
      {
        id: 'family_discussion',
        label: 'Avez-vous déjà abordé la transmission en famille ?',
        type: 'select',
        options: ['Oui, ouvertement', 'Partiellement, sans entrer dans les détails', "Non, c'est un sujet tabou", 'Non, mais nous souhaitons le faire'],
      },
      {
        id: 'alignment_level',
        label: 'Sur une échelle de 1 à 10, à quel point votre famille est-elle alignée sur la transmission ?',
        type: 'scale',
      },
      {
        id: 'additional_notes',
        label: 'Commentaires ou précisions supplémentaires',
        type: 'textarea',
        placeholder: 'Tout ce qui pourrait être utile pour préparer votre dossier...',
      },
    ],
  },
]

export default function FamilyCanvas() {
  const [currentSection, setCurrentSection] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveQueue, setSaveQueue] = useState<{ sectionId: string; questionId: string; answer: string }[]>([])

  const section = sections[currentSection]

  // Load saved answers on mount
  useEffect(() => {
    async function load() {
      try {
        const saved = await canvasApi.list()
        const map: Record<string, string> = {}
        saved.forEach((a: CanvasAnswer) => {
          map[a.questionId] = a.answer
        })
        setAnswers(map)
      } catch {
        // Start fresh if API fails
      }
      setLoading(false)
    }
    load()
  }, [])

  // Flush save queue
  useEffect(() => {
    if (saveQueue.length === 0) return
    let cancelled = false

    async function flush() {
      setSaving(true)
      const batch = [...saveQueue]
      setSaveQueue([])

      for (const item of batch) {
        if (cancelled) break
        try {
          await canvasApi.save(item)
        } catch (err) {
          console.error('Save error:', err)
        }
      }

      if (!cancelled) {
        setSaving(false)
        setLastSaved(new Date())
      }
    }

    const timer = setTimeout(flush, 800) // debounce 800ms
    return () => { cancelled = true; clearTimeout(timer) }
  }, [saveQueue])

  const updateAnswer = useCallback((qId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: value }))
    // Find which section this question belongs to
    const sec = sections.find((s) => s.questions.some((q) => q.id === qId))
    if (sec) {
      setSaveQueue((prev) => {
        // Replace any pending save for this question
        const filtered = prev.filter((p) => p.questionId !== qId)
        return [...filtered, { sectionId: sec.id, questionId: qId, answer: value }]
      })
    }
  }, [])

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      // Save all current answers
      for (const sec of sections) {
        for (const q of sec.questions) {
          const val = answers[q.id]
          if (val && val.trim()) {
            await canvasApi.save({ sectionId: sec.id, questionId: q.id, answer: val })
          }
        }
      }
      setLastSaved(new Date())
    } catch (err) {
      console.error('Save all error:', err)
    }
    setSaving(false)
  }

  // Count answered questions
  const answeredCount = Object.values(answers).filter((v) => v && v.trim().length > 0).length
  const totalQuestions = sections.reduce((n, s) => n + s.questions.length, 0)
  const progress = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-navy-400" />
        <span className="ml-2 text-navy-500">Chargement du canvas...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
            Canvas Familial
          </h1>
          <p className="text-navy-500 text-sm">
            Répondez aux questions pour construire votre dossier de préparation à la transmission.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-navy-600 border border-navy-200 rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Sauvegarde...' : 'Tout sauvegarder'}
        </button>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-navy-600">
            Section {currentSection + 1} / {sections.length}
          </span>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 size={12} />
                Sauvegardé
              </span>
            )}
            <span className="text-sm text-navy-400">{answeredCount}/{totalQuestions} réponses — {Math.round(progress)}%</span>
          </div>
        </div>
        <div className="w-full bg-navy-100 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-navy-600 to-navy-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
          {sections.map((s, i) => {
            const Icon = s.icon
            const active = i === currentSection
            const sectionAnswered = s.questions.every((q) => answers[q.id]?.trim())
            return (
              <button
                key={s.id}
                onClick={() => setCurrentSection(i)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'bg-navy-800 text-white'
                    : sectionAnswered
                    ? 'bg-green-50 text-green-700'
                    : 'bg-navy-50 text-navy-500 hover:bg-navy-100'
                }`}
              >
                {sectionAnswered ? <CheckCircle2 size={13} /> : <Icon size={13} />}
                {s.title}
              </button>
            )
          })}
        </div>
      </div>

      {/* Section content */}
      <div className="bg-white rounded-2xl shadow-sm border border-navy-100/60 p-6 sm:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-navy-100 text-navy-600 flex items-center justify-center">
            <section.icon size={20} />
          </div>
          <div>
            <h2 className="font-semibold text-navy-800 text-lg">{section.title}</h2>
            <p className="text-sm text-navy-500">{section.subtitle}</p>
          </div>
        </div>

        <div className="space-y-6">
          {section.questions.map((q) => (
            <div key={q.id}>
              <label className="block text-sm font-medium text-navy-700 mb-2">{q.label}</label>
              {q.type === 'textarea' && (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors resize-none"
                />
              )}
              {q.type === 'text' && (
                <input
                  type="text"
                  value={answers[q.id] || ''}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                  placeholder={q.placeholder}
                  className="w-full px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
                />
              )}
              {q.type === 'select' && q.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => updateAnswer(q.id, opt)}
                      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-all ${
                        answers[q.id] === opt
                          ? 'border-navy-600 bg-navy-800 text-white'
                          : 'border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
              {q.type === 'scale' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateAnswer(q.id, String(n))}
                      className={`w-10 h-10 rounded-lg border text-sm font-medium transition-all ${
                        answers[q.id] === String(n)
                          ? 'border-navy-600 bg-navy-800 text-white'
                          : 'border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
          disabled={currentSection === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-navy-600 border border-navy-200 rounded-lg hover:bg-navy-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={15} />
          Précédent
        </button>
        <button
          onClick={() => {
            if (currentSection < sections.length - 1) {
              setCurrentSection(currentSection + 1)
            } else {
              handleSaveAll()
            }
          }}
          className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            currentSection === sections.length - 1
              ? 'bg-green-600 text-white hover:bg-green-500'
              : 'bg-navy-800 text-white hover:bg-navy-700'
          }`}
        >
          {currentSection === sections.length - 1 ? (
            <>
              <CheckCircle2 size={15} />
              Terminer le canvas
            </>
          ) : (
            <>
              Suivant
              <ChevronRight size={15} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
