import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { auth } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3
  const strengthLabels = ['', 'Faible', 'Moyen', 'Bon', 'Fort']
  const strengthColors = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-500']

  if (!token) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-navy-900/5 border border-navy-100/60 p-8 text-center">
        <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Lien invalide</h1>
        <p className="text-navy-500 text-sm mb-6">Ce lien de réinitialisation est invalide ou a expiré.</p>
        <Link to="/mot-de-passe-oublie" className="text-sm font-medium bg-navy-800 text-white px-5 py-2.5 rounded-lg hover:bg-navy-700 transition-colors inline-block">
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="bg-white rounded-2xl shadow-xl shadow-navy-900/5 border border-navy-100/60 p-8 text-center">
        <CheckCircle2 size={48} className="mx-auto text-emerald-500 mb-4" />
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Mot de passe mis à jour</h1>
        <p className="text-navy-500 text-sm mb-6">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <button onClick={() => navigate('/connexion')}
          className="text-sm font-medium bg-navy-800 text-white px-5 py-2.5 rounded-lg hover:bg-navy-700 transition-colors">
          Se connecter
        </button>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas.')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit faire au moins 8 caractères.')
      return
    }
    setLoading(true)
    try {
      await auth.resetPassword(token, password)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur. Le lien a peut-être expiré.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-navy-900/5 border border-navy-100/60 p-8">
      <div className="text-center mb-8">
        <ShieldCheck size={40} className="mx-auto text-navy-400 mb-3" />
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Nouveau mot de passe</h1>
        <p className="text-navy-500 text-sm">Choisissez un mot de passe sécurisé</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Nouveau mot de passe</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 caractères minimum" required
              className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors" />
          </div>
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : 'bg-navy-100'}`} />
                ))}
              </div>
              <p className={`text-xs ${strength <= 1 ? 'text-red-500' : strength === 2 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {strengthLabels[strength]}
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Confirmer</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Répétez le mot de passe" required
              className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors" />
          </div>
          {confirm.length > 0 && password !== confirm && (
            <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
          )}
        </div>
        <button type="submit" disabled={loading || password.length < 8 || password !== confirm}
          className="w-full flex items-center justify-center gap-2 bg-navy-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-navy-700 transition-colors mt-6 group disabled:opacity-60">
          {loading ? 'Mise à jour...' : 'Réinitialiser le mot de passe'}
          {!loading && <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />}
        </button>
      </form>
    </div>
  )
}
