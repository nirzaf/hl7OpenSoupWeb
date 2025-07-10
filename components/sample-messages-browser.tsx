"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription 
} from "@/components/ui/dialog"
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  Copy, 
  BookOpen,
  FileText,
  Plus,
  Tag
} from "lucide-react"
import { SAMPLE_HL7_MESSAGES, type SampleHL7Message } from "@/lib/sample-hl7-messages"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface SampleMessagesBrowserProps {
  onSelectMessage?: (message: SampleHL7Message) => void
  onImportMessage?: (message: SampleHL7Message) => void
}

export function SampleMessagesBrowser({ onSelectMessage, onImportMessage }: SampleMessagesBrowserProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedMessage, setSelectedMessage] = useState<SampleHL7Message | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const categories = useMemo(() => {
    const cats = new Set(SAMPLE_HL7_MESSAGES.map(msg => msg.category))
    return Array.from(cats).sort()
  }, [])

  const messageTypes = useMemo(() => {
    const types = new Set(SAMPLE_HL7_MESSAGES.map(msg => msg.messageType))
    return Array.from(types).sort()
  }, [])

  const filteredMessages = useMemo(() => {
    return SAMPLE_HL7_MESSAGES.filter(message => {
      const matchesSearch = !searchTerm || 
        message.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.messageType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        message.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesCategory = selectedCategory === "all" || message.category === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  const handlePreviewMessage = (message: SampleHL7Message) => {
    setSelectedMessage(message)
    setIsPreviewOpen(true)
  }

  const handleCopyMessage = async (message: SampleHL7Message) => {
    try {
      await navigator.clipboard.writeText(message.rawMessage)
      // You could add a toast notification here
    } catch (error) {
      console.error("Failed to copy message:", error)
    }
  }

  const handleImportMessage = (message: SampleHL7Message) => {
    if (onImportMessage) {
      onImportMessage(message)
    }
  }

  const formatHL7ForDisplay = (rawMessage: string) => {
    return rawMessage.split('\n').map((line, index) => (
      <div key={index} className="font-mono text-sm">
        {line}
      </div>
    ))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5" />
            <span>Sample HL7 Messages Library</span>
            <Badge variant="outline">{SAMPLE_HL7_MESSAGES.length} messages</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages, types, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMessages.map((message) => (
          <Card key={message.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg">{message.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs">
                    {message.messageType}
                  </Badge>
                </div>
                <Badge variant="outline" className="text-xs">
                  {message.category}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {message.description}
              </p>
              
              <div className="flex flex-wrap gap-1">
                {message.tags.map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex space-x-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handlePreviewMessage(message)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCopyMessage(message)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {onImportMessage && (
                  <Button 
                    size="sm"
                    onClick={() => handleImportMessage(message)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Import
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* No Results */}
      {filteredMessages.length === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No messages found matching your criteria</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Message Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <FileText className="h-5 w-5" />
              <span>{selectedMessage?.name}</span>
              <Badge variant="secondary">{selectedMessage?.messageType}</Badge>
            </DialogTitle>
            <DialogDescription>
              {selectedMessage?.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedMessage && (
            <div className="space-y-4">
              {/* Message Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <p className="text-sm text-muted-foreground">{selectedMessage.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Message Type</label>
                  <p className="text-sm text-muted-foreground">{selectedMessage.messageType}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Tags</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedMessage.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Message Content */}
              <Tabs defaultValue="formatted" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="formatted">Formatted</TabsTrigger>
                  <TabsTrigger value="raw">Raw</TabsTrigger>
                </TabsList>

                <TabsContent value="formatted">
                  <ScrollArea className="h-64 border rounded p-4 bg-gray-50">
                    {formatHL7ForDisplay(selectedMessage.rawMessage)}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="raw">
                  <ScrollArea className="h-64">
                    <SyntaxHighlighter
                      language="text"
                      style={tomorrow}
                      customStyle={{
                        margin: 0,
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                      }}
                    >
                      {selectedMessage.rawMessage}
                    </SyntaxHighlighter>
                  </ScrollArea>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="outline"
                  onClick={() => handleCopyMessage(selectedMessage)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy to Clipboard
                </Button>
                {onImportMessage && (
                  <Button onClick={() => {
                    handleImportMessage(selectedMessage)
                    setIsPreviewOpen(false)
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Import Message
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{filteredMessages.length}</div>
            <div className="text-sm text-muted-foreground">Available Messages</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-muted-foreground">Categories</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{messageTypes.length}</div>
            <div className="text-sm text-muted-foreground">Message Types</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {SAMPLE_HL7_MESSAGES.reduce((acc, msg) => acc + msg.tags.length, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Tags</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
