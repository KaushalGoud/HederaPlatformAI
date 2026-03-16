import ChatInterface from '@/components/chat/ChatInterface'
import TransactionForm from '@/components/transaction/TransactionForm'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-zinc-900 to-black text-white flex items-center justify-center p-4 relative overflow-hidden">

      {/* 🔥 Animated Glow Background */}
      <div className="absolute w-[600px] h-[600px] bg-purple-600 opacity-20 blur-3xl rounded-full -top-40 -left-40 animate-pulse"></div>
      <div className="absolute w-[600px] h-[600px] bg-blue-600 opacity-20 blur-3xl rounded-full -bottom-40 -right-40 animate-pulse"></div>

      <div className="w-full max-w-2xl z-10">

        {/* 🌟 Hero Section */}
        
        <div className="text-center mb-10">
              
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">
        
            HASHFLOW
          </h1>

          <p className="text-lg text-zinc-400">
            Send HBAR instantly using manual transfer or AI commands
          </p>
        </div>

        {/* 🧊 Glass Card */}
        <div className="bg-zinc-900/70 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl p-6">

          <Tabs defaultValue="manual" className="w-full">

            <TabsList className="grid w-full grid-cols-2 bg-zinc-800 rounded-xl">
              <TabsTrigger
                value="manual"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                Manual Transfer
              </TabsTrigger>

              <TabsTrigger
                value="agent"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-blue-600 data-[state=active]:text-white"
              >
                AI Agent
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-6">
              <TransactionForm />
            </TabsContent>

            <TabsContent value="agent" className="mt-6">
              <ChatInterface />
            </TabsContent>

          </Tabs>
        </div>
      </div>
    </main>
  )
}
