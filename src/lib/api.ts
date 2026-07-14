/**
 * API client for Transmission backend.
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api'

function getToken(): string | null {
  return localStorage.getItem('transmission_token')
}

export function setToken(token: string) {
  localStorage.setItem('transmission_token', token)
}

export function clearToken() {
  localStorage.removeItem('transmission_token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `Erreur ${res.status}`)
  }

  return data as T
}

// ── Auth ──────────────────────────────────────────────

export interface AuthResponse {
  token: string
  user: { id: string; name: string; email: string; role: string }
  familyId: string | null
}

export const auth = {
  me: () => request<{ user: AuthResponse['user']; family: { id: string; name: string } | null }>('/auth'),

  auth0Login: (idToken: string) =>
    request<AuthResponse>('/auth?action=auth0-login', { method: 'POST', body: JSON.stringify({ idToken }) }),
}

// ── Assets ────────────────────────────────────────────

export interface Asset {
  id: string
  familyId: string
  category: string
  label: string
  value: string
  notes: string | null
  createdAt: string
  updatedAt: string
}

export const assets = {
  list: () => request<Asset[]>('/assets'),
  create: (data: { category: string; label: string; value: number; notes?: string }) =>
    request<Asset>('/assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: { id: string; category?: string; label?: string; value?: number; notes?: string }) =>
    request<Asset>('/assets', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>('/assets', { method: 'DELETE', body: JSON.stringify({ id }) }),
}

// ── Canvas ────────────────────────────────────────────

export interface CanvasAnswer {
  id: string
  sectionId: string
  questionId: string
  answer: string
}

export const canvas = {
  list: () => request<CanvasAnswer[]>('/canvas'),
  save: (data: { sectionId: string; questionId: string; answer: string }) =>
    request<CanvasAnswer>('/canvas', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Chat ──────────────────────────────────────────────

export interface Conversation {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface ConversationFull extends Conversation {
  messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>
}

export interface ChatResponse {
  reply: string
  model: string
  conversationId: string
}

export const chat = {
  list: () => request<Conversation[]>('/chat'),
  get: (id: string) => request<ConversationFull>(`/chat?id=${id}`),
  send: (message: string, conversationId?: string) =>
    request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationId }),
    }),
  delete: (id: string) =>
    request<{ success: boolean }>('/chat', { method: 'DELETE', body: JSON.stringify({ id }) }),
}

// ── Admin ─────────────────────────────────────────────

export interface LlmConfig {
  model: string
  temperature: number
  systemPrompt: string
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  blocked: boolean
  createdAt: string
}

export const admin = {
  getLlmConfig: () => request<LlmConfig>('/admin?section=llm'),
  setLlmConfig: (config: Partial<LlmConfig>) =>
    request<{ success: boolean; config: LlmConfig }>('/admin?section=llm', { method: 'POST', body: JSON.stringify(config) }),
  getUsers: () => request<AdminUser[]>('/admin?section=users'),
  updateUser: (userId: string, data: { role?: string; blocked?: boolean }) =>
    request<AdminUser>('/admin?section=users', { method: 'PATCH', body: JSON.stringify({ userId, ...data }) }),
}

// ── Family Members ────────────────────────────────────

export interface FamilyMember {
  id: string
  familyId: string
  name: string
  relationship: string
  birthYear: number | null
  notes: string | null
  parentId: string | null
  createdAt: string
}

export const family = {
  listMembers: () => request<FamilyMember[]>('/family'),
  addMember: (data: { name: string; relationship: string; birthYear?: number; notes?: string; parentId?: string }) =>
    request<FamilyMember>('/family', { method: 'POST', body: JSON.stringify(data) }),
  updateMember: (data: { id: string; name?: string; relationship?: string; birthYear?: number; notes?: string; parentId?: string }) =>
    request<FamilyMember>('/family', { method: 'PUT', body: JSON.stringify(data) }),
  deleteMember: (id: string) =>
    request<{ success: boolean }>('/family', { method: 'DELETE', body: JSON.stringify({ id }) }),
}

// ── Invitations ───────────────────────────────────────

export interface Invitation {
  id: string
  familyId: string
  invitedBy: string
  inviteeEmail: string
  role: string
  status: string
  token: string
  createdAt: string
}

export const invitations = {
  list: () => request<{ sent: Invitation[]; received: Invitation[] }>('/family?section=invitations'),
  create: (email: string, role?: string) =>
    request<Invitation>('/family?section=invitations', { method: 'POST', body: JSON.stringify({ email, role }) }),
  accept: (invitationId: string) =>
    request<{ success: boolean }>('/family?section=invitations&action=accept', {
      method: 'POST',
      body: JSON.stringify({ invitationId }),
    }),
  decline: (invitationId: string) =>
    request<Invitation>('/family?section=invitations', {
      method: 'PATCH',
      body: JSON.stringify({ invitationId, action: 'decline' }),
    }),
  cancel: (invitationId: string) =>
    request<Invitation>('/family?section=invitations', {
      method: 'PATCH',
      body: JSON.stringify({ invitationId, action: 'cancel' }),
    }),
}

// ── Notifications ─────────────────────────────────────

export interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  isRead: boolean
  linkTo: string | null
  createdAt: string
}

export const notifications = {
  list: () => request<Notification[]>('/notifications'),
  unreadCount: () => request<{ count: number }>('/notifications?unread=1'),
  markRead: (id: string) =>
    request<Notification>('/notifications', { method: 'PATCH', body: JSON.stringify({ id }) }),
  markAllRead: () =>
    request<{ success: boolean }>('/notifications', { method: 'PATCH', body: JSON.stringify({ markAll: true }) }),
  delete: (id: string) =>
    request<{ success: boolean }>('/notifications', { method: 'DELETE', body: JSON.stringify({ id }) }),
}

// ── Documents ─────────────────────────────────────────

export interface Document {
  id: string
  familyId: string
  name: string
  category: string
  status: string
  notes: string | null
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  createdAt: string
  updatedAt: string
}

export const documents = {
  list: () => request<Document[]>('/documents'),
  create: (data: { name: string; category: string; status?: string; notes?: string; fileName?: string; fileType?: string; fileSize?: number; fileData?: string }) =>
    request<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: { id: string; name?: string; category?: string; status?: string; notes?: string; fileName?: string; fileType?: string; fileSize?: number; fileData?: string }) =>
    request<Document>('/documents', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>('/documents', { method: 'DELETE', body: JSON.stringify({ id }) }),
  download: (id: string) =>
    request<{ fileName: string; fileType: string; fileData: string }>(`/documents?download=${id}`),
}

// ── Checklist ─────────────────────────────────────────

export interface ChecklistItem {
  id: string
  familyId: string
  title: string
  description: string | null
  category: string
  isCompleted: boolean
  isDefault: boolean
  sortOrder: number
  completedAt: string | null
  createdAt: string
}

export const checklist = {
  list: () => request<ChecklistItem[]>('/checklist'),
  create: (data: { title: string; category: string; description?: string }) =>
    request<ChecklistItem>('/checklist', { method: 'POST', body: JSON.stringify(data) }),
  toggle: (id: string, isCompleted: boolean) =>
    request<ChecklistItem>('/checklist', { method: 'PATCH', body: JSON.stringify({ id, isCompleted }) }),
  delete: (id: string) =>
    request<{ success: boolean }>('/checklist', { method: 'DELETE', body: JSON.stringify({ id }) }),
}

// ── Blog ──────────────────────────────────────────────

export interface BlogArticle {
  id: string
  slug: string
  title: string
  summary: string
  category: string
  published: boolean
  authorName: string
  createdAt: string
}

export interface BlogArticleFull extends BlogArticle {
  content: string
  updatedAt: string
}

export const blog = {
  list: () => request<BlogArticle[]>('/blog'),
  listAll: () => request<BlogArticle[]>('/blog?all=true'),
  get: (slug: string) => request<BlogArticleFull>(`/blog?slug=${encodeURIComponent(slug)}`),
  create: (data: { title: string; slug: string; summary: string; content: string; category: string; published?: boolean; authorName?: string }) =>
    request<BlogArticleFull>('/blog', { method: 'POST', body: JSON.stringify(data) }),
  update: (data: { id: string; title?: string; slug?: string; summary?: string; content?: string; category?: string; published?: boolean; authorName?: string }) =>
    request<BlogArticleFull>('/blog', { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    request<{ success: boolean }>('/blog', { method: 'DELETE', body: JSON.stringify({ id }) }),
}

// ── Export ─────────────────────────────────────────────

export interface DossierExport {
  user: { name: string; email: string }
  family: { id: string; name: string }
  patrimoine: { assets: Asset[]; total: number; totalActif: number; totalPassif: number }
  familyMembers: { id: string; name: string; relationship: string; birthYear: number | null }[]
  canvas: CanvasAnswer[]
  checklist: { items: ChecklistItem[]; completed: number; total: number; progress: number }
  documents: { items: Document[]; obtained: number; total: number }
  generatedAt: string
}

export const exportApi = {
  getDossier: () => request<DossierExport>('/export/dossier'),
}
