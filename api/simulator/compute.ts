import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * POST /api/simulator/compute
 * Compute inheritance tax (droits de succession) based on French tax code.
 *
 * Body: { montant: number, relationship: string, nbHeritiers: number }
 */

type Relationship = 'conjoint' | 'enfant' | 'frere_soeur' | 'neveu_niece' | 'autre'

const ABATTEMENTS: Record<Relationship, number> = {
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

function computeDroits(montant: number, relationship: Relationship) {
  if (relationship === 'conjoint') {
    return { abattement: montant, assietteTaxable: 0, droits: 0, tauxEffectif: 0 }
  }

  const abattement = ABATTEMENTS[relationship] || 1_594
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

  const tauxForfaitaire =
    relationship === 'frere_soeur' ? 0.35 : relationship === 'neveu_niece' ? 0.55 : 0.60

  const droits = Math.round(assietteTaxable * tauxForfaitaire)
  return {
    abattement,
    assietteTaxable,
    droits,
    tauxEffectif: montant > 0 ? (droits / montant) * 100 : 0,
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { montant, relationship, nbHeritiers = 1 } = req.body

  if (!montant || !relationship) {
    return res.status(400).json({ error: 'montant and relationship are required' })
  }

  const partParHeritier = montant / nbHeritiers
  const result = computeDroits(partParHeritier, relationship as Relationship)

  return res.status(200).json({
    ...result,
    montantTotal: montant,
    partParHeritier,
    nbHeritiers,
    droitsTotal: result.droits * nbHeritiers,
  })
}
