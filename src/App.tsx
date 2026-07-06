import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Simulator from './pages/Simulator'
import FamilyCanvas from './pages/FamilyCanvas'
import Patrimony from './pages/Patrimony'
import AdminPanel from './pages/AdminPanel'
import Layout from './components/Layout'
import AuthLayout from './components/AuthLayout'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/simulateur" element={<Simulator />} />

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Signup />} />
      </Route>

      {/* App (authenticated) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/tableau-de-bord" element={<Dashboard />} />
          <Route path="/canvas-familial" element={<FamilyCanvas />} />
          <Route path="/patrimoine" element={<Patrimony />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Route>
    </Routes>
  )
}
