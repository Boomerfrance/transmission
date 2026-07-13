import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calculator,
  Scale,
  Landmark,
  HelpCircle,
  Lightbulb,
  BookOpen,
  Clock,
} from 'lucide-react'
import { blog, type BlogArticleFull } from '../lib/api'

const categoryConfig: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
  fiscalite: { label: 'Fiscalité', icon: Calculator, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  juridique: { label: 'Juridique', icon: Scale, color: 'bg-red-50 text-red-600 border-red-100' },
  patrimoine: { label: 'Patrimoine', icon: Landmark, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  pratique: { label: 'Pratique', icon: Lightbulb, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  faq: { label: 'FAQ', icon: HelpCircle, color: 'bg-purple-50 text-purple-600 border-purple-100' },
}

/** Simple Markdown-to-HTML renderer for article content */
function renderMarkdown(md: string): string {
  return md
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="font-serif text-xl font-semibold text-navy-800 mt-8 mb-3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-serif text-2xl font-bold text-navy-800 mt-10 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-serif text-3xl font-bold text-navy-900 mt-10 mb-4">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-navy-800">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Bullet lists
    .replace(/^[•·] (.+)$/gm, '<li class="ml-4 pl-2 text-navy-600 leading-relaxed">$1</li>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 pl-2 text-navy-600 leading-relaxed">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li[^>]*>.*?<\/li>\n?)+)/g, '<ul class="list-disc space-y-1.5 my-4">$1</ul>')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-navy-200 pl-4 py-2 my-4 text-navy-600 italic bg-navy-50/50 rounded-r-lg">$1</blockquote>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-8 border-navy-100" />')
    // Tables (basic support)
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      if (cells.every(c => /^[\s-:]+$/.test(c))) return '' // separator row
      const isHeader = false
      const tag = isHeader ? 'th' : 'td'
      return `<tr>${cells.map(c => `<${tag} class="px-4 py-2 border border-navy-100 text-sm">${c.trim()}</${tag}>`).join('')}</tr>`
    })
    // Paragraphs
    .replace(/^(?!<[a-z])((?!^\s*$).+)$/gm, '<p class="text-navy-600 leading-relaxed my-3">$1</p>')
    // Clean up empty lines
    .replace(/\n{3,}/g, '\n\n')
}

export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<BlogArticleFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return
    blog.get(slug)
      .then(setArticle)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [slug])

  const cfg = article ? (categoryConfig[article.category] || categoryConfig.pratique) : null
  const Icon = cfg?.icon || BookOpen

  // Estimate reading time (~200 words/min for French)
  const readingTime = article ? Math.max(1, Math.ceil(article.content.split(/\s+/).length / 200)) : 0

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-navy-100/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center">
                <span className="text-white text-[11px] font-semibold tracking-tight">LF</span>
              </div>
              <span className="font-serif text-navy-800 text-lg">Lègue Facile</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/connexion" className="text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors">Connexion</Link>
              <Link to="/inscription" className="text-sm font-medium bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors shadow-sm">Commencer</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 mb-8 transition-colors">
          <ArrowLeft size={14} />
          Retour au blog
        </Link>

        {loading && (
          <div className="animate-pulse">
            <div className="h-8 w-32 bg-navy-100 rounded mb-6" />
            <div className="h-10 w-3/4 bg-navy-100 rounded mb-4" />
            <div className="h-5 w-1/2 bg-navy-50 rounded mb-8" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-4 bg-navy-50 rounded" style={{ width: `${90 - i * 5}%` }} />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-16">
            <BookOpen size={48} className="mx-auto text-navy-300 mb-4" />
            <h3 className="text-lg font-medium text-navy-700 mb-2">Article introuvable</h3>
            <p className="text-navy-500 mb-6">Cet article n'existe pas ou a été retiré.</p>
            <Link to="/blog" className="text-sm font-medium text-navy-600 hover:text-navy-800">
              ← Retour au blog
            </Link>
          </div>
        )}

        {article && cfg && (
          <>
            {/* Category + meta */}
            <div className="flex items-center gap-3 mb-4">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${cfg.color}`}>
                <Icon size={12} />
                {cfg.label}
              </span>
              <span className="flex items-center gap-1 text-xs text-navy-400">
                <Clock size={12} />
                {readingTime} min de lecture
              </span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 leading-tight mb-4">
              {article.title}
            </h1>

            {/* Summary */}
            <p className="text-lg text-navy-500 leading-relaxed mb-2">
              {article.summary}
            </p>

            {/* Author + date */}
            <div className="flex items-center gap-3 text-sm text-navy-400 mb-10 pb-8 border-b border-navy-100">
              <span>Par {article.authorName}</span>
              <span>·</span>
              <span>
                {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric', month: 'long', year: 'numeric'
                })}
              </span>
            </div>

            {/* Content */}
            <article
              className="prose-transmission"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
            />

            {/* CTA */}
            <div className="mt-12 p-8 rounded-2xl bg-navy-50/60 border border-navy-100 text-center">
              <h3 className="font-serif text-xl font-semibold text-navy-800 mb-2">
                Prêt à préparer votre transmission ?
              </h3>
              <p className="text-navy-500 text-sm mb-6">
                Utilisez notre simulateur gratuit pour estimer vos droits de succession.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/simulateur"
                  className="inline-flex items-center gap-2 bg-navy-800 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-navy-700 transition-colors"
                >
                  <Calculator size={16} />
                  Lancer le simulateur
                </Link>
                <Link
                  to="/inscription"
                  className="inline-flex items-center gap-2 bg-white text-navy-700 px-5 py-2.5 rounded-lg font-medium text-sm border border-navy-200 hover:border-navy-300 transition-colors"
                >
                  Créer mon espace famille
                </Link>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-navy-100 py-12 mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-navy-900 flex items-center justify-center">
                <span className="text-white text-[10px] font-semibold tracking-tight">LF</span>
              </div>
              <span className="font-serif font-medium text-navy-700">Lègue Facile</span>
            </div>
            <p className="text-sm text-navy-400">
              © 2026 Lègue Facile. Plateforme d'aide à la préparation — ne constitue pas un conseil juridique ou fiscal.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
