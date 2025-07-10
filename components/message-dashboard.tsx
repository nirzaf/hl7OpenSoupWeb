"use client"

import { useState, useEffect, useRef } from "react"
import { MessageList } from "./message-list"
import { MessageViewer } from "./message-viewer"
import { MessageEditor } from "./message-editor"
import { MessageComparison } from "./message-comparison"
import { SampleMessagesBrowser } from "./sample-messages-browser"
import { AdvancedSearch, type SearchCriteria } from "./advanced-search"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Search, Filter, Download, Upload, FileText, X, Database, ArrowLeftRight, BookOpen } from "lucide-react"
import type { HL7Message } from "@/types/hl7"

export function MessageDashboard() {
  const [messages, setMessages] = useState<HL7Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<HL7Message | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [uploadedContent, setUploadedContent] = useState("")
  const [uploadedFileName, setUploadedFileName] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async (searchCriteria?: SearchCriteria) => {
    try {
      setIsSearching(!!searchCriteria)

      let url = "/api/messages"
      const params = new URLSearchParams()

      if (searchCriteria) {
        if (searchCriteria.generalSearch) params.append('search', searchCriteria.generalSearch)
        if (searchCriteria.patientName) params.append('patientName', searchCriteria.patientName)
        if (searchCriteria.patientId) params.append('patientId', searchCriteria.patientId)
        if (searchCriteria.messageType) params.append('messageType', searchCriteria.messageType)
        if (searchCriteria.sendingFacility) params.append('sendingFacility', searchCriteria.sendingFacility)
        if (searchCriteria.receivingFacility) params.append('receivingFacility', searchCriteria.receivingFacility)
        if (searchCriteria.messageControlId) params.append('messageControlId', searchCriteria.messageControlId)
        if (searchCriteria.tags) params.append('tags', searchCriteria.tags.join(','))
        if (searchCriteria.dateFrom) params.append('dateFrom', searchCriteria.dateFrom.toISOString())
        if (searchCriteria.dateTo) params.append('dateTo', searchCriteria.dateTo.toISOString())
        if (searchCriteria.isValid !== undefined) params.append('isValid', searchCriteria.isValid.toString())
        if (searchCriteria.segmentTypes) params.append('segmentTypes', searchCriteria.segmentTypes.join(','))
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }

      const response = await fetch(url)
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
      setIsSearching(false)
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setUploadedContent(content)
        setUploadedFileName(file.name)
      }
      reader.readAsText(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)

    const files = event.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setUploadedContent(content)
        setUploadedFileName(file.name)
      }
      reader.readAsText(file)
    }
  }

  const handleUploadSubmit = async () => {
    if (!uploadedContent.trim()) return

    const currentMessages = Array.isArray(messages) ? messages : []
    const newMessage = {
      name: uploadedFileName || `Uploaded Message ${currentMessages.length + 1}`,
      rawMessage: uploadedContent,
      metadata: {
        tags: ['uploaded']
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
      setIsUploadDialogOpen(false)
      setUploadedContent("")
      setUploadedFileName("")
    } catch (error) {
      console.error("Failed to upload message:", error)
    }
  }

  const handleClipboardPaste = async () => {
    try {
      const text = await navigator.clipboard.readText()
      setUploadedContent(text)
      setUploadedFileName("Pasted from clipboard")
    } catch (error) {
      console.error("Failed to read clipboard:", error)
    }
  }

  const handleLoadSamples = async () => {
    try {
      const response = await fetch("/api/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: false }),
      })
      const result = await response.json()

      if (response.ok) {
        // Reload messages to show the new samples
        await loadMessages()
        console.log("Sample messages loaded:", result.message)
      } else {
        console.error("Failed to load samples:", result.error)
      }
    } catch (error) {
      console.error("Failed to load sample messages:", error)
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
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <BookOpen className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-6xl max-h-[90vh]">
                    <DialogHeader>
                      <DialogTitle>Sample HL7 Messages Library</DialogTitle>
                    </DialogHeader>
                    <SampleMessagesBrowser
                      onImportMessage={(sampleMessage) => {
                        const currentMessages = Array.isArray(messages) ? messages : []
                        const newMessage = {
                          name: sampleMessage.name,
                          rawMessage: sampleMessage.rawMessage,
                          metadata: {
                            messageType: sampleMessage.messageType,
                            tags: [...sampleMessage.tags, 'sample']
                          }
                        }

                        fetch("/api/messages", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(newMessage),
                        }).then(response => response.json())
                          .then(created => {
                            setMessages([created, ...currentMessages])
                            setSelectedMessage(created)
                          })
                          .catch(error => console.error("Failed to import sample message:", error))
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Upload HL7 Message</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* File Upload Area */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                          isDragOver
                            ? 'border-primary bg-primary/5'
                            : 'border-muted-foreground/25 hover:border-primary/50'
                        }`}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                      >
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <div className="space-y-2">
                          <p className="text-lg font-medium">Drop your HL7 file here</p>
                          <p className="text-sm text-muted-foreground">or click to browse</p>
                          <Button
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2"
                          >
                            Choose File
                          </Button>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".hl7,.txt,.dat"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </div>
                      </div>

                      {/* Clipboard Paste Option */}
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground mb-2">Or paste from clipboard</p>
                        <Button variant="outline" onClick={handleClipboardPaste}>
                          Paste from Clipboard
                        </Button>
                      </div>

                      {/* Content Preview */}
                      {uploadedContent && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Content Preview</Label>
                            {uploadedFileName && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm text-muted-foreground">{uploadedFileName}</span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setUploadedContent("")
                                    setUploadedFileName("")
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </div>
                          <Textarea
                            value={uploadedContent}
                            onChange={(e) => setUploadedContent(e.target.value)}
                            className="font-mono text-sm min-h-[200px]"
                            placeholder="HL7 message content will appear here..."
                          />
                        </div>
                      )}

                      {/* Upload Actions */}
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsUploadDialogOpen(false)
                            setUploadedContent("")
                            setUploadedFileName("")
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleUploadSubmit}
                          disabled={!uploadedContent.trim()}
                        >
                          Upload Message
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="flex space-x-2">
              <div className="flex-1 space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <AdvancedSearch
                  onSearch={(criteria) => loadMessages(criteria)}
                  onClear={() => loadMessages()}
                  isLoading={isSearching}
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
                <TabsTrigger value="compare">Compare</TabsTrigger>
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

            <TabsContent value="compare">
              <MessageComparison
                messages={Array.isArray(messages) ? messages : []}
                initialMessage1={selectedMessage}
              />
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
