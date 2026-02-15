import ChatInterface from '@/components/chat/ChatInterface'
import TransactionForm from '@/components/transaction/TransactionForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'


export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2">Hedera HBAR</h1>
          <p className="text-lg text-muted-foreground">
            Fast and efficient token transfers on the Hedera network
          </p>
        </div>
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Manual Transfer</TabsTrigger>
            <TabsTrigger value="agent">AI Agent</TabsTrigger>
          </TabsList>
          <TabsContent value="manual">
            <TransactionForm />
          </TabsContent>
          <TabsContent value="agent">
            <ChatInterface />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
