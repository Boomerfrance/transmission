import { useState } from 'react'
import {
  FileDown,
  Loader2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import { exportApi, type DossierExport } from '../lib/api'
import { jsPDF } from 'jspdf'

// ── Canvas question labels for the PDF ──

const CANVAS_QUESTIONS: Record<string, string> = {
  'patrimoine-q1': 'Quels sont vos biens les plus importants ?',
  'patrimoine-q2': 'Y a-t-il des biens auxquels vous êtes particulièrement attaché ?',
  'patrimoine-q3': 'Avez-vous des dettes ou emprunts significatifs ?',
  'famille-q1': 'Qui sont les membres de votre famille concernés ?',
  'famille-q2': 'Y a-t-il des situations particulières (handicap, dépendance, conflit) ?',
  'famille-q3': 'Des membres de la famille vivent-ils à l\'étranger ?',
  'souhaits-q1': 'Comment souhaitez-vous répartir votre patrimoine ?',
  'souhaits-q2': 'Avez-vous des souhaits spécifiques pour certains biens ?',
  'souhaits-q3': 'Y a-t-il des conditions ou des délais que vous souhaitez fixer ?',
  'protection-q1': 'Souhaitez-vous protéger votre conjoint en priorité ?',
  'protection-q2': 'Avez-vous pensé à un mandat de protection future ?',
  'protection-q3': 'Souhaitez-vous organiser la gestion en cas d\'incapacité ?',
  'fiscal-q1': 'Avez-vous déjà fait des donations ?',
  'fiscal-q2': 'Connaissez-vous les abattements dont vous pouvez bénéficier ?',
  'fiscal-q3': 'Souhaitez-vous optimiser la fiscalité de la transmission ?',
}

const ASSET_CATEGORIES: Record<string, string> = {
  immobilier: 'Immobilier',
  financier: 'Financier',
  professionnel: 'Professionnel',
  autre: 'Autre',
}

function formatEuro(value: number | string): string {
  const n = typeof value === 'string' ? parseFloat(value) : value
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

export default function ExportDossier() {
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<DossierExport | null>(null)
  const [error, setError] = useState('')

  async function loadPreview() {
    setLoading(true)
    setError('')
    try {
      const data = await exportApi.getDossier()
      setPreview(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement.')
    }
    setLoading(false)
  }

  function generatePDF() {
    if (!preview) return

    const doc = new jsPDF('p', 'mm', 'a4')
    const pageWidth = 210
    const margin = 20
    const contentWidth = pageWidth - 2 * margin
    let y = 20

    function addPage() {
      doc.addPage()
      y = 20
    }

    function checkSpace(needed: number) {
      if (y + needed > 275) addPage()
    }

    // ── Cover page ──
    doc.setFillColor(15, 23, 42) // navy-900
    doc.rect(0, 0, pageWidth, 297, 'F')

    doc.setTextColor(255, 255, 255)
    doc.setFontSize(36)
    doc.setFont('helvetica', 'bold')
    doc.text('TRANSMISSION', pageWidth / 2, 100, { align: 'center' })

    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text('Dossier de préparation patrimoniale', pageWidth / 2, 115, { align: 'center' })

    doc.setFontSize(11)
    doc.setTextColor(200, 200, 200)
    doc.text(`Préparé pour : ${preview.user.name}`, pageWidth / 2, 145, { align: 'center' })
    doc.text(`Famille : ${preview.family.name}`, pageWidth / 2, 153, { align: 'center' })
    doc.text(`Généré le : ${new Date(preview.generatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth / 2, 161, { align: 'center' })

    doc.setFontSize(9)
    doc.setTextColor(150, 150, 150)
    doc.text('Ce document est préparatoire. Il ne constitue pas un conseil juridique ou fiscal.', pageWidth / 2, 250, { align: 'center' })
    doc.text('Consultez un notaire pour toute décision de transmission.', pageWidth / 2, 256, { align: 'center' })

    // ── Page 2: Résumé ──
    addPage()
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(22)
    doc.setFont('helvetica', 'bold')
    doc.text('Résumé du dossier', margin, y)
    y += 15

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const summaryLines = [
      `Patrimoine total : ${formatEuro(preview.patrimoine.total)}`,
      `Biens inventoriés : ${preview.patrimoine.assets.length}`,
      `Questions canvas complétées : ${preview.canvas.length}`,
      `Checklist : ${preview.checklist.completed} / ${preview.checklist.total} (${preview.checklist.progress}%)`,
      `Documents : ${preview.documents.obtained} / ${preview.documents.total} obtenus`,
    ]

    summaryLines.forEach((line) => {
      doc.text(line, margin, y)
      y += 8
    })

    // ── Page 3: Patrimoine ──
    y += 10
    checkSpace(20)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Inventaire du patrimoine', margin, y)
    y += 10

    if (preview.patrimoine.assets.length === 0) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'italic')
      doc.text('Aucun bien enregistré.', margin, y)
      y += 8
    } else {
      // Group by category
      const byCat: Record<string, typeof preview.patrimoine.assets> = {}
      preview.patrimoine.assets.forEach((a) => {
        const cat = a.category
        if (!byCat[cat]) byCat[cat] = []
        byCat[cat].push(a)
      })

      Object.entries(byCat).forEach(([cat, items]) => {
        checkSpace(15)
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(ASSET_CATEGORIES[cat] || cat, margin, y)
        y += 7

        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        items.forEach((asset) => {
          checkSpace(8)
          const label = asset.label.length > 60 ? asset.label.substring(0, 57) + '...' : asset.label
          doc.text(`• ${label}`, margin + 4, y)
          doc.text(formatEuro(asset.value), pageWidth - margin, y, { align: 'right' })
          y += 6
          if (asset.notes) {
            doc.setFontSize(9)
            doc.setTextColor(100, 100, 100)
            const noteLines = doc.splitTextToSize(`  ${asset.notes}`, contentWidth - 10)
            noteLines.forEach((line: string) => {
              checkSpace(5)
              doc.text(line, margin + 8, y)
              y += 4.5
            })
            doc.setFontSize(10)
            doc.setTextColor(15, 23, 42)
          }
        })

        const catTotal = items.reduce((s, a) => s + parseFloat(a.value as string), 0)
        checkSpace(8)
        doc.setFont('helvetica', 'bold')
        doc.text(`Sous-total : ${formatEuro(catTotal)}`, pageWidth - margin, y, { align: 'right' })
        y += 10
        doc.setFont('helvetica', 'normal')
      })

      checkSpace(10)
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`TOTAL PATRIMOINE : ${formatEuro(preview.patrimoine.total)}`, pageWidth - margin, y, { align: 'right' })
      y += 12
    }

    // ── Canvas answers ──
    checkSpace(30)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Canvas familial', margin, y)
    y += 10

    if (preview.canvas.length === 0) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'italic')
      doc.text('Aucune réponse enregistrée.', margin, y)
      y += 8
    } else {
      preview.canvas.forEach((ca) => {
        const qKey = `${ca.sectionId}-${ca.questionId}`
        const question = CANVAS_QUESTIONS[qKey] || qKey
        checkSpace(18)

        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(question, margin, y)
        y += 5.5

        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const lines = doc.splitTextToSize(ca.answer, contentWidth)
        lines.forEach((line: string) => {
          checkSpace(5)
          doc.text(line, margin + 4, y)
          y += 5
        })
        y += 3
      })
    }

    // ── Checklist ──
    checkSpace(30)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('Checklist de préparation', margin, y)
    y += 10

    preview.checklist.items.forEach((item) => {
      checkSpace(8)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const check = item.isCompleted ? '☑' : '☐'
      const text = `${check} ${item.title}`
      doc.text(text, margin, y)
      y += 6
    })

    // ── Documents status ──
    y += 8
    checkSpace(30)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('État des documents', margin, y)
    y += 10

    if (preview.documents.items.length === 0) {
      doc.setFontSize(11)
      doc.setFont('helvetica', 'italic')
      doc.text('Aucun document suivi.', margin, y)
    } else {
      const statusLabels: Record<string, string> = {
        obtenu: '✓ Obtenu',
        en_cours: '⟳ En cours',
        a_fournir: '✗ À fournir',
      }
      preview.documents.items.forEach((docItem) => {
        checkSpace(7)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'normal')
        const status = statusLabels[docItem.status] || docItem.status
        doc.text(`${status} — ${docItem.name}`, margin, y)
        y += 6
      })
    }

    // ── Footer on last page ──
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      'Transmission — Plateforme de gouvernance familiale patrimoniale — transmission.fr',
      pageWidth / 2,
      290,
      { align: 'center' }
    )

    // Download
    doc.save(`Dossier_Transmission_${preview.family.name.replace(/\s+/g, '_')}.pdf`)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900 mb-1">
            Dossier Notaire 📋
          </h1>
          <p className="text-navy-500 text-sm">
            Exportez une synthèse complète à présenter lors de votre rendez-vous notaire.
          </p>
        </div>
      </div>

      {/* Action card */}
      <div className="bg-white rounded-2xl border border-navy-100/60 shadow-sm p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-navy-100 flex items-center justify-center flex-shrink-0">
            <FileText size={24} className="text-navy-600" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-navy-800 mb-1">Générer votre dossier PDF</h2>
            <p className="text-sm text-navy-500 mb-4">
              Le dossier comprend : inventaire du patrimoine, canvas familial, checklist de préparation et état des documents.
            </p>
            <div className="flex flex-wrap gap-3">
              {!preview ? (
                <button
                  onClick={loadPreview}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                  {loading ? 'Chargement...' : 'Aperçu du dossier'}
                </button>
              ) : (
                <>
                  <button
                    onClick={generatePDF}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    <FileDown size={16} />
                    Télécharger le PDF
                  </button>
                  <button
                    onClick={loadPreview}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-navy-600 border border-navy-200 rounded-lg hover:bg-navy-50 disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                    Actualiser
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 mb-6">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-navy-100/60 p-4">
              <div className="text-xs text-navy-500 mb-1">Patrimoine total</div>
              <div className="text-xl font-bold text-navy-800">{formatEuro(preview.patrimoine.total)}</div>
            </div>
            <div className="bg-white rounded-xl border border-navy-100/60 p-4">
              <div className="text-xs text-navy-500 mb-1">Biens</div>
              <div className="text-xl font-bold text-navy-800">{preview.patrimoine.assets.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-navy-100/60 p-4">
              <div className="text-xs text-navy-500 mb-1">Checklist</div>
              <div className="text-xl font-bold text-navy-800">{preview.checklist.progress}%</div>
            </div>
            <div className="bg-white rounded-xl border border-navy-100/60 p-4">
              <div className="text-xs text-navy-500 mb-1">Documents</div>
              <div className="text-xl font-bold text-navy-800">{preview.documents.obtained} / {preview.documents.total}</div>
            </div>
          </div>

          {/* Patrimoine preview */}
          <div className="bg-white rounded-xl border border-navy-100/60 p-5">
            <h3 className="font-semibold text-navy-800 mb-3">📊 Patrimoine</h3>
            {preview.patrimoine.assets.length === 0 ? (
              <p className="text-sm text-navy-400 italic">Aucun bien enregistré.</p>
            ) : (
              <div className="space-y-2">
                {preview.patrimoine.assets.map((a) => (
                  <div key={a.id} className="flex justify-between text-sm">
                    <span className="text-navy-600">{a.label}</span>
                    <span className="font-medium text-navy-800">{formatEuro(a.value)}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-navy-100 flex justify-between text-sm font-bold">
                  <span className="text-navy-800">Total</span>
                  <span className="text-navy-800">{formatEuro(preview.patrimoine.total)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Checklist preview */}
          <div className="bg-white rounded-xl border border-navy-100/60 p-5">
            <h3 className="font-semibold text-navy-800 mb-3">
              ✅ Checklist ({preview.checklist.completed}/{preview.checklist.total})
            </h3>
            <div className="space-y-1.5">
              {preview.checklist.items.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 size={14} className={item.isCompleted ? 'text-green-500' : 'text-navy-200'} />
                  <span className={item.isCompleted ? 'text-navy-400 line-through' : 'text-navy-700'}>
                    {item.title}
                  </span>
                </div>
              ))}
              {preview.checklist.items.length > 8 && (
                <p className="text-xs text-navy-400 pl-6">
                  + {preview.checklist.items.length - 8} autres étapes...
                </p>
              )}
            </div>
          </div>

          {/* Documents preview */}
          <div className="bg-white rounded-xl border border-navy-100/60 p-5">
            <h3 className="font-semibold text-navy-800 mb-3">
              📄 Documents ({preview.documents.obtained}/{preview.documents.total} obtenus)
            </h3>
            {preview.documents.items.length === 0 ? (
              <p className="text-sm text-navy-400 italic">Aucun document suivi.</p>
            ) : (
              <div className="space-y-1.5">
                {preview.documents.items.map((d) => {
                  const statusStyle =
                    d.status === 'obtenu' ? 'text-green-600' :
                    d.status === 'en_cours' ? 'text-blue-600' :
                    'text-amber-600'
                  const statusLabel =
                    d.status === 'obtenu' ? '✓' :
                    d.status === 'en_cours' ? '⟳' : '✗'
                  return (
                    <div key={d.id} className="flex items-center gap-2 text-sm">
                      <span className={statusStyle}>{statusLabel}</span>
                      <span className="text-navy-700">{d.name}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Ce dossier est un outil de préparation. Il ne constitue en aucun cas un conseil juridique ou fiscal.
                Consultez impérativement un notaire pour toute décision relative à votre transmission patrimoniale.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
