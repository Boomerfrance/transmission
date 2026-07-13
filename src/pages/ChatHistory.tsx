import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageSquare, Plus, Trash2, Send, ArrowLeft, Bot, User, Loader2 } from 'lucide-react'
import { chat as chatApi, type Conversation, type ConversationFull } from '../lib/api'

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Il y a ${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `Il y a ${days}j`
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

export default function ChatHistory() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<ConversationFull | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showSidebar, setShowSidebar] = useState(true)
  const messagesEnd = useRef<HTMLDivElement>(null)

  const loadConversations = useCallback(async () => {
    try {
      const data = await chatApi.list()
      setConversations(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages])

  const openConversation = async (id: string) => {
    setActiveId(id)
    setShowSidebar(false)
    try {
      const conv = await chatApi.get(id)
      setActiveConv(conv)
    } catch (err) {
      console.error(err)
    }
  }

  const startNew = () => {
    setActiveId(null)
    setActiveConv(null)
    setShowSidebar(false)
    setMessage('')
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    const userMsg = message.trim()
    setMessage('')
    setSending(true)

    // Optimistic update
    const now = new Date().toISOString()
    setActiveConv(prev => ({
      id: prev?.id || 'new',
      title: prev?.title || userMsg.slice(0, 60),
      createdAt: prev?.createdAt || now,
      updatedAt: now,
      messages: [...(prev?.messages || []), { role: 'user' as const, content: userMsg, timestamp: now }],
    }))

    try {
      const response = await chatApi.send(userMsg, activeId || undefined)
      
      setActiveId(response.conversationId)
      setActiveConv(prev => prev ? {
        ...prev,
        id: response.conversationId,
        messages: [...prev.messages, { role: 'assistant' as const, content: response.reply, timestamp: new Date().toISOString() }],
      } : null)

      // Refresh sidebar
      await loadConversations()
    } catch (err) {
      console.error(err)
      setActiveConv(prev => prev ? {
        ...prev,
        messages: [...prev.messages, { role: 'assistant' as const, content: "Désolé, une erreur est survenue. Réessayez.", timestamp: new Date().toISOString() }],
      } : null)
    } finally {
      setSending(false)
    }
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Supprimer cette conversation ?')) return
    try {
      await chatApi.delete(id)
      if (activeId === id) {
        setActiveConv(null)
        setActiveId(null)
      }
      await loadConversations()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-6 lg:-my-8">
      {/* Sidebar */}
      <div className={`
        ${showSidebar ? 'flex' : 'hidden lg:flex'}
        flex-col w-full lg:w-80 border-r border-navy-100 bg-white
      `}>
        <div className="flex items-center justify-between p-4 border-b border-navy-100">
          <h2 className="font-semibold text-navy-800 flex items-center gap-2">
            <MessageSquare size={20} className="text-gold-500" />
            Conversations
          </h2>
          <button
            onClick={startNew}
            className="p-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
            title="Nouvelle conversation"
          >
            <Plus size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-navy-400">Chargement...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare className="mx-auto text-navy-200 mb-3" size={32} />
              <p className="text-sm text-navy-500">Aucune conversation</p>
              <p className="text-xs text-navy-400 mt-1">Commencez une nouvelle discussion avec l'IA</p>
            </div>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => openConversation(conv.id)}
                className={`
                  w-full text-left p-4 border-b border-navy-50 hover:bg-navy-50/50 transition-colors group
                  ${activeId === conv.id ? 'bg-navy-50 border-l-3 border-l-navy-800' : ''}
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-800 truncate">{conv.title}</p>
                    <p className="text-xs text-navy-400 mt-1">{formatDate(conv.updatedAt)}</p>
                  </div>
                  <button
                    onClick={(e) => deleteConversation(conv.id, e)}
                    className="p-1 text-navy-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className={`
        ${!showSidebar ? 'flex' : 'hidden lg:flex'}
        flex-col flex-1 bg-navy-50/30
      `}>
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 bg-white border-b border-navy-100">
          <button
            onClick={() => setShowSidebar(true)}
            className="lg:hidden p-1.5 text-navy-400 hover:text-navy-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-navy-800 text-sm">
              {activeConv?.title || 'Nouvelle conversation'}
            </h3>
            <p className="text-xs text-navy-400">Assistant IA Lègue Facile</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {(!activeConv || activeConv.messages.length === 0) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Bot size={32} className="text-white" />
              </div>
              <h3 className="text-lg font-semibold text-navy-800 mb-2">Assistant Lègue Facile</h3>
              <p className="text-sm text-navy-500 max-w-md mx-auto">
                Posez-moi vos questions sur la transmission patrimoniale, la fiscalité successorale,
                ou la préparation de votre dossier notaire.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto mt-6">
                {[
                  'Quels sont les abattements en ligne directe ?',
                  'Comment optimiser ma transmission ?',
                  'Quels documents préparer pour le notaire ?',
                  'Donation vs succession : quelles différences ?',
                ].map(q => (
                  <button
                    key={q}
                    onClick={() => setMessage(q)}
                    className="text-left text-xs p-3 bg-white rounded-xl border border-navy-100 text-navy-600 hover:border-navy-300 hover:shadow-sm transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeConv?.messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start gap-2.5 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user'
                    ? 'bg-navy-800'
                    : 'bg-gradient-to-br from-gold-400 to-gold-600'
                }`}>
                  {msg.role === 'user' ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
                </div>
                <div className={`rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-navy-800 text-white'
                    : 'bg-white border border-navy-100 text-navy-800 shadow-sm'
                }`}>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="bg-white border border-navy-100 rounded-2xl px-4 py-3 shadow-sm">
                  <Loader2 size={18} className="text-navy-400 animate-spin" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEnd} />
        </div>

        {/* Input */}
        <div className="p-4 bg-white border-t border-navy-100">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Posez votre question..."
              disabled={sending}
              className="flex-1 px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-navy-300 focus:border-navy-400 outline-none text-sm text-navy-800 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!message.trim() || sending}
              className="p-3 bg-navy-800 text-white rounded-xl hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
