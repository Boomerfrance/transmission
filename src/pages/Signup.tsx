import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function Signup() {
  const { signup, loading } = useAuth()

  useEffect(() => {
    if (!loading) signup()
  }, [loading, signup])

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
        <span className="text-white text-[11px] font-semibold tracking-tight">LF</span>
      </div>
      <p className="text-navy-500 text-sm">Redirection vers la page d'inscription…</p>
    </div>
  )
}
