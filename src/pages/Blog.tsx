import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  ArrowRight,
  Calculator,
  Scale,
  Landmark,
  HelpCircle,
  Lightbulb,
  ArrowLeft,
} from 'lucide-react'
import { blog, type BlogArticle } from '../lib/api'

const categoryConfig: Record<string, { label: string; icon: typeof BookOpen; color: string }> = {
  fiscalite: { label: 'Fiscalité', icon: Calculator, color: 'bg-blue-50 text-blue-600 border-blue-100' },
  juridique: { label: 'Juridique', icon: Scale, color: 'bg-red-50 text-red-600 border-red-100' },
  patrimoine: { label: 'Patrimoine', icon: Landmark, color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  pratique: { label: 'Pratique', icon: Lightbulb, color: 'bg-amber-50 text-amber-600 border-amber-100' },
  faq: { label: 'FAQ', icon: HelpCircle, color: 'bg-purple-50 text-purple-600 border-purple-100' },
}

export default function Blog() {
  const [articles, setArticles] = useState<BlogArticle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  useEffect(() => {
    blog.list()
      .then(setArticles)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const categories = [...new Set(articles.map(a => a.category))]
  const filtered = activeCategory
    ? articles.filter(a => a.category === activeCategory)
    : articles

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-navy-100/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                <span className="text-white font-serif font-bold text-sm">LF</span>
              </div>
              <span className="font-serif font-bold text-navy-800 text-lg">Lègue Facile</span>
            </Link>
            <div className="hidden md:flex items-center gap-8">
              <Link to="/" className="text-sm text-navy-600 hover:text-navy-800 transition-colors">Accueil</Link>
              <Link to="/simulateur" className="text-sm text-navy-600 hover:text-navy-800 transition-colors">Simulateur</Link>
              <span className="text-sm text-navy-800 font-medium">Blog & FAQ</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/connexion" className="text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors">Connexion</Link>
              <Link to="/inscription" className="text-sm font-medium bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors shadow-sm">Commencer</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-50/50 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 mb-6 transition-colors">
            <ArrowLeft size={14} />
            Retour à l'accueil
          </Link>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4">
            Blog & FAQ
          </h1>
          <p className="text-lg text-navy-500 max-w-2xl">
            Guides pratiques, analyses fiscales et réponses à vos questions sur la transmission patrimoniale en France.
          </p>
        </div>
      </section>

      {/* Category filters */}
      {categories.length > 1 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                !activeCategory
                  ? 'bg-navy-800 text-white border-navy-800'
                  : 'bg-white text-navy-600 border-navy-200 hover:border-navy-300'
              }`}
            >
              Tous
            </button>
            {categories.map(cat => {
              const cfg = categoryConfig[cat] || categoryConfig.pratique
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    activeCategory === cat
                      ? 'bg-navy-800 text-white border-navy-800'
                      : `bg-white text-navy-600 border-navy-200 hover:border-navy-300`
                  }`}
                >
                  {cfg.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Articles grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-navy-100 p-6 animate-pulse">
                <div className="h-6 w-20 bg-navy-100 rounded mb-4" />
                <div className="h-6 w-3/4 bg-navy-100 rounded mb-3" />
                <div className="h-4 w-full bg-navy-50 rounded mb-2" />
                <div className="h-4 w-2/3 bg-navy-50 rounded" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="mx-auto text-navy-300 mb-4" />
            <h3 className="text-lg font-medium text-navy-700 mb-2">Aucun article pour le moment</h3>
            <p className="text-navy-500">Les premiers guides arrivent bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(article => {
              const cfg = categoryConfig[article.category] || categoryConfig.pratique
              const Icon = cfg.icon
              return (
                <Link
                  key={article.id}
                  to={`/blog/${article.slug}`}
                  className="group rounded-2xl border border-navy-100/60 hover:border-navy-200 hover:shadow-lg hover:shadow-navy-100/30 transition-all bg-white overflow-hidden"
                >
                  <div className="p-6">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${cfg.color} mb-4`}>
                      <Icon size={12} />
                      {cfg.label}
                    </div>
                    <h2 className="font-serif text-xl font-semibold text-navy-800 mb-3 group-hover:text-navy-600 transition-colors leading-tight">
                      {article.title}
                    </h2>
                    <p className="text-navy-500 text-sm leading-relaxed mb-4 line-clamp-3">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-navy-400">
                        {new Date(article.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </span>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-navy-600 group-hover:text-navy-800 transition-colors">
                        Lire
                        <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-navy-100 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
                <span className="text-white font-serif font-bold text-xs">LF</span>
              </div>
              <span className="font-serif font-semibold text-navy-700">Lègue Facile</span>
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
