import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  ArrowLeft,
  ArrowRight,
  Info,
  TrendingDown,
  Users,
  Plus,
  Trash2,
  Heart,
  Baby,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from 'lucide-react'

/* ───────────── TYPES ───────────── */

type HeirType = 'conjoint' | 'enfant' | 'frere_soeur' | 'neveu_niece' | 'autre'
type ConjointOption = 'pleine_propriete' | 'usufruit'

interface OtherHeir {
  id: string
  type: HeirType
  count: number
}

interface HeirResult {
  label: string
  type: HeirType
  part: number
  abattement: number
  assietteTaxable: number
  droits: number
  tauxEffectif: number
  count: number
  droitsTotal: number
}

/* ───────────── TAX CONSTANTS (2026) ───────────── */

const ABATTEMENTS: Record<HeirType, number> = {
  conjoint: 0,
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

const BAREME_FRERE_SOEUR = [
  { seuil: 24_430, taux: 0.35 },
  { seuil: Infinity, taux: 0.45 },
]

const USUFRUIT_BY_AGE: [number, number][] = [
  [20, 0.90],
  [30, 0.80],
  [40, 0.70],
  [50, 0.60],
  [60, 0.50],
  [70, 0.40],
  [80, 0.30],
  [90, 0.20],
  [Infinity, 0.10],
]

const HEIR_LABELS: Record<HeirType, string> = {
  conjoint: 'Conjoint / Partenaire PACS',
  enfant: 'Enfant',
  frere_soeur: 'Frère / Sœur',
  neveu_niece: 'Neveu / Nièce',
  autre: 'Autre personne',
}

const OTHER_HEIR_OPTIONS: { value: HeirType; label: string }[] = [
  { value: 'frere_soeur', label: 'Frère / Sœur' },
  { value: 'neveu_niece', label: 'Neveu / Nièce' },
  { value: 'autre', label: 'Autre personne' },
]

/* ───────────── COMPUTE HELPERS ───────────── */

function applyBareme(assiette: number, bareme: { seuil: number; taux: number }[]): number {
  let restant = assiette
  let droits = 0
  let prevSeuil = 0
  for (const { seuil, taux } of bareme) {
    const tranche = Math.min(restant, seuil - prevSeuil)
    if (tranche <= 0) break
    droits += tranche * taux
    restant -= tranche
    prevSeuil = seuil
  }
  return Math.round(droits)
}

function computeHeirTax(partBrute: number, type: HeirType): { abattement: number; assietteTaxable: number; droits: number; tauxEffectif: number } {
  if (type === 'conjoint') {
    return { abattement: partBrute, assietteTaxable: 0, droits: 0, tauxEffectif: 0 }
  }

  const abattement = ABATTEMENTS[type]
  const assietteTaxable = Math.max(0, partBrute - abattement)

  let droits: number
  if (type === 'enfant') {
    droits = applyBareme(assietteTaxable, BAREME_LIGNE_DIRECTE)
  } else if (type === 'frere_soeur') {
    droits = applyBareme(assietteTaxable, BAREME_FRERE_SOEUR)
  } else if (type === 'neveu_niece') {
    droits = Math.round(assietteTaxable * 0.55)
  } else {
    droits = Math.round(assietteTaxable * 0.60)
  }

  return {
    abattement,
    assietteTaxable,
    droits,
    tauxEffectif: partBrute > 0 ? (droits / partBrute) * 100 : 0,
  }
}

function getUsufruitRate(age: number): number {
  for (const [maxAge, rate] of USUFRUIT_BY_AGE) {
    if (age <= maxAge) return rate
  }
  return 0.10
}

/* ───────────── FORMAT HELPERS ───────────── */

function fmt(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function fmtPct(n: number): string {
  return n.toFixed(1) + ' %'
}

function parseMontant(raw: string): number {
  return parseFloat(raw.replace(/[\s€,]/g, '').replace(',', '.')) || 0
}

/* ───────────── COMPONENT ───────────── */

export default function Simulator() {
  // ── State ──
  const [montantRaw, setMontantRaw] = useState('')
  const [hasConjoint, setHasConjoint] = useState(false)
  const [nbEnfants, setNbEnfants] = useState(0)
  const [conjointOption, setConjointOption] = useState<ConjointOption>('pleine_propriete')
  const [conjointAge, setConjointAge] = useState(65)
  const [otherHeirs, setOtherHeirs] = useState<OtherHeir[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [computed, setComputed] = useState(false)

  const montant = parseMontant(montantRaw)

  // ── Add / remove other heirs ──
  function addOtherHeir() {
    setOtherHeirs(prev => [
      ...prev,
      { id: crypto.randomUUID(), type: 'frere_soeur', count: 1 },
    ])
  }

  function removeOtherHeir(id: string) {
    setOtherHeirs(prev => prev.filter(h => h.id !== id))
  }

  function updateOtherHeir(id: string, field: 'type' | 'count', value: string | number) {
    setOtherHeirs(prev =>
      prev.map(h => (h.id === id ? { ...h, [field]: value } : h))
    )
  }

  // ── Compute results ──
  const results = useMemo<HeirResult[]>(() => {
    if (!computed || montant <= 0) return []

    const totalHeirs = (hasConjoint ? 1 : 0) + nbEnfants + otherHeirs.reduce((s, h) => s + h.count, 0)
    if (totalHeirs === 0) return []

    const heirResults: HeirResult[] = []

    // Determine shares
    let conjointShare = 0
    let childrenTotalShare = 0
    let othersPool = 0

    const hasChildren = nbEnfants > 0
    const totalOthers = otherHeirs.reduce((s, h) => s + h.count, 0)

    if (hasConjoint && hasChildren) {
      // Conjoint + enfants
      if (conjointOption === 'pleine_propriete') {
        conjointShare = montant * 0.25
        childrenTotalShare = montant * 0.75
      } else {
        // Usufruit option — conjoint gets usufruit (exempt anyway)
        // Children get nue-propriété = total - usufruit value
        const usufruitRate = getUsufruitRate(conjointAge)
        conjointShare = montant * usufruitRate
        childrenTotalShare = montant * (1 - usufruitRate)
      }
      // Other heirs get nothing by default in legal succession with children
      othersPool = 0
    } else if (hasConjoint && !hasChildren && totalOthers > 0) {
      // Conjoint + pas d'enfants + autres héritiers
      conjointShare = montant * 0.50
      othersPool = montant * 0.50
    } else if (hasConjoint && !hasChildren && totalOthers === 0) {
      // Conjoint seul
      conjointShare = montant
    } else if (!hasConjoint && hasChildren) {
      // Enfants seuls
      childrenTotalShare = montant
      // Others get nothing by default with children
      othersPool = 0
    } else if (!hasConjoint && !hasChildren) {
      // Pas de conjoint, pas d'enfants — tout aux autres
      othersPool = montant
    }

    // Conjoint
    if (hasConjoint) {
      const tax = computeHeirTax(conjointShare, 'conjoint')
      heirResults.push({
        label: 'Conjoint / PACS',
        type: 'conjoint',
        part: conjointShare,
        count: 1,
        ...tax,
        droitsTotal: tax.droits,
      })
    }

    // Enfants
    if (nbEnfants > 0 && childrenTotalShare > 0) {
      const partParEnfant = childrenTotalShare / nbEnfants
      const tax = computeHeirTax(partParEnfant, 'enfant')
      heirResults.push({
        label: nbEnfants === 1 ? 'Enfant' : `Enfants (×${nbEnfants})`,
        type: 'enfant',
        part: partParEnfant,
        count: nbEnfants,
        ...tax,
        droitsTotal: tax.droits * nbEnfants,
      })
    }

    // Other heirs
    if (totalOthers > 0 && othersPool > 0) {
      const partParAutre = othersPool / totalOthers
      for (const heir of otherHeirs) {
        if (heir.count <= 0) continue
        const partForThisType = partParAutre // Equal split among all others
        const tax = computeHeirTax(partForThisType, heir.type)
        heirResults.push({
          label: heir.count === 1 ? HEIR_LABELS[heir.type] : `${HEIR_LABELS[heir.type]} (×${heir.count})`,
          type: heir.type,
          part: partForThisType,
          count: heir.count,
          ...tax,
          droitsTotal: tax.droits * heir.count,
        })
      }
    } else if (totalOthers > 0 && hasChildren) {
      // Show others with 0 share (informational)
      for (const heir of otherHeirs) {
        if (heir.count <= 0) continue
        heirResults.push({
          label: heir.count === 1 ? HEIR_LABELS[heir.type] : `${HEIR_LABELS[heir.type]} (×${heir.count})`,
          type: heir.type,
          part: 0,
          count: heir.count,
          abattement: 0,
          assietteTaxable: 0,
          droits: 0,
          tauxEffectif: 0,
          droitsTotal: 0,
        })
      }
    }

    return heirResults
  }, [computed, montant, hasConjoint, nbEnfants, conjointOption, conjointAge, otherHeirs])

  const totalDroits = results.reduce((sum, r) => sum + r.droitsTotal, 0)
  const totalShares = results.reduce((sum, r) => sum + r.part * r.count, 0)
  const tauxEffectifGlobal = montant > 0 ? (totalDroits / montant) * 100 : 0
  const netTransmis = montant - totalDroits

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setComputed(true)
  }

  const hasAnyHeirs = hasConjoint || nbEnfants > 0 || otherHeirs.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy-50/50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-navy-100/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 transition-colors">
            <ArrowLeft size={15} />
            Retour
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        {/* Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-navy-100 text-navy-600 mb-4">
            <Calculator size={24} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-navy-900 mb-2">
            Simulateur de droits de succession
          </h1>
          <p className="text-navy-500 max-w-2xl mx-auto">
            Estimez les droits de succession en fonction de votre situation familiale complète :
            conjoint, enfants et autres héritiers. Simulation basée sur le barème fiscal 2026.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ────── SECTION 1: PATRIMOINE ────── */}
          <div className="bg-white rounded-2xl shadow-lg shadow-navy-900/5 border border-navy-100/60 p-6 sm:p-8">
            <h2 className="font-serif text-lg font-bold text-navy-900 mb-4 flex items-center gap-2">
              <TrendingDown size={20} className="text-navy-600" />
              Patrimoine net à transmettre
            </h2>
            <div className="relative max-w-md">
              <input
                type="text"
                value={montantRaw}
                onChange={(e) => { setMontantRaw(e.target.value); setComputed(false) }}
                placeholder="Ex : 500 000"
                className="w-full pr-12 pl-4 py-3 border border-navy-200 rounded-lg text-lg focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-navy-400 font-medium">€</span>
            </div>
            <p className="text-xs text-navy-400 mt-2 flex items-center gap-1">
              <Info size={12} />
              Valeur nette après déduction des dettes (immobilier + financier + professionnel)
            </p>
          </div>

          {/* ────── SECTION 2: SITUATION FAMILIALE ────── */}
          <div className="bg-white rounded-2xl shadow-lg shadow-navy-900/5 border border-navy-100/60 p-6 sm:p-8">
            <h2 className="font-serif text-lg font-bold text-navy-900 mb-6 flex items-center gap-2">
              <Users size={20} className="text-navy-600" />
              Situation familiale
            </h2>

            <div className="space-y-6">
              {/* Conjoint toggle */}
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    hasConjoint ? 'bg-pink-100 text-pink-600' : 'bg-navy-100 text-navy-400'
                  } transition-colors`}
                >
                  <Heart size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-navy-700">
                      Conjoint ou partenaire de PACS
                    </label>
                    <button
                      type="button"
                      onClick={() => { setHasConjoint(!hasConjoint); setComputed(false) }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        hasConjoint ? 'bg-navy-600' : 'bg-navy-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          hasConjoint ? 'translate-x-6' : ''
                        }`}
                      />
                    </button>
                  </div>
                  {hasConjoint && (
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      ✓ Le conjoint survivant est totalement exonéré de droits de succession
                    </p>
                  )}
                </div>
              </div>

              {/* Nombre d'enfants */}
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    nbEnfants > 0 ? 'bg-blue-100 text-blue-600' : 'bg-navy-100 text-navy-400'
                  } transition-colors`}
                >
                  <Baby size={20} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-navy-700 mb-1.5">
                    Nombre d'enfants
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => { setNbEnfants(Math.max(0, nbEnfants - 1)); setComputed(false) }}
                      className="w-9 h-9 rounded-lg border border-navy-200 flex items-center justify-center text-navy-600 hover:bg-navy-50 transition-colors disabled:opacity-40"
                      disabled={nbEnfants === 0}
                    >
                      −
                    </button>
                    <span className="w-10 text-center text-lg font-semibold text-navy-800">
                      {nbEnfants}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setNbEnfants(nbEnfants + 1); setComputed(false) }}
                      className="w-9 h-9 rounded-lg border border-navy-200 flex items-center justify-center text-navy-600 hover:bg-navy-50 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  {nbEnfants > 0 && (
                    <p className="text-xs text-navy-400 mt-1.5">
                      Abattement de {fmt(100_000)} par enfant (renouvelable tous les 15 ans)
                    </p>
                  )}
                </div>
              </div>

              {/* Option conjoint quand conjoint + enfants */}
              {hasConjoint && nbEnfants > 0 && (
                <div className="ml-14 p-4 bg-navy-50/60 rounded-xl border border-navy-100/60">
                  <label className="block text-sm font-medium text-navy-700 mb-3">
                    Option du conjoint survivant
                  </label>
                  <div className="space-y-2">
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        conjointOption === 'pleine_propriete'
                          ? 'border-navy-600 bg-white shadow-sm'
                          : 'border-navy-200 hover:border-navy-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="conjointOption"
                        value="pleine_propriete"
                        checked={conjointOption === 'pleine_propriete'}
                        onChange={() => { setConjointOption('pleine_propriete'); setComputed(false) }}
                        className="mt-0.5 accent-navy-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-navy-800">
                          ¼ en pleine propriété
                        </div>
                        <div className="text-xs text-navy-500 mt-0.5">
                          Le conjoint reçoit 25 % du patrimoine, les enfants se partagent les 75 % restants
                        </div>
                      </div>
                    </label>
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        conjointOption === 'usufruit'
                          ? 'border-navy-600 bg-white shadow-sm'
                          : 'border-navy-200 hover:border-navy-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="conjointOption"
                        value="usufruit"
                        checked={conjointOption === 'usufruit'}
                        onChange={() => { setConjointOption('usufruit'); setComputed(false) }}
                        className="mt-0.5 accent-navy-600"
                      />
                      <div>
                        <div className="text-sm font-medium text-navy-800">
                          100 % en usufruit
                        </div>
                        <div className="text-xs text-navy-500 mt-0.5">
                          Le conjoint garde l'usage de tous les biens, les enfants reçoivent la nue-propriété
                        </div>
                      </div>
                    </label>
                  </div>

                  {conjointOption === 'usufruit' && (
                    <div className="mt-3">
                      <label className="block text-xs font-medium text-navy-600 mb-1">
                        Âge du conjoint (pour le barème fiscal de l'usufruit)
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="20"
                          max="95"
                          value={conjointAge}
                          onChange={(e) => { setConjointAge(parseInt(e.target.value)); setComputed(false) }}
                          className="flex-1 accent-navy-600"
                        />
                        <span className="text-sm font-semibold text-navy-700 w-16 text-right">
                          {conjointAge} ans
                        </span>
                      </div>
                      <p className="text-xs text-navy-400 mt-1">
                        Valeur fiscale de l'usufruit : {(getUsufruitRate(conjointAge) * 100).toFixed(0)} % — Nue-propriété : {((1 - getUsufruitRate(conjointAge)) * 100).toFixed(0)} %
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Autres héritiers */}
              <div className="flex items-start gap-4">
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                    otherHeirs.length > 0 ? 'bg-gold-100 text-gold-600' : 'bg-navy-100 text-navy-400'
                  } transition-colors`}
                >
                  <UserPlus size={20} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Autres héritiers
                  </label>

                  {nbEnfants > 0 && otherHeirs.length === 0 && (
                    <p className="text-xs text-navy-400 mb-2">
                      En présence d'enfants, les autres héritiers ne reçoivent rien par dévolution légale.
                      Vous pouvez tout de même les ajouter pour simuler un legs ou une donation.
                    </p>
                  )}

                  {otherHeirs.map((heir) => (
                    <div key={heir.id} className="flex items-center gap-2 mb-2">
                      <select
                        value={heir.type}
                        onChange={(e) => { updateOtherHeir(heir.id, 'type', e.target.value as HeirType); setComputed(false) }}
                        className="flex-1 px-3 py-2 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors bg-white"
                      >
                        {OTHER_HEIR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-navy-500">×</span>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={heir.count}
                          onChange={(e) => { updateOtherHeir(heir.id, 'count', parseInt(e.target.value) || 1); setComputed(false) }}
                          className="w-16 px-2 py-2 border border-navy-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => { removeOtherHeir(heir.id); setComputed(false) }}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addOtherHeir}
                    className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 hover:bg-navy-50 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Ajouter un héritier
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ────── SUBMIT ────── */}
          <button
            type="submit"
            disabled={montant <= 0 || !hasAnyHeirs}
            className="w-full flex items-center justify-center gap-2 bg-navy-800 text-white py-3.5 rounded-xl font-medium hover:bg-navy-700 transition-colors group disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-navy-900/10"
          >
            <Calculator size={18} />
            Calculer les droits de succession
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </form>

        {/* ────── RESULTS ────── */}
        {computed && results.length > 0 && (
          <div className="mt-8 space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
                <div className="text-xs text-navy-500 mb-1">Patrimoine</div>
                <div className="text-lg font-bold text-navy-800">{fmt(montant)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
                <div className="text-xs text-navy-500 mb-1">Total droits</div>
                <div className="text-lg font-bold text-red-600">{fmt(totalDroits)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
                <div className="text-xs text-navy-500 mb-1">Net transmis</div>
                <div className="text-lg font-bold text-green-600">{fmt(netTransmis)}</div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
                <div className="text-xs text-navy-500 mb-1">Taux effectif</div>
                <div className="text-lg font-bold text-navy-800">{fmtPct(tauxEffectifGlobal)}</div>
              </div>
            </div>

            {/* Visual bar */}
            {montant > 0 && (
              <div className="bg-white rounded-2xl shadow-lg shadow-navy-900/5 border border-navy-100/60 p-6">
                <h3 className="text-sm font-medium text-navy-700 mb-3">Répartition du patrimoine</h3>
                <div className="flex rounded-lg overflow-hidden h-8">
                  {results.filter(r => r.part > 0 || r.count > 0).map((r, i) => {
                    const pct = ((r.part * r.count) / montant) * 100
                    if (pct <= 0) return null
                    const colors = [
                      'bg-pink-400', 'bg-blue-400', 'bg-gold-400', 'bg-emerald-400', 'bg-purple-400', 'bg-orange-400'
                    ]
                    return (
                      <div
                        key={i}
                        className={`${colors[i % colors.length]} flex items-center justify-center text-white text-xs font-medium`}
                        style={{ width: `${pct}%`, minWidth: pct > 3 ? 'auto' : '8px' }}
                        title={`${r.label}: ${fmtPct(pct)}`}
                      >
                        {pct > 10 ? `${r.label.split(' (')[0]} ${pct.toFixed(0)}%` : pct > 5 ? `${pct.toFixed(0)}%` : ''}
                      </div>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-3">
                  {results.filter(r => r.part > 0 || r.count > 0).map((r, i) => {
                    const colors = [
                      'bg-pink-400', 'bg-blue-400', 'bg-gold-400', 'bg-emerald-400', 'bg-purple-400', 'bg-orange-400'
                    ]
                    const pct = ((r.part * r.count) / montant) * 100
                    return (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-navy-600">
                        <span className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
                        {r.label}: {fmtPct(pct)}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Detailed table */}
            <div className="bg-white rounded-2xl shadow-lg shadow-navy-900/5 border border-navy-100/60 overflow-hidden">
              <div className="p-6 pb-4">
                <h3 className="font-semibold text-navy-800 flex items-center gap-2">
                  <TrendingDown size={18} />
                  Détail par héritier
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-t border-b border-navy-100 bg-navy-50/40">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider">Héritier</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider">Part reçue</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider">Abattement</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider">Assiette taxable</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider">Droits (unitaire)</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider">Droits total</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wider">Taux effectif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-navy-100/60">
                    {results.map((r, i) => (
                      <tr key={i} className="hover:bg-navy-50/30 transition-colors">
                        <td className="px-6 py-3 font-medium text-navy-800">{r.label}</td>
                        <td className="px-4 py-3 text-right text-navy-700">{fmt(r.part)}</td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          {r.type === 'conjoint' ? 'Exonéré' : fmt(r.abattement)}
                        </td>
                        <td className="px-4 py-3 text-right text-navy-700">{fmt(r.assietteTaxable)}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-medium">{fmt(r.droits)}</td>
                        <td className="px-4 py-3 text-right text-red-600 font-bold">{fmt(r.droitsTotal)}</td>
                        <td className="px-6 py-3 text-right text-navy-700">{fmtPct(r.tauxEffectif)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-navy-200 bg-navy-50/60 font-bold">
                      <td className="px-6 py-3 text-navy-900">TOTAL</td>
                      <td className="px-4 py-3 text-right text-navy-800">{fmt(totalShares)}</td>
                      <td className="px-4 py-3 text-right" />
                      <td className="px-4 py-3 text-right" />
                      <td className="px-4 py-3 text-right" />
                      <td className="px-4 py-3 text-right text-red-700">{fmt(totalDroits)}</td>
                      <td className="px-6 py-3 text-right text-navy-800">{fmtPct(tauxEffectifGlobal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Advanced details toggle */}
            <div className="bg-white rounded-2xl shadow-lg shadow-navy-900/5 border border-navy-100/60 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-6 py-4 flex items-center justify-between text-sm font-medium text-navy-700 hover:bg-navy-50/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Info size={16} />
                  Barèmes et abattements appliqués
                </span>
                {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {showAdvanced && (
                <div className="px-6 pb-6 space-y-4 border-t border-navy-100/60 pt-4">
                  <div>
                    <h4 className="text-sm font-semibold text-navy-800 mb-2">Abattements (par héritier)</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="bg-navy-50 rounded-lg p-2.5">
                        <div className="font-medium text-navy-700">Conjoint / PACS</div>
                        <div className="text-green-600 font-bold">Exonéré</div>
                      </div>
                      <div className="bg-navy-50 rounded-lg p-2.5">
                        <div className="font-medium text-navy-700">Enfant</div>
                        <div className="text-navy-900 font-bold">{fmt(100_000)}</div>
                      </div>
                      <div className="bg-navy-50 rounded-lg p-2.5">
                        <div className="font-medium text-navy-700">Frère / Sœur</div>
                        <div className="text-navy-900 font-bold">{fmt(15_932)}</div>
                      </div>
                      <div className="bg-navy-50 rounded-lg p-2.5">
                        <div className="font-medium text-navy-700">Neveu / Nièce</div>
                        <div className="text-navy-900 font-bold">{fmt(7_967)}</div>
                      </div>
                      <div className="bg-navy-50 rounded-lg p-2.5">
                        <div className="font-medium text-navy-700">Autre</div>
                        <div className="text-navy-900 font-bold">{fmt(1_594)}</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy-800 mb-2">Barème en ligne directe (enfants)</h4>
                    <div className="text-xs space-y-1 text-navy-600">
                      <div className="flex justify-between"><span>Jusqu'à {fmt(8_072)}</span><span className="font-medium">5 %</span></div>
                      <div className="flex justify-between"><span>De {fmt(8_072)} à {fmt(12_109)}</span><span className="font-medium">10 %</span></div>
                      <div className="flex justify-between"><span>De {fmt(12_109)} à {fmt(15_932)}</span><span className="font-medium">15 %</span></div>
                      <div className="flex justify-between"><span>De {fmt(15_932)} à {fmt(552_324)}</span><span className="font-medium">20 %</span></div>
                      <div className="flex justify-between"><span>De {fmt(552_324)} à {fmt(902_838)}</span><span className="font-medium">30 %</span></div>
                      <div className="flex justify-between"><span>De {fmt(902_838)} à {fmt(1_805_677)}</span><span className="font-medium">40 %</span></div>
                      <div className="flex justify-between"><span>Au-delà de {fmt(1_805_677)}</span><span className="font-medium">45 %</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy-800 mb-2">Frères et sœurs</h4>
                    <div className="text-xs space-y-1 text-navy-600">
                      <div className="flex justify-between"><span>Jusqu'à {fmt(24_430)}</span><span className="font-medium">35 %</span></div>
                      <div className="flex justify-between"><span>Au-delà de {fmt(24_430)}</span><span className="font-medium">45 %</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-navy-800 mb-2">Autres héritiers</h4>
                    <div className="text-xs space-y-1 text-navy-600">
                      <div className="flex justify-between"><span>Neveux / Nièces</span><span className="font-medium">55 %</span></div>
                      <div className="flex justify-between"><span>Autres personnes</span><span className="font-medium">60 %</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Optimization tips */}
            <div className="bg-gold-50 border border-gold-200/60 rounded-2xl p-6">
              <h3 className="font-semibold text-gold-900 mb-3 flex items-center gap-2">
                <Lightbulb size={18} className="text-gold-600" />
                Pistes d'optimisation
              </h3>
              <div className="space-y-3 text-sm text-gold-800">
                {nbEnfants > 0 && (
                  <div className="flex gap-2">
                    <span className="text-gold-600 mt-0.5">•</span>
                    <div>
                      <span className="font-medium">Donations anticipées :</span>{' '}
                      l'abattement de {fmt(100_000)} par enfant se renouvelle tous les 15 ans.
                      En donnant {fmt(100_000 * nbEnfants)} aujourd'hui et autant dans 15 ans,
                      vous transmettez {fmt(200_000 * nbEnfants)} sans droits.
                    </div>
                  </div>
                )}
                {hasConjoint && nbEnfants > 0 && (
                  <div className="flex gap-2">
                    <span className="text-gold-600 mt-0.5">•</span>
                    <div>
                      <span className="font-medium">Assurance-vie :</span>{' '}
                      chaque bénéficiaire profite d'un abattement supplémentaire de {fmt(152_500)} sur les primes versées avant 70 ans (article 990 I du CGI).
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="text-gold-600 mt-0.5">•</span>
                  <div>
                    <span className="font-medium">Démembrement de propriété :</span>{' '}
                    transmettre la nue-propriété de biens immobiliers permet de réduire l'assiette taxable en fonction de l'âge du donateur.
                  </div>
                </div>
                {montant > 500_000 && (
                  <div className="flex gap-2">
                    <span className="text-gold-600 mt-0.5">•</span>
                    <div>
                      <span className="font-medium">Pacte Dutreil :</span>{' '}
                      pour la transmission d'entreprise, l'exonération peut atteindre 75 % de la valeur des titres.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-navy-400 text-center px-4">
              Simulation indicative basée sur le barème fiscal en vigueur et la dévolution légale.
              Ne constitue pas un conseil fiscal ou juridique.
              Consultez un notaire ou un conseiller en gestion de patrimoine pour une analyse personnalisée.
            </p>
          </div>
        )}

        {/* Empty state message */}
        {computed && results.length === 0 && montant > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-lg shadow-navy-900/5 border border-navy-100/60 p-8 text-center">
            <Users size={40} className="mx-auto text-navy-300 mb-3" />
            <p className="text-navy-600 font-medium">Ajoutez au moins un héritier pour lancer la simulation</p>
            <p className="text-sm text-navy-400 mt-1">Conjoint, enfants, frères & sœurs, neveux…</p>
          </div>
        )}
      </div>
    </div>
  )
}
