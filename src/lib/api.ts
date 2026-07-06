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
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  signup: (name: string, email: string, password: string) =>
    request<AuthResponse>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

  me: () => request<{ user: AuthResponse['user']; family: { id: string; name: string } | null }>('/auth/me'),
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

export const chat = {
  send: (message: string) =>
    request<{ reply: string; model: string }>('/chat', { method: 'POST', body: JSON.stringify({ message }) }),
}

// ── Admin ─────────────────────────────────────────────

export interface LlmConfig {
  model: string
  temperature: number
  systemPrompt: string
}

export const admin = {
  getLlmConfig: () => request<LlmConfig>('/admin/llm-config'),
  setLlmConfig: (config: Partial<LlmConfig>) =>
    request<{ success: boolean; config: LlmConfig }>('/admin/llm-config', { method: 'POST', body: JSON.stringify(config) }),
}
