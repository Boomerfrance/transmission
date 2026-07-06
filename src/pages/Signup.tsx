import { Link } from 'react-router-dom'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="bg-white rounded-2xl shadow-xl shadow-navy-900/5 border border-navy-100/60 p-8">
      <div className="text-center mb-8">
        <h1 className="font-serif text-2xl font-bold text-navy-900 mb-2">Créer votre espace</h1>
        <p className="text-navy-500 text-sm">Commencez à préparer la transmission familiale</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          // TODO: API call
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Nom complet</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-navy-700 mb-1.5">Mot de passe</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
              className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500/20 focus:border-navy-400 transition-colors"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-navy-800 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-navy-700 transition-colors mt-6 group"
        >
          Créer mon espace
          <ArrowRight size={15} className="group-hover:translate-x-0.5 transition-transform" />
        </button>
      </form>

      <p className="text-center text-sm text-navy-500 mt-6">
        Déjà un compte ?{' '}
        <Link to="/connexion" className="font-medium text-navy-700 hover:text-navy-900">
          Se connecter
        </Link>
      </p>

      <p className="text-center text-xs text-navy-400 mt-4">
        En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
      </p>
    </div>
  )
}
