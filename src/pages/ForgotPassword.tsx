import { useEffect } from 'react'
import { useAuth } from '../lib/AuthContext'

export default function ForgotPassword() {
  const { login } = useAuth()

  useEffect(() => {
    // Auth0 handles password reset — redirect to Auth0 login
    login()
  }, [login])

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center">
        <span className="text-white text-[11px] font-semibold tracking-tight">LF</span>
      </div>
      <p className="text-navy-500 text-sm">Redirection…</p>
    </div>
  )
}
