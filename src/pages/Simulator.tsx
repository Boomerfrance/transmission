import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator, ArrowLeft, ArrowRight, Info, TrendingDown } from 'lucide-react'

type Relationship = 'enfant' | 'conjoint' | 'frere_soeur' | 'neveu_niece' | 'autre'

interface SimResult {
  abattement: number
  assietteTaxable: number
  droits: number
  tauxEffectif: number
}

const ABATTEMENTS: Record<Relationship, number> = {
  conjoint: 0, // exonéré
  enfant: 100_000,
  frere_soeur: 15_932,
  neveu_niece: 7_967,
  autre: 1_594,
}

const BAREME_LIGNE_DIRECTE = [
  { seuil: 8_072, taux: 0.05 },
  { seuil: 12_109, taux: 0.10 },
  { seuil: 15_932, taux: 0.15 },
  { seuil: 552_324, taux: 0.20 },
  { seuil: 902_838, taux: 0.30 },
  { seuil: 1_805_677, taux: 0.40 },
  { seuil: Infinity, taux: 0.45 },
]

function computeDroits(montant: number, relationship: Relationship): SimResult {
  if (relationship === 'conjoint') {
    return { abattement: montant, assietteTaxable: 0, droits: 0, tauxEffectif: 0 }
  }

  const abattement = ABATTEMENTS[relationship]
  const assietteTaxable = Math.max(0, montant - abattement)

  if (relationship === 'enfant') {
    let restant = assietteTaxable
    let droits = 0
    let prevSeuil = 0
    for (const { seuil, taux } of BAREME_LIGNE_DIRECTE) {
      const tranche = Math.min(restant, seuil - prevSeuil)
      if (tranche <= 0) break
      droits += tranche * taux
      restant -= tranche
      prevSeuil = seuil
    }
    return {
      abattement,
      assietteTaxable,
      droits: Math.round(droits),
      tauxEffectif: montant > 0 ? (droits / montant) * 100 : 0,
    }
  }

  // Simplified for other relationships
  const tauxForfaitaire =
    relationship === 'frere_soeur' ? 0.35
    : relationship === 'neveu_niece' ? 0.55
    : 0.60

  const droits = Math.round(assietteTaxable * tauxForfaitaire)
  return {
    abattement,
    assietteTaxable,
    droits,
    tauxEffectif: montant > 0 ? (droits / montant) * 100 : 0,
  }
}

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function Simulator() {
  const [montant, setMontant] = useState('')
  const [relationship, setRelationship] = useState<Relationship>('enfant')
  const [nbEnfants, setNbEnfants] = useState('2')
  const [result, setResult] = useState<SimResult | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const m = parseFloat(montant.replace(/\s/g, '')) || 0
    const n = parseInt(nbEnfants) || 1
    const partParEnfant = m / n
    setResult(computeDroits(partParEnfant, relationship))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50/50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-navy-100/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 transition-colors">
            <ArrowLeft size={15} />
            Retour
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy-100 text-navy-600 mb-4">
            <Calculator size={24} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-navy-900 mb-2">
            Simulateur de droits de succession
          </h1>
          <p className="text-navy-500">
            Estimez les droits de succession en fonction de votre situation familiale.
            Simulation indicative basée sur le barème fiscal 2026.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-navy-900/5 border border-navy-100/60 overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {/* Patrimoine */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">
                Patrimoine net à transmettre
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="500 000"
                  className="w-full pr-12 pl-4 py-3 border border-navy-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 font-medium">€</span>
              </div>
              <p className="text-xs text-navy-400 mt-1.5 flex items-center gap-1">
                <Info size={12} />
                Valeur nette après déduction des dettes (immobilier + financier + pro)
              </p>
            </div>

            {/* Relationship */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1.5">
                Lien de parenté avec l'héritier
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([
                  ['conjoint', 'Conjoint / PACS'],
                  ['enfant', 'Enfant'],
                  ['frere_soeur', 'Frère / Sœur'],
                  ['neveu_niece', 'Neveu / Nièce'],
                  ['autre', 'Autre'],
                ] as [Relationship, string][]).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRelationship(value)}
                    className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      relationship === value
                        ? 'border-navy-600 bg-navy-800 text-white shadow-sm'
                        : 'border-navy-200 text-navy-600 hover:border-navy-300 hover:bg-navy-50'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nb enfants */}
            {relationship === 'enfant' && (
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1.5">
                  Nombre d'enfants
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={nbEnfants}
                  onChange={(e) => setNbEnfants(e.target.value)}
                  className="w-24 px-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
                />
              </div>
            )}

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-navy-800 text-white py-3 rounded-lg font-medium hover:bg-navy-700 transition-colors group"
            >
              Calculer les droits
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </form>

          {/* Results */}
          {result && (
            <div className="border-t border-navy-100 bg-navy-50/40 p-6 sm:p-8">
              <h3 className="font-semibold text-navy-800 mb-4 flex items-center gap-2">
                <TrendingDown size={18} />
                Résultat de la simulation
                {relationship === 'enfant' && (
                  <span className="text-sm font-normal text-navy-500">(par enfant)</span>
                )}
              </h3>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-navy-100">
                  <div className="text-sm text-navy-500 mb-1">Abattement</div>
                  <div className="text-xl font-bold text-green-600">
                    {relationship === 'conjoint' ? 'Exonéré' : fmt(result.abattement)}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-navy-100">
                  <div className="text-sm text-navy-500 mb-1">Assiette taxable</div>
                  <div className="text-xl font-bold text-navy-800">{fmt(result.assietteTaxable)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-navy-100">
                  <div className="text-sm text-navy-500 mb-1">Droits estimés</div>
                  <div className="text-xl font-bold text-red-600">{fmt(result.droits)}</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-navy-100">
                  <div className="text-sm text-navy-500 mb-1">Taux effectif</div>
                  <div className="text-xl font-bold text-navy-800">{result.tauxEffectif.toFixed(1)}%</div>
                </div>
              </div>

              <div className="bg-gold-50 border border-gold-200/60 rounded-xl p-4 text-sm text-gold-800">
                <p className="font-medium mb-1">💡 Le saviez-vous ?</p>
                <p className="text-gold-700">
                  L'abattement de 100 000 € par enfant se renouvelle tous les 15 ans.
                  En anticipant avec des donations, vous pouvez réduire significativement les droits de succession.
                </p>
              </div>

              <p className="text-xs text-navy-400 mt-4">
                Simulation indicative basée sur le barème fiscal en vigueur. Ne constitue pas un conseil fiscal ou juridique.
                Consultez un notaire ou un conseiller en gestion de patrimoine pour une analyse personnalisée.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
