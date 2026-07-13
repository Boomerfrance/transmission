import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Shield,
  Users,
  FileText,
  Calculator,
  ChevronRight,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

export default function Landing() {
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
              <a href="#fonctionnalites" className="text-sm text-navy-600 hover:text-navy-800 transition-colors">Fonctionnalités</a>
              <a href="#comment-ca-marche" className="text-sm text-navy-600 hover:text-navy-800 transition-colors">Comment ça marche</a>
              <Link to="/simulateur" className="text-sm text-navy-600 hover:text-navy-800 transition-colors">Simulateur</Link>
              <Link to="/blog" className="text-sm text-navy-600 hover:text-navy-800 transition-colors">Blog & FAQ</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/connexion"
                className="text-sm font-medium text-navy-600 hover:text-navy-800 transition-colors"
              >
                Connexion
              </Link>
              <Link
                to="/inscription"
                className="text-sm font-medium bg-navy-800 text-white px-4 py-2 rounded-lg hover:bg-navy-700 transition-colors shadow-sm"
              >
                Commencer
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-50/50 via-transparent to-transparent" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-gold-200/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-navy-200/15 rounded-full blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 lg:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-50 border border-gold-200/60 text-gold-700 text-xs font-medium mb-6">
              <Sparkles size={14} />
              Plateforme de gouvernance familiale
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-navy-900 leading-[1.1] mb-6">
              Préparez la transmission
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-600 to-navy-400">
                de votre patrimoine
              </span>
              <br />
              en famille.
            </h1>

            <p className="text-lg sm:text-xl text-navy-500 leading-relaxed mb-8 max-w-2xl">
              Anticipez, organisez et alignez votre famille avant d'aller chez le notaire.
              Lègue Facile vous guide pas à pas pour préparer sereinement l'avenir de votre patrimoine.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-12">
              <Link
                to="/simulateur"
                className="inline-flex items-center justify-center gap-2 bg-navy-800 text-white px-6 py-3.5 rounded-xl font-medium hover:bg-navy-700 transition-all shadow-lg shadow-navy-900/10 group"
              >
                <Calculator size={18} />
                Simuler mes droits de succession
                <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/inscription"
                className="inline-flex items-center justify-center gap-2 bg-white text-navy-700 px-6 py-3.5 rounded-xl font-medium border border-navy-200 hover:border-navy-300 hover:bg-navy-50/50 transition-all"
              >
                Créer mon espace famille
                <ChevronRight size={16} />
              </Link>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-6 text-sm text-navy-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-green-500" />
                <span>100% confidentiel</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-green-500" />
                <span>Aucun conseil juridique</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={15} className="text-green-500" />
                <span>Gratuit pour commencer</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats banner */}
      <section className="bg-navy-800 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="font-serif text-3xl font-bold text-white mb-1">9 000 Md€</div>
              <div className="text-navy-300 text-sm">de patrimoine à transmettre en France</div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-white mb-1">60%</div>
              <div className="text-navy-300 text-sm">des familles ne préparent pas leur succession</div>
            </div>
            <div>
              <div className="font-serif text-3xl font-bold text-white mb-1">45%</div>
              <div className="text-navy-300 text-sm">de droits de succession au-delà de 1,8 M€</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="fonctionnalites" className="py-20 lg:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Tout ce dont votre famille a besoin
            </h2>
            <p className="text-navy-500 text-lg max-w-2xl mx-auto">
              Des outils simples et puissants pour préparer votre transmission patrimoniale en toute sérénité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Calculator,
                title: 'Simulateur fiscal',
                desc: 'Estimez vos droits de succession et explorez les scénarios de donation en quelques clics.',
                color: 'bg-blue-50 text-blue-600',
              },
              {
                icon: Users,
                title: 'Canvas familial',
                desc: 'Alignez votre famille autour d\'un questionnaire structuré sur vos valeurs et souhaits.',
                color: 'bg-emerald-50 text-emerald-600',
              },
              {
                icon: FileText,
                title: 'Dossier Notaire',
                desc: 'Générez un dossier structuré et complet pour arriver préparé chez votre notaire.',
                color: 'bg-amber-50 text-amber-600',
              },
              {
                icon: Shield,
                title: 'Confidentialité',
                desc: 'Vos données patrimoniales restent privées. Hébergement sécurisé, chiffrement de bout en bout.',
                color: 'bg-purple-50 text-purple-600',
              },
            ].map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="group p-6 rounded-2xl border border-navy-100/60 hover:border-navy-200 hover:shadow-lg hover:shadow-navy-100/30 transition-all bg-white"
              >
                <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-navy-800 mb-2">{title}</h3>
                <p className="text-navy-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="comment-ca-marche" className="py-20 lg:py-28 bg-navy-50/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 mb-4">
              Comment ça marche
            </h2>
            <p className="text-navy-500 text-lg max-w-2xl mx-auto">
              En 4 étapes simples, préparez votre famille à la transmission patrimoniale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Simulez',
                desc: 'Estimez gratuitement vos droits de succession avec notre simulateur fiscal.',
              },
              {
                step: '02',
                title: 'Cartographiez',
                desc: 'Inventoriez votre patrimoine : immobilier, financier, professionnel.',
              },
              {
                step: '03',
                title: 'Alignez',
                desc: 'Complétez le Canvas Familial pour identifier les souhaits de chacun.',
              },
              {
                step: '04',
                title: 'Préparez',
                desc: 'Générez votre Dossier Notaire et arrivez préparé au rendez-vous.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative">
                <div className="text-5xl font-serif font-bold text-navy-200/60 mb-3">{step}</div>
                <h3 className="font-semibold text-navy-800 text-lg mb-2">{title}</h3>
                <p className="text-navy-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 px-8 py-16 sm:px-16 text-center overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gold-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-navy-400/10 rounded-full blur-3xl" />

            <div className="relative">
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
                Commencez dès aujourd'hui
              </h2>
              <p className="text-navy-300 text-lg max-w-xl mx-auto mb-8">
                Rejoignez les familles qui anticipent leur avenir patrimonial.
                Le simulateur est gratuit, sans engagement.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/simulateur"
                  className="inline-flex items-center gap-2 bg-white text-navy-800 px-6 py-3.5 rounded-xl font-medium hover:bg-navy-50 transition-colors shadow-lg"
                >
                  <Calculator size={18} />
                  Lancer le simulateur gratuit
                </Link>
                <Link
                  to="/inscription"
                  className="inline-flex items-center gap-2 bg-navy-700/60 text-white px-6 py-3.5 rounded-xl font-medium border border-navy-600/40 hover:bg-navy-700 transition-colors"
                >
                  Créer mon espace
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

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
