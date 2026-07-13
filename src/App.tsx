import { Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Simulator from './pages/Simulator'
import FamilyCanvas from './pages/FamilyCanvas'
import FamilyTree from './pages/FamilyTree'
import Patrimony from './pages/Patrimony'
import Documents from './pages/Documents'
import Checklist from './pages/Checklist'
import ExportDossier from './pages/ExportDossier'
import ChatHistory from './pages/ChatHistory'
import Invitations from './pages/Invitations'
import AdminPanel from './pages/AdminPanel'
import Blog from './pages/Blog'
import BlogArticle from './pages/BlogArticle'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Layout from './components/Layout'
import AuthLayout from './components/AuthLayout'
import ProtectedRoute from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/simulateur" element={<Simulator />} />
      <Route path="/blog" element={<Blog />} />
      <Route path="/blog/:slug" element={<BlogArticle />} />

      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path="/connexion" element={<Login />} />
        <Route path="/inscription" element={<Signup />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
      </Route>

      {/* App (authenticated) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/tableau-de-bord" element={<Dashboard />} />
          <Route path="/canvas-familial" element={<FamilyCanvas />} />
          <Route path="/arbre-familial" element={<FamilyTree />} />
          <Route path="/patrimoine" element={<Patrimony />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/checklist" element={<Checklist />} />
          <Route path="/assistant" element={<ChatHistory />} />
          <Route path="/invitations" element={<Invitations />} />
          <Route path="/dossier" element={<ExportDossier />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Route>
      </Route>
    </Routes>
  )
}
