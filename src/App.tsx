import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Simulator from './pages/Simulator'
import FamilyCanvas from './pages/FamilyCanvas'
import Patrimony from './pages/Patrimony'
import Documents from './pages/Documents'
import Checklist from './pages/Checklist'
import ExportDossier from './pages/ExportDossier'
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
          <Route path="/documents" element={<Documents />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/dossier" element={<ExportDossier />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Route>
    </Routes>
  )
}
