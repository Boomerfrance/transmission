import { Outlet, Link } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 via-white to-gold-50/30 flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center shadow-md">
          <span className="text-white text-[11px] font-semibold tracking-tight">LF</span>
        </div>
        <span className="font-serif text-navy-800 text-xl">Lègue Facile</span>
      </Link>
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  )
}
