import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50/40">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-serif font-bold text-lg">T</span>
          </div>
          <p className="text-navy-500 text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/connexion" replace />
  }

  return <Outlet />
}
