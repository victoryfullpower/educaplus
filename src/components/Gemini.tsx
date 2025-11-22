'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './ChatGPT.module.css'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function Gemini() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    const currentInput = input
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentInput }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al obtener respuesta')
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Error al comunicarse con Gemini'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <h3>✨ Google Gemini</h3>
      </div>
      <div className={styles.messagesContainer}>
        {messages.length === 0 && (
          <div className={styles.emptyState}>
            <p>¡Hola! Soy Google Gemini. ¿En qué puedo ayudarte?</p>
          </div>
        )}
        {messages.map((message, index) => (
          <div
            key={index}
            className={`${styles.message} ${styles[message.role]}`}
          >
            <div className={styles.messageContent}>
              {message.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className={`${styles.message} ${styles.assistant}`}>
            <div className={styles.messageContent}>
              <div className={styles.typing}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
          className={styles.input}
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className={styles.sendButton}
        >
          Enviar
        </button>
      </form>
    </div>
  )
}


