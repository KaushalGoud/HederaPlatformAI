import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  text: string
  isUser: boolean
}

export default function ChatMessage({ text, isUser }: ChatMessageProps) {
  return (
    <div className={cn('flex items-start gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'rounded-lg p-3 text-sm max-w-[70%]',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted rounded-bl-none'
        )}
      >
        <p>{text}</p>
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>You</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
