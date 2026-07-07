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
  MessageSquare,
  UserPlus,
  Bell,
  TreePine,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../lib/AuthContext'
import { notifications as notifApi, type Notification } from '../lib/api'

const nav = [
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: LayoutDashboard },
  { to: '/patrimoine', label: 'Patrimoine', icon: Landmark },
  { to: '/canvas-familial', label: 'Canvas familial', icon: Users },
  { to: '/arbre-familial', label: 'Arbre familial', icon: TreePine },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/checklist', label: 'Checklist', icon: CheckSquare },
  { to: '/assistant', label: 'Assistant IA', icon: MessageSquare },
  { to: '/invitations', label: 'Invitations', icon: UserPlus },
  { to: '/dossier', label: 'Dossier Notaire', icon: FileDown },
  { to: '/blog', label: 'Blog & FAQ', icon: BookOpen },
  { to: '/admin', label: 'Administration', icon: Settings, adminOnly: true },
]

export default function Layout() {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState<Notification[]>([])

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '??'

  const handleLogout = () => {
    logout()
    navigate('/connexion')
  }

  const loadUnread = useCallback(async () => {
    try {
      const data = await notifApi.unreadCount()
      setUnreadCount(data.count)
    } catch { /* ignore */ }
  }, [])

  const loadNotifs = useCallback(async () => {
    try {
      const data = await notifApi.list()
      setNotifs(data)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    loadUnread()
    const interval = setInterval(loadUnread, 30000)
    return () => clearInterval(interval)
  }, [loadUnread])

  const openNotifs = async () => {
    setShowNotifs(!showNotifs)
    if (!showNotifs) {
      await loadNotifs()
    }
  }

  const markAllRead = async () => {
    try {
      await notifApi.markAllRead()
      setUnreadCount(0)
      setNotifs(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch { /* ignore */ }
  }

  const handleNotifClick = async (notif: Notification) => {
    if (!notif.isRead) {
      await notifApi.markRead(notif.id)
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifs(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n))
    }
    if (notif.linkTo) {
      navigate(notif.linkTo)
      setShowNotifs(false)
    }
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
        <div className="flex items-center gap-2">
          {/* Mobile notification bell */}
          <button onClick={openNotifs} className="relative p-2 text-navy-600">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-navy-600">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
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
            <div className="hidden lg:flex items-center justify-between px-6 py-5 border-b border-navy-100">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-navy-800 to-navy-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-serif font-bold">T</span>
                </div>
                <div>
                  <div className="font-serif font-bold text-navy-800 text-lg leading-tight">Transmission</div>
                  <div className="text-[11px] text-navy-400 tracking-wide uppercase">Gouvernance familiale</div>
                </div>
              </Link>
              {/* Desktop notification bell */}
              <button onClick={openNotifs} className="relative p-1.5 text-navy-400 hover:text-navy-600 transition-colors">
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
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

        {/* Notification dropdown */}
        {showNotifs && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
            <div className="fixed top-14 right-4 lg:left-52 lg:top-14 lg:right-auto z-50 w-80 max-h-96 bg-white rounded-2xl border border-navy-100 shadow-xl overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-navy-100">
                <h3 className="font-semibold text-navy-800 text-sm flex items-center gap-2">
                  <Bell size={16} className="text-gold-500" />
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-navy-500 hover:text-navy-700">
                    Tout marquer lu
                  </button>
                )}
              </div>
              <div className="overflow-y-auto max-h-72">
                {notifs.length === 0 ? (
                  <div className="text-center py-8 text-sm text-navy-400">
                    Aucune notification
                  </div>
                ) : (
                  notifs.map(notif => (
                    <button
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`w-full text-left p-3 border-b border-navy-50 hover:bg-navy-50/50 transition-colors ${
                        !notif.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {!notif.isRead && (
                          <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                        )}
                        <div className={!notif.isRead ? '' : 'pl-4'}>
                          <p className="text-sm font-medium text-navy-800">{notif.title}</p>
                          <p className="text-xs text-navy-500 mt-0.5">{notif.message}</p>
                          <p className="text-xs text-navy-400 mt-1">
                            {new Date(notif.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
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
