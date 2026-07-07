import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Landmark,
  FileText,
  CheckSquare,
  FileDown,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'

const nav = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/patrimoine', label: 'Patrimoine', icon: Landmark },
  { to: '/canvas-familial', label: 'Canvas familial', icon: Users },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/checklist', label: 'Checklist', icon: CheckSquare },
  { to: '/dossier', label: 'Dossier Notaire', icon: FileDown },
  { to: '/blog', label: 'Blog & FAQ', icon: BookOpen },
  { to: '/admin', label: 'Administration', icon: Settings, adminOnly: true },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const handleLogout = () => {
    logout()
    navigate('/connexion')
  }

  return (
    <div className="min-h-screen bg-navy-50/40">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-navy-100">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center">
            <span className="text-white font-serif font-bold text-sm">T</span>
          </div>
          <span className="font-serif font-bold text-navy-800">Transmission</span>
        </Link>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-navy-600">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-navy-100 transform transition-transform lg:translate-x-0 lg:static lg:z-auto
            ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="hidden lg:flex items-center gap-3 px-6 py-5 border-b border-navy-100">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-serif font-bold">T</span>
              </div>
              <div>
                <div className="font-serif font-bold text-navy-800 text-lg leading-tight">Transmission</div>
                <div className="text-[11px] text-navy-400 tracking-wide uppercase">Gouvernance familiale</div>
              </div>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1">
              {nav.filter((item) => !('adminOnly' in item && item.adminOnly) || user?.role === 'admin').map(({ to, label, icon: Icon }) => {
                const active = pathname === to
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${active
                        ? 'bg-navy-800 text-white shadow-sm'
                        : 'text-navy-600 hover:bg-navy-50 hover:text-navy-800'
                      }
                    `}
                  >
                    <Icon size={18} />
                    {label}
                  </Link>
                )
              })}
            </nav>

            {/* Bottom */}
            <div className="px-3 py-4 border-t border-navy-100">
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-navy-600">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-navy-800 truncate">{user?.name || 'Utilisateur'}</div>
                  <div className="text-xs text-navy-400">{user?.role === 'admin' ? 'Administrateur' : 'Membre'}</div>
                </div>
                <button onClick={handleLogout} className="p-1.5 text-navy-400 hover:text-navy-600 transition-colors">
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-black/20 z-20 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Main */}
        <main className="flex-1 min-h-screen lg:min-h-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
