import { useState, useMemo, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator,
  ArrowLeft,
  ArrowRight,
  Plus,
  Trash2,
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
  [20, 0.90], [30, 0.80], [40, 0.70], [50, 0.60],
  [60, 0.50], [70, 0.40], [80, 0.30], [90, 0.20],
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

function computeHeirTax(partBrute: number, type: HeirType) {
  if (type === 'conjoint') {
    return { abattement: partBrute, assietteTaxable: 0, droits: 0, tauxEffectif: 0 }
  }
  const abattement = ABATTEMENTS[type]
  const assietteTaxable = Math.max(0, partBrute - abattement)
  let droits: number
  if (type === 'enfant') droits = applyBareme(assietteTaxable, BAREME_LIGNE_DIRECTE)
  else if (type === 'frere_soeur') droits = applyBareme(assietteTaxable, BAREME_FRERE_SOEUR)
  else if (type === 'neveu_niece') droits = Math.round(assietteTaxable * 0.55)
  else droits = Math.round(assietteTaxable * 0.60)
  return { abattement, assietteTaxable, droits, tauxEffectif: partBrute > 0 ? (droits / partBrute) * 100 : 0 }
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
  return n.toFixed(1).replace('.', ',') + '\u202F%'
}

function fmtNum(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

function parseMontant(raw: string): number {
  return parseFloat(raw.replace(/[\s€,.\u00a0\u202f]/g, '')) || 0
}

/* ───────────── ANIMATION HOOK ───────────── */

function useAnimatedNumber(target: number, duration = 600) {
  const [value, setValue] = useState(0)
  const ref = useRef<number | null>(null)
  const startValue = useRef(0)
  const startTime = useRef(0)

  useEffect(() => {
    if (ref.current) cancelAnimationFrame(ref.current)
    startValue.current = value
    startTime.current = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(startValue.current + (target - startValue.current) * eased)
      if (progress < 1) ref.current = requestAnimationFrame(animate)
    }
    ref.current = requestAnimationFrame(animate)
    return () => { if (ref.current) cancelAnimationFrame(ref.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  return Math.round(value)
}

/* ───────────── RESULT COLORS ───────────── */

const RESULT_COLORS = [
  { bg: 'bg-navy-800', bar: '#1e3a5f' },
  { bg: 'bg-navy-500', bar: '#3d62a8' },
  { bg: 'bg-gold-500', bar: '#d4a020' },
  { bg: 'bg-navy-300', bar: '#8da8d4' },
  { bg: 'bg-gold-300', bar: '#edcf6d' },
  { bg: 'bg-navy-200', bar: '#bccae6' },
]

/* ───────────── COMPONENT ───────────── */

export default function Simulator() {
  const [montantRaw, setMontantRaw] = useState('')
  const [hasConjoint, setHasConjoint] = useState(false)
  const [nbEnfants, setNbEnfants] = useState(0)
  const [conjointOption, setConjointOption] = useState<ConjointOption>('pleine_propriete')
  const [conjointAge, setConjointAge] = useState(65)
  const [otherHeirs, setOtherHeirs] = useState<OtherHeir[]>([])
  const [showBaremes, setShowBaremes] = useState(false)
  const [computed, setComputed] = useState(false)

  const resultsRef = useRef<HTMLDivElement>(null)
  const montant = parseMontant(montantRaw)

  function addOtherHeir() {
    setOtherHeirs(prev => [...prev, { id: crypto.randomUUID(), type: 'frere_soeur', count: 1 }])
  }
  function removeOtherHeir(id: string) {
    setOtherHeirs(prev => prev.filter(h => h.id !== id))
  }
  function updateOtherHeir(id: string, field: 'type' | 'count', value: string | number) {
    setOtherHeirs(prev => prev.map(h => h.id === id ? { ...h, [field]: value } : h))
  }

  /* ── compute results ── */
  const results = useMemo<HeirResult[]>(() => {
    if (!computed || montant <= 0) return []
    const totalOthers = otherHeirs.reduce((s, h) => s + h.count, 0)
    const totalHeirs = (hasConjoint ? 1 : 0) + nbEnfants + totalOthers
    if (totalHeirs === 0) return []

    const out: HeirResult[] = []
    let conjointShare = 0, childrenTotal = 0, othersPool = 0

    if (hasConjoint && nbEnfants > 0) {
      if (conjointOption === 'pleine_propriete') {
        conjointShare = montant * 0.25; childrenTotal = montant * 0.75
      } else {
        const r = getUsufruitRate(conjointAge)
        conjointShare = montant * r; childrenTotal = montant * (1 - r)
      }
    } else if (hasConjoint && nbEnfants === 0 && totalOthers > 0) {
      conjointShare = montant * 0.5; othersPool = montant * 0.5
    } else if (hasConjoint) {
      conjointShare = montant
    } else if (nbEnfants > 0) {
      childrenTotal = montant
    } else {
      othersPool = montant
    }

    if (hasConjoint) {
      const t = computeHeirTax(conjointShare, 'conjoint')
      out.push({ label: 'Conjoint', type: 'conjoint', part: conjointShare, count: 1, ...t, droitsTotal: 0 })
    }
    if (nbEnfants > 0 && childrenTotal > 0) {
      const partPer = childrenTotal / nbEnfants
      const t = computeHeirTax(partPer, 'enfant')
      out.push({
        label: nbEnfants === 1 ? 'Enfant' : `Enfants ×${nbEnfants}`,
        type: 'enfant', part: partPer, count: nbEnfants, ...t, droitsTotal: t.droits * nbEnfants,
      })
    }
    if (totalOthers > 0 && othersPool > 0) {
      const partPer = othersPool / totalOthers
      for (const h of otherHeirs) {
        if (h.count <= 0) continue
        const t = computeHeirTax(partPer, h.type)
        out.push({
          label: h.count === 1 ? HEIR_LABELS[h.type] : `${HEIR_LABELS[h.type]} ×${h.count}`,
          type: h.type, part: partPer, count: h.count, ...t, droitsTotal: t.droits * h.count,
        })
      }
    } else if (totalOthers > 0 && nbEnfants > 0) {
      for (const h of otherHeirs) {
        if (h.count <= 0) continue
        out.push({
          label: h.count === 1 ? HEIR_LABELS[h.type] : `${HEIR_LABELS[h.type]} ×${h.count}`,
          type: h.type, part: 0, count: h.count,
          abattement: 0, assietteTaxable: 0, droits: 0, tauxEffectif: 0, droitsTotal: 0,
        })
      }
    }
    return out
  }, [computed, montant, hasConjoint, nbEnfants, conjointOption, conjointAge, otherHeirs])

  const totalDroits = results.reduce((s, r) => s + r.droitsTotal, 0)
  const netTransmis = montant - totalDroits
  const tauxEffectifGlobal = montant > 0 ? (totalDroits / montant) * 100 : 0
  const hasAnyHeirs = hasConjoint || nbEnfants > 0 || otherHeirs.length > 0

  const animatedDroits = useAnimatedNumber(computed ? totalDroits : 0)
  const animatedNet = useAnimatedNumber(computed ? netTransmis : 0)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setComputed(true)
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* ── Nav ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.04]">
        <div className="max-w-3xl mx-auto px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                <span className="text-white font-serif font-bold text-xs">LF</span>
              </div>
              <span className="font-serif font-semibold text-navy-800 text-[15px] tracking-tight">Lègue Facile</span>
            </Link>
            <Link
              to="/"
              className="text-[13px] text-navy-500 hover:text-navy-800 transition-colors duration-200 flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              Accueil
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-5 sm:px-8 pt-12 pb-20">
        {/* ── Hero ── */}
        <div className="text-center mb-14">
          <h1 className="font-serif text-[2rem] sm:text-[2.5rem] font-bold text-navy-900 tracking-tight leading-[1.1] mb-3">
            Simulateur de succession
          </h1>
          <p className="text-[15px] text-navy-400 max-w-lg mx-auto leading-relaxed">
            Estimez les droits de succession selon votre situation familiale.
            Conjoint, enfants, autres héritiers — comme dans la réalité.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── SECTION: Patrimoine ── */}
          <section className="mb-8">
            <label className="block text-[11px] font-semibold text-navy-400 uppercase tracking-[0.08em] mb-3">
              Patrimoine net taxable
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                value={montantRaw}
                onChange={(e) => { setMontantRaw(e.target.value); setComputed(false) }}
                placeholder="500 000"
                className="w-full h-14 pl-5 pr-12 bg-white rounded-2xl text-[1.25rem] font-medium text-navy-900 placeholder:text-navy-200 border-0 ring-1 ring-black/[0.06] focus:ring-2 focus:ring-navy-800/20 outline-none transition-shadow duration-200"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-navy-300 text-[15px] font-medium">€</span>
            </div>
            <p className="mt-2 text-[12px] text-navy-300">
              Valeur nette de l'ensemble du patrimoine après déduction des dettes.
            </p>
          </section>

          {/* ── SECTION: Héritiers ── */}
          <section className="bg-white rounded-3xl ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8 mb-8">
            <h2 className="text-[11px] font-semibold text-navy-400 uppercase tracking-[0.08em] mb-8">
              Situation familiale
            </h2>

            {/* Conjoint */}
            <div className="flex items-center justify-between py-4 border-b border-black/[0.04]">
              <div>
                <div className="text-[15px] font-medium text-navy-900">Conjoint ou partenaire PACS</div>
                {hasConjoint && (
                  <div className="text-[12px] text-emerald-600 font-medium mt-0.5">Exonéré de droits de succession</div>
                )}
              </div>
              {/* iOS toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={hasConjoint}
                onClick={() => { setHasConjoint(!hasConjoint); setComputed(false) }}
                className={`relative w-[51px] h-[31px] rounded-full transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] flex-shrink-0 ${
                  hasConjoint ? 'bg-emerald-500' : 'bg-black/[0.09]'
                }`}
              >
                <span
                  className={`absolute top-[2px] left-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)] transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${
                    hasConjoint ? 'translate-x-[20px]' : ''
                  }`}
                />
              </button>
            </div>

            {/* Conjoint option (when conjoint + enfants) */}
            {hasConjoint && nbEnfants > 0 && (
              <div className="py-5 border-b border-black/[0.04]">
                <div className="text-[13px] text-navy-500 mb-3">Option du conjoint survivant</div>
                {/* Segmented control */}
                <div className="relative flex bg-black/[0.05] rounded-xl p-[3px]">
                  <div
                    className="absolute top-[3px] bottom-[3px] rounded-[10px] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)] transition-all duration-250 ease-[cubic-bezier(0.23,1,0.32,1)]"
                    style={{
                      width: 'calc(50% - 3px)',
                      left: conjointOption === 'pleine_propriete' ? '3px' : 'calc(50%)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => { setConjointOption('pleine_propriete'); setComputed(false) }}
                    className={`relative z-10 flex-1 py-2 text-[13px] font-medium rounded-[10px] transition-colors duration-200 ${
                      conjointOption === 'pleine_propriete' ? 'text-navy-900' : 'text-navy-400'
                    }`}
                  >
                    ¼ pleine propriété
                  </button>
                  <button
                    type="button"
                    onClick={() => { setConjointOption('usufruit'); setComputed(false) }}
                    className={`relative z-10 flex-1 py-2 text-[13px] font-medium rounded-[10px] transition-colors duration-200 ${
                      conjointOption === 'usufruit' ? 'text-navy-900' : 'text-navy-400'
                    }`}
                  >
                    100% usufruit
                  </button>
                </div>
                {conjointOption === 'pleine_propriete' ? (
                  <p className="mt-2.5 text-[12px] text-navy-300 leading-relaxed">
                    Le conjoint reçoit 25% en pleine propriété, les enfants se partagent 75%.
                  </p>
                ) : (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[13px] text-navy-500">Âge du conjoint</span>
                      <span className="text-[13px] font-semibold text-navy-900 tabular-nums">
                        {conjointAge} ans
                      </span>
                    </div>
                    <input
                      type="range"
                      min="20"
                      max="95"
                      value={conjointAge}
                      onChange={(e) => { setConjointAge(parseInt(e.target.value)); setComputed(false) }}
                      className="w-full h-1 bg-black/[0.06] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-[0_0.5px_4px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.08)] [&::-webkit-slider-thumb]:transition-shadow [&::-webkit-slider-thumb]:hover:shadow-[0_0.5px_6px_rgba(0,0,0,0.18),0_0_0_0.5px_rgba(0,0,0,0.10)]"
                    />
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[11px] text-navy-300">
                        Usufruit : {(getUsufruitRate(conjointAge) * 100).toFixed(0)}%
                      </span>
                      <span className="text-[11px] text-navy-300">
                        Nue-propriété : {((1 - getUsufruitRate(conjointAge)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Enfants */}
            <div className="flex items-center justify-between py-5 border-b border-black/[0.04]">
              <div>
                <div className="text-[15px] font-medium text-navy-900">Enfants</div>
                {nbEnfants > 0 && (
                  <div className="text-[12px] text-navy-300 mt-0.5">
                    Abattement {fmtNum(100_000)} € par enfant
                  </div>
                )}
              </div>
              {/* Stepper */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => { setNbEnfants(Math.max(0, nbEnfants - 1)); setComputed(false) }}
                  disabled={nbEnfants === 0}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-navy-400 ring-1 ring-black/[0.08] hover:ring-black/[0.15] active:scale-[0.92] transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] disabled:opacity-30 disabled:pointer-events-none"
                >
                  <span className="text-lg leading-none">−</span>
                </button>
                <span className="w-6 text-center text-[17px] font-semibold text-navy-900 tabular-nums select-none">
                  {nbEnfants}
                </span>
                <button
                  type="button"
                  onClick={() => { setNbEnfants(nbEnfants + 1); setComputed(false) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-navy-400 ring-1 ring-black/[0.08] hover:ring-black/[0.15] active:scale-[0.92] transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]"
                >
                  <span className="text-lg leading-none">+</span>
                </button>
              </div>
            </div>

            {/* Other heirs */}
            <div className="pt-5">
              <div className="text-[15px] font-medium text-navy-900 mb-1">Autres héritiers</div>
              {nbEnfants > 0 && otherHeirs.length === 0 && (
                <p className="text-[12px] text-navy-300 mb-3">
                  En présence d'enfants, les autres héritiers ne reçoivent rien en dévolution légale.
                </p>
              )}

              {otherHeirs.map((heir) => (
                <div key={heir.id} className="flex items-center gap-2 mt-3">
                  <select
                    value={heir.type}
                    onChange={(e) => { updateOtherHeir(heir.id, 'type', e.target.value as HeirType); setComputed(false) }}
                    className="flex-1 h-10 px-3 bg-[#fafafa] rounded-xl text-[13px] text-navy-700 border-0 ring-1 ring-black/[0.06] focus:ring-2 focus:ring-navy-800/20 outline-none transition-shadow duration-200 appearance-none cursor-pointer"
                  >
                    {OTHER_HEIR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => { updateOtherHeir(heir.id, 'count', Math.max(1, heir.count - 1)); setComputed(false) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-navy-400 ring-1 ring-black/[0.08] hover:ring-black/[0.15] active:scale-[0.90] transition-all duration-150 disabled:opacity-30"
                      disabled={heir.count <= 1}
                    >
                      <span className="text-sm">−</span>
                    </button>
                    <span className="w-5 text-center text-[14px] font-medium text-navy-900 tabular-nums">{heir.count}</span>
                    <button
                      type="button"
                      onClick={() => { updateOtherHeir(heir.id, 'count', heir.count + 1); setComputed(false) }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-navy-400 ring-1 ring-black/[0.08] hover:ring-black/[0.15] active:scale-[0.90] transition-all duration-150"
                    >
                      <span className="text-sm">+</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => { removeOtherHeir(heir.id); setComputed(false) }}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-navy-300 hover:text-red-500 hover:bg-red-50 active:scale-[0.90] transition-all duration-150"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={addOtherHeir}
                className="mt-3 flex items-center gap-1.5 text-[13px] text-navy-400 hover:text-navy-600 active:scale-[0.97] transition-all duration-150"
              >
                <Plus size={14} />
                Ajouter un héritier
              </button>
            </div>
          </section>

          {/* ── CTA ── */}
          <button
            type="submit"
            disabled={montant <= 0 || !hasAnyHeirs}
            className="w-full h-[52px] bg-navy-900 text-white rounded-2xl text-[15px] font-medium flex items-center justify-center gap-2 hover:bg-navy-800 active:scale-[0.98] transition-all duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] disabled:opacity-30 disabled:pointer-events-none shadow-[0_1px_3px_rgba(0,0,0,0.1),0_4px_12px_rgba(26,47,77,0.15)]"
          >
            Calculer les droits
            <ArrowRight size={16} />
          </button>
        </form>

        {/* ── RESULTS ── */}
        {computed && results.length > 0 && (
          <div ref={resultsRef} className="mt-12">
            {/* Hero numbers */}
            <div className="text-center mb-10">
              <div className="text-[11px] font-semibold text-navy-400 uppercase tracking-[0.08em] mb-2">
                Total des droits de succession
              </div>
              <div className="font-serif text-[2.75rem] sm:text-[3.5rem] font-bold text-navy-900 tracking-tight leading-none tabular-nums">
                {fmtNum(animatedDroits)}<span className="text-[1.5rem] sm:text-[2rem] font-medium text-navy-300 ml-1">€</span>
              </div>
              <div className="flex items-center justify-center gap-6 mt-4 text-[13px]">
                <div>
                  <span className="text-navy-400">Net transmis </span>
                  <span className="font-semibold text-navy-700 tabular-nums">{fmtNum(animatedNet)} €</span>
                </div>
                <div className="w-px h-4 bg-black/[0.08]" />
                <div>
                  <span className="text-navy-400">Taux effectif </span>
                  <span className="font-semibold text-navy-700 tabular-nums">{fmtPct(tauxEffectifGlobal)}</span>
                </div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="bg-white rounded-3xl ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8 mb-4">
              <div className="text-[11px] font-semibold text-navy-400 uppercase tracking-[0.08em] mb-4">
                Répartition
              </div>
              <div className="flex rounded-xl overflow-hidden h-3 bg-black/[0.03]">
                {results.filter(r => r.part * r.count > 0).map((r, i) => {
                  const pct = ((r.part * r.count) / montant) * 100
                  return (
                    <div
                      key={i}
                      className={`${RESULT_COLORS[i % RESULT_COLORS.length].bg} transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]`}
                      style={{ width: `${pct}%`, minWidth: pct > 0.5 ? '4px' : '0' }}
                    />
                  )
                })}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4">
                {results.filter(r => r.part * r.count > 0).map((r, i) => {
                  const pct = ((r.part * r.count) / montant) * 100
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-[12px] text-navy-500">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: RESULT_COLORS[i % RESULT_COLORS.length].bar }}
                      />
                      {r.label.split(' (')[0]} · {pct.toFixed(0)}%
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Detail cards */}
            <div className="space-y-[1px] bg-black/[0.03] rounded-3xl overflow-hidden mb-4">
              {results.map((r, i) => (
                <div key={i} className="bg-white px-6 sm:px-8 py-5 first:rounded-t-3xl last:rounded-b-3xl">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: RESULT_COLORS[i % RESULT_COLORS.length].bar }}
                      />
                      <span className="text-[15px] font-medium text-navy-900">{r.label}</span>
                    </div>
                    <span className="text-[15px] font-semibold text-navy-900 tabular-nums">{fmt(r.part * r.count)}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 ml-5">
                    <div>
                      <div className="text-[11px] text-navy-300 mb-0.5">Abattement</div>
                      <div className="text-[13px] font-medium text-navy-600 tabular-nums">
                        {r.type === 'conjoint' ? (
                          <span className="text-emerald-600">Exonéré</span>
                        ) : (
                          fmt(r.abattement)
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-navy-300 mb-0.5">Assiette taxable</div>
                      <div className="text-[13px] font-medium text-navy-600 tabular-nums">{fmt(r.assietteTaxable)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-navy-300 mb-0.5">Droits{r.count > 1 ? ' (unitaire)' : ''}</div>
                      <div className="text-[13px] font-medium text-red-600 tabular-nums">{fmt(r.droits)}</div>
                    </div>
                    {r.count > 1 && (
                      <div>
                        <div className="text-[11px] text-navy-300 mb-0.5">Total ×{r.count}</div>
                        <div className="text-[13px] font-semibold text-red-600 tabular-nums">{fmt(r.droitsTotal)}</div>
                      </div>
                    )}
                    {r.count === 1 && (
                      <div>
                        <div className="text-[11px] text-navy-300 mb-0.5">Taux effectif</div>
                        <div className="text-[13px] font-medium text-navy-600 tabular-nums">{fmtPct(r.tauxEffectif)}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Barèmes toggle */}
            <button
              type="button"
              onClick={() => setShowBaremes(!showBaremes)}
              className="w-full bg-white rounded-2xl ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-6 py-4 flex items-center justify-between text-[13px] font-medium text-navy-500 hover:text-navy-700 transition-colors duration-200 mb-4"
            >
              Barèmes et abattements appliqués
              {showBaremes ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {showBaremes && (
              <div className="bg-white rounded-2xl ring-1 ring-black/[0.04] shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 sm:p-8 mb-4 space-y-6">
                {/* Abattements */}
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase tracking-[0.08em] mb-3">Abattements</div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {([
                      ['Conjoint / PACS', 'Exonéré'],
                      ['Enfant', fmtNum(100_000) + ' €'],
                      ['Frère / Sœur', fmtNum(15_932) + ' €'],
                      ['Neveu / Nièce', fmtNum(7_967) + ' €'],
                      ['Autre', fmtNum(1_594) + ' €'],
                    ] as [string, string][]).map(([label, val]) => (
                      <div key={label} className="bg-[#fafafa] rounded-xl p-3">
                        <div className="text-[12px] text-navy-400">{label}</div>
                        <div className={`text-[14px] font-semibold mt-0.5 ${val === 'Exonéré' ? 'text-emerald-600' : 'text-navy-800'}`}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Ligne directe */}
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase tracking-[0.08em] mb-3">Ligne directe (enfants)</div>
                  <div className="space-y-1 text-[13px]">
                    {[
                      [`Jusqu'à ${fmtNum(8_072)} €`, '5 %'],
                      [`${fmtNum(8_072)} à ${fmtNum(12_109)} €`, '10 %'],
                      [`${fmtNum(12_109)} à ${fmtNum(15_932)} €`, '15 %'],
                      [`${fmtNum(15_932)} à ${fmtNum(552_324)} €`, '20 %'],
                      [`${fmtNum(552_324)} à ${fmtNum(902_838)} €`, '30 %'],
                      [`${fmtNum(902_838)} à ${fmtNum(1_805_677)} €`, '40 %'],
                      [`Au-delà de ${fmtNum(1_805_677)} €`, '45 %'],
                    ].map(([range, rate]) => (
                      <div key={range} className="flex justify-between py-1.5 border-b border-black/[0.03] last:border-0">
                        <span className="text-navy-500">{range}</span>
                        <span className="font-medium text-navy-800 tabular-nums">{rate}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Others */}
                <div>
                  <div className="text-[11px] font-semibold text-navy-400 uppercase tracking-[0.08em] mb-3">Autres héritiers</div>
                  <div className="space-y-1 text-[13px]">
                    {[
                      [`Frères / Sœurs — jusqu'à ${fmtNum(24_430)} €`, '35 %'],
                      [`Frères / Sœurs — au-delà`, '45 %'],
                      [`Neveux / Nièces`, '55 %'],
                      [`Autres personnes`, '60 %'],
                    ].map(([label, rate]) => (
                      <div key={label} className="flex justify-between py-1.5 border-b border-black/[0.03] last:border-0">
                        <span className="text-navy-500">{label}</span>
                        <span className="font-medium text-navy-800 tabular-nums">{rate}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Optimization tips */}
            <div className="bg-white rounded-2xl ring-1 ring-gold-200/60 p-6 sm:p-8 mb-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb size={16} className="text-gold-500" />
                <span className="text-[11px] font-semibold text-gold-600 uppercase tracking-[0.08em]">
                  Pistes d'optimisation
                </span>
              </div>
              <div className="space-y-3 text-[13px] text-navy-600 leading-relaxed">
                {nbEnfants > 0 && (
                  <p>
                    <span className="font-medium text-navy-800">Donations anticipées</span> — L'abattement de {fmtNum(100_000)} € par enfant se renouvelle tous les 15 ans. En échelonnant vos donations, vous transmettez {fmtNum(200_000 * nbEnfants)} € en franchise de droits.
                  </p>
                )}
                {hasConjoint && nbEnfants > 0 && (
                  <p>
                    <span className="font-medium text-navy-800">Assurance-vie</span> — Chaque bénéficiaire profite d'un abattement supplémentaire de {fmtNum(152_500)} € sur les primes versées avant 70 ans (art. 990 I CGI).
                  </p>
                )}
                <p>
                  <span className="font-medium text-navy-800">Démembrement</span> — Donner la nue-propriété d'un bien réduit l'assiette taxable selon l'âge du donateur.
                </p>
                {montant > 500_000 && (
                  <p>
                    <span className="font-medium text-navy-800">Pacte Dutreil</span> — Transmission d'entreprise : exonération jusqu'à 75% de la valeur des titres.
                  </p>
                )}
              </div>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[11px] text-navy-300 leading-relaxed mt-6">
              Simulation indicative basée sur le barème fiscal en vigueur et la dévolution légale.
              Ne constitue pas un conseil fiscal ou juridique.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
