import { useState, useEffect, useCallback } from 'react'
import { UserPlus, Send, Check, X, Clock, Mail, Users, AlertCircle } from 'lucide-react'
import { invitations as invApi, type Invitation } from '../lib/api'

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

const STATUS_LABELS: Record<string, { label: string; color: string; icon: typeof Check }> = {
  pending: { label: 'En attente', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock },
  accepted: { label: 'Acceptée', color: 'text-green-600 bg-green-50 border-green-200', icon: Check },
  declined: { label: 'Refusée', color: 'text-red-600 bg-red-50 border-red-200', icon: X },
  cancelled: { label: 'Annulée', color: 'text-gray-600 bg-gray-50 border-gray-200', icon: X },
}

export default function Invitations() {
  const [sent, setSent] = useState<Invitation[]>([])
  const [received, setReceived] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const load = useCallback(async () => {
    try {
      const data = await invApi.list()
      setSent(data.sent)
      setReceived(data.received)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setSuccess('')
    setSending(true)

    try {
      await invApi.create(email.trim(), role)
      setEmail('')
      setSuccess('Invitation envoyée avec succès !')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  const handleAccept = async (id: string) => {
    try {
      await invApi.accept(id)
      setSuccess('Invitation acceptée ! Vous avez maintenant accès à l\'espace familial.')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erreur')
    }
  }

  const handleDecline = async (id: string) => {
    try {
      await invApi.decline(id)
      await load()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    }
  }

  const handleCancel = async (id: string) => {
    try {
      await invApi.cancel(id)
      await load()
    } catch (err: any) {
      setError(err.message || 'Erreur')
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-navy-400">Chargement...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif text-navy-800 flex items-center gap-3">
          <UserPlus className="text-gold-500" size={28} />
          Invitations Famille
        </h1>
        <p className="text-navy-500 mt-1">Partagez votre espace avec votre conjoint(e), vos enfants ou d'autres proches</p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><X size={16} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <Check size={18} />
          {success}
        </div>
      )}

      {/* Received invitations */}
      {received.length > 0 && (
        <div className="bg-gold-50 border-2 border-gold-200 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2">
            <Mail className="text-gold-500" size={20} />
            Invitations reçues
          </h2>
          <div className="space-y-3">
            {received.map(inv => (
              <div key={inv.id} className="bg-white rounded-xl border border-gold-200 p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-navy-800">
                    Vous avez été invité(e) à rejoindre un espace familial
                  </p>
                  <p className="text-xs text-navy-400 mt-1">
                    Rôle : {inv.role === 'editor' ? 'Éditeur' : 'Membre'} • Reçue le {formatDate(inv.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleAccept(inv.id)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <Check size={16} /> Accepter
                  </button>
                  <button
                    onClick={() => handleDecline(inv.id)}
                    className="flex items-center gap-1.5 px-4 py-2 border border-navy-200 text-navy-600 rounded-lg hover:bg-navy-50 transition-colors text-sm"
                  >
                    <X size={16} /> Refuser
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Send invitation */}
      <div className="bg-white rounded-2xl border border-navy-100 p-6">
        <h2 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2">
          <Send className="text-navy-500" size={20} />
          Inviter un proche
        </h2>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Email de la personne à inviter"
            className="flex-1 px-4 py-2.5 border border-navy-200 rounded-xl focus:ring-2 focus:ring-navy-300 focus:border-navy-400 outline-none text-sm text-navy-800"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="px-4 py-2.5 border border-navy-200 rounded-xl text-sm text-navy-800 focus:ring-2 focus:ring-navy-300"
          >
            <option value="member">Membre (lecture)</option>
            <option value="editor">Éditeur (lecture + écriture)</option>
          </select>
          <button
            type="submit"
            disabled={sending}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-navy-800 text-white rounded-xl hover:bg-navy-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Send size={16} />
            {sending ? 'Envoi...' : 'Inviter'}
          </button>
        </form>
        <p className="text-xs text-navy-400 mt-3">
          💡 La personne invitée devra créer un compte (ou se connecter) avec cette adresse email pour accepter l'invitation.
        </p>
      </div>

      {/* Sent invitations */}
      <div className="bg-white rounded-2xl border border-navy-100 p-6">
        <h2 className="text-lg font-semibold text-navy-800 mb-4 flex items-center gap-2">
          <Users className="text-navy-500" size={20} />
          Invitations envoyées
          {sent.length > 0 && (
            <span className="text-xs bg-navy-100 text-navy-600 px-2 py-0.5 rounded-full">{sent.length}</span>
          )}
        </h2>
        {sent.length === 0 ? (
          <p className="text-sm text-navy-400 text-center py-6">
            Aucune invitation envoyée pour le moment.
          </p>
        ) : (
          <div className="space-y-2">
            {sent.map(inv => {
              const status = STATUS_LABELS[inv.status] || STATUS_LABELS.pending
              const StatusIcon = status.icon
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 border border-navy-100 rounded-xl hover:bg-navy-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center">
                      <Mail size={16} className="text-navy-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-800">{inv.inviteeEmail}</p>
                      <p className="text-xs text-navy-400">
                        {inv.role === 'editor' ? 'Éditeur' : 'Membre'} • {formatDate(inv.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border font-medium ${status.color}`}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(inv.id)}
                        className="text-xs text-navy-400 hover:text-red-500 transition-colors"
                        title="Annuler l'invitation"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
