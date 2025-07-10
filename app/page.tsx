import { Suspense } from "react"
import { MessageDashboard } from "@/components/message-dashboard"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Activity, Database, FileText, Settings } from "lucide-react"
import { ValidationConfiguration } from "@/components/validation-configuration"
import { DataTransformation } from "@/components/data-transformation"
import { RulesEngine } from "@/components/rules-engine"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">HL7 Viewer & Editor</h1>
                <p className="text-sm text-muted-foreground">Advanced Healthcare Message Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-muted-foreground">Connected to MongoDB</div>
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="messages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="validation" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Validation</span>
            </TabsTrigger>
            <TabsTrigger value="transform" className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span>Transform</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Rules Engine</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <Suspense fallback={<div>Loading messages...</div>}>
              <MessageDashboard />
            </Suspense>
          </TabsContent>

          <TabsContent value="validation">
            <ValidationConfiguration />
          </TabsContent>

          <TabsContent value="transform">
            <DataTransformation />
          </TabsContent>

          <TabsContent value="rules">
            <RulesEngine />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
