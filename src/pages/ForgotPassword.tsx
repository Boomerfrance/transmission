import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { auth } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await auth.forgotPassword(email)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur. Réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-navy-900/5 border border-navy-100/60 p-8 text-center">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Email envoyé</h1>
        <p className="text-navy-500 text-sm mb-6">
          Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un lien de réinitialisation.
        </p>
        <p className="text-navy-400 text-xs mb-6">
          Vérifiez vos spams si vous ne voyez rien dans votre boîte de réception.
        </p>
        <Link to="/connexion" className="text-sm font-medium text-navy-700 hover:text-navy-900">
          ← Retour à la connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-navy-900/5 border border-navy-100/60 p-8">
      <div className="text-center mb-8">
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Mot de passe oublié</h1>
        <p className="text-navy-500 text-sm">Entrez votre email pour recevoir un lien de réinitialisation</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.fr" required
              className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-navy-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-navy-700 transition-colors mt-6 group disabled:opacity-60">
          {loading ? 'Envoi...' : 'Envoyer le lien'}
          {!loading && <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />}
        </button>
      </form>

      <p className="text-center text-sm text-navy-500 mt-6">
        <Link to="/connexion" className="font-medium text-navy-700 hover:text-navy-900 flex items-center justify-center gap-1">
          <ArrowLeft size={14} /> Retour à la connexion
        </Link>
      </p>
    </div>
  )
}
