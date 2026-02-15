'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSendMessage: (message: string) => void
  disabled: boolean
}

export default function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !disabled) {
      onSendMessage(input)
      setInput('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        type="text"
        placeholder="Type your message..."
        value={input}
        onChange={e => setInput(e.target.value)}
        disabled={disabled}
        className="flex-1"
      />
      <Button type="submit" disabled={disabled}>
        Send
      </Button>
    </form>
  )
}
