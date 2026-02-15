'use client'

import { useState } from 'react'
import ChatInput from './ChatInput'
import ChatMessage from './ChatMessage'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Message {
  text: string
  isUser: boolean
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { text: 'Hello! How can I help you today?', isUser: false },
  ])
  const [isLoading, setIsLoading] = useState(false)

  const handleSendMessage = async (text: string) => {
    setMessages(prev => [...prev, { text, isUser: true }])
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      })

      const data = await response.json()

      if (response.ok) {
        setMessages(prev => [...prev, { text: data.reply, isUser: false }]);
      } else {
        setMessages(prev => [
          ...prev,
          { text: data.error || 'An error occurred.', isUser: false },
        ])
      }
    } catch (error) {
      setMessages(prev => [
        ...prev,
        { text: 'Failed to connect to the server.', isUser: false },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Agent</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-80 overflow-y-auto space-y-4 p-4 border rounded-md">
          {messages.map((msg, index) => (
            <ChatMessage key={index} text={msg.text} isUser={msg.isUser} />
          ))}
          {isLoading && (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
        </div>
        <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
      </CardContent>
    </Card>
  )
}
