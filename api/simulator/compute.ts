import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * POST /api/simulator/compute
 * Compute inheritance tax (droits de succession) based on French tax code.
 *
 * Body: {
 *   montant: number,
 *   hasConjoint: boolean,
 *   nbEnfants: number,
 *   conjointOption: 'pleine_propriete' | 'usufruit',
 *   conjointAge?: number,
 *   otherHeirs: { type: string, count: number }[]
 * }
 */

type HeirType = 'conjoint' | 'enfant' | 'frere_soeur' | 'neveu_niece' | 'autre'

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

function getUsufruitRate(age: number): number {
  for (const [maxAge, rate] of USUFRUIT_BY_AGE) {
    if (age <= maxAge) return rate
  }
  return 0.10
}

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

  const abattement = ABATTEMENTS[type] || 1_594
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

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    montant,
    hasConjoint = false,
    nbEnfants = 0,
    conjointOption = 'pleine_propriete',
    conjointAge = 65,
    otherHeirs = [],
  } = req.body

  if (!montant || montant <= 0) {
    return res.status(400).json({ error: 'montant is required and must be positive' })
  }

  const results: any[] = []
  const totalOthers = otherHeirs.reduce((s: number, h: any) => s + (h.count || 0), 0)

  // Determine shares
  let conjointShare = 0
  let childrenTotalShare = 0
  let othersPool = 0

  if (hasConjoint && nbEnfants > 0) {
    if (conjointOption === 'pleine_propriete') {
      conjointShare = montant * 0.25
      childrenTotalShare = montant * 0.75
    } else {
      const usufruitRate = getUsufruitRate(conjointAge)
      conjointShare = montant * usufruitRate
      childrenTotalShare = montant * (1 - usufruitRate)
    }
  } else if (hasConjoint && nbEnfants === 0 && totalOthers > 0) {
    conjointShare = montant * 0.50
    othersPool = montant * 0.50
  } else if (hasConjoint) {
    conjointShare = montant
  } else if (nbEnfants > 0) {
    childrenTotalShare = montant
  } else {
    othersPool = montant
  }

  if (hasConjoint) {
    const tax = computeHeirTax(conjointShare, 'conjoint')
    results.push({ label: 'Conjoint / PACS', type: 'conjoint', part: conjointShare, count: 1, ...tax, droitsTotal: 0 })
  }

  if (nbEnfants > 0 && childrenTotalShare > 0) {
    const partParEnfant = childrenTotalShare / nbEnfants
    const tax = computeHeirTax(partParEnfant, 'enfant')
    results.push({ label: `Enfants (×${nbEnfants})`, type: 'enfant', part: partParEnfant, count: nbEnfants, ...tax, droitsTotal: tax.droits * nbEnfants })
  }

  if (totalOthers > 0 && othersPool > 0) {
    const partParAutre = othersPool / totalOthers
    for (const heir of otherHeirs) {
      if (!heir.count || heir.count <= 0) continue
      const tax = computeHeirTax(partParAutre, heir.type as HeirType)
      results.push({ label: `${heir.type} (×${heir.count})`, type: heir.type, part: partParAutre, count: heir.count, ...tax, droitsTotal: tax.droits * heir.count })
    }
  }

  const totalDroits = results.reduce((s: number, r: any) => s + r.droitsTotal, 0)

  return res.status(200).json({
    montant,
    results,
    totalDroits,
    netTransmis: montant - totalDroits,
    tauxEffectifGlobal: montant > 0 ? (totalDroits / montant) * 100 : 0,
  })
}
