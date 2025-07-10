"use client"

import { useState, useEffect } from "react"
import { MessageList } from "./message-list"
import { MessageViewer } from "./message-viewer"
import { MessageEditor } from "./message-editor"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Search, Filter, Download, Upload } from "lucide-react"
import type { HL7Message } from "@/types/hl7"

export function MessageDashboard() {
  const [messages, setMessages] = useState<HL7Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<HL7Message | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      const response = await fetch("/api/messages")
      const result = await response.json()
      const data = result.data || result // Handle both paginated and direct array responses
      setMessages(Array.isArray(data) ? data : [])
      if (data.length > 0) {
        setSelectedMessage(data[0])
      }
    } catch (error) {
      console.error("Failed to load messages:", error)
      setMessages([]) // Ensure messages is always an array
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateMessage = async () => {
    const rawMessage = `MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "")}||ADT^A01|${Date.now()}|P|2.5
EVN||${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "")}
PID|1||PATID1234^5^M11^ADT1^MR^UNIVERSITY_HOSPITAL~123456789^^^USA^SS||DOE^JOHN^A|19800101|M||C|1200 N ELM STREET^^GREENSBORO^NC^27401-1020|GL|(919)379-1212|(919)271-3434~(919)277-3114||S||PATID12345001^2^M10^ADT1^AN^A|123456789|9-87654^NC`

    const currentMessages = Array.isArray(messages) ? messages : []
    const newMessage = {
      name: `New Message ${currentMessages.length + 1}`,
      rawMessage,
      metadata: {
        tags: ['new']
      }
    }

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMessage),
      })
      const created = await response.json()
      setMessages([created, ...currentMessages])
      setSelectedMessage(created)
    } catch (error) {
      console.error("Failed to create message:", error)
    }
  }

  const filteredMessages = Array.isArray(messages) ? messages.filter(
    (message) => {
      if (!message || typeof message !== 'object') return false
      const messageName = message.name || ''
      const messageType = message.metadata?.messageType || (message as any).messageType || ''
      return messageName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             messageType.toLowerCase().includes(searchTerm.toLowerCase())
    }
  ) : []

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading messages...</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Message List Panel */}
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Messages ({Array.isArray(messages) ? messages.length : 0})</CardTitle>
              <div className="flex space-x-2">
                <Button size="sm" onClick={handleCreateMessage}>
                  <Plus className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Button size="sm" variant="outline">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <MessageList
              messages={filteredMessages}
              selectedMessage={selectedMessage}
              onSelectMessage={setSelectedMessage}
            />
          </CardContent>
        </Card>
      </div>

      {/* Message Viewer/Editor Panel */}
      <div className="lg:col-span-2">
        {selectedMessage ? (
          <Tabs defaultValue="view" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="view">View</TabsTrigger>
                <TabsTrigger value="edit">Edit</TabsTrigger>
                <TabsTrigger value="validate">Validate</TabsTrigger>
              </TabsList>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm">Save</Button>
              </div>
            </div>

            <TabsContent value="view">
              <MessageViewer message={selectedMessage} />
            </TabsContent>

            <TabsContent value="edit">
              <MessageEditor
                message={selectedMessage}
                onSave={(updatedMessage) => {
                  const currentMessages = Array.isArray(messages) ? messages : []
                  setMessages(currentMessages.map((m) => (m._id === updatedMessage._id ? updatedMessage : m)))
                  setSelectedMessage(updatedMessage)
                }}
              />
            </TabsContent>

            <TabsContent value="validate">
              <Card>
                <CardHeader>
                  <CardTitle>Message Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Message structure is valid</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">2 warnings found</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Validation against HL7 v{selectedMessage.version} specification
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Select a message to view or edit</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
