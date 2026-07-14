import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function Signup() {
  const { signup, loading, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/tableau-de-bord', { replace: true })
    } else if (!loading) {
      signup()
    }
  }, [loading, signup, user, navigate])

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
        <span className="text-white text-[11px] font-semibold tracking-tight">LF</span>
      </div>
      <p className="text-navy-500 text-sm">Redirection vers la page d'inscription…</p>
    </div>
  )
}
