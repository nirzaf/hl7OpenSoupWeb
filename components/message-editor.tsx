"use client"

import { useState, useEffect } from "react"
import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Save, Undo, Redo, Eye, Code, AlertTriangle } from "lucide-react"
import { HL7SyntaxHighlighter, HL7_SYNTAX_CSS } from "@/lib/hl7-syntax-highlighter"
import { HL7Preview } from "@/components/hl7-preview"
import { HL7FieldAssistant } from "@/components/hl7-field-assistant"

interface MessageEditorProps {
  message: HL7Message
  onSave: (message: HL7Message) => void
}

export function MessageEditor({ message, onSave }: MessageEditorProps) {
  const [editedMessage, setEditedMessage] = useState(message)
  const [hasChanges, setHasChanges] = useState(false)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Use rawMessage if available, fallback to content for backward compatibility
  const rawContent = editedMessage.rawMessage || (editedMessage as any).content || ''

  useEffect(() => {
    // Only inject CSS on client side to prevent hydration mismatch
    if (typeof window !== 'undefined') {
      const styleElement = document.createElement('style')
      styleElement.textContent = HL7_SYNTAX_CSS
      document.head.appendChild(styleElement)

      return () => {
        if (document.head.contains(styleElement)) {
          document.head.removeChild(styleElement)
        }
      }
    }
  }, [])

  const handleContentChange = (content: string) => {
    setEditedMessage({
      ...editedMessage,
      rawMessage: content,
      // Clear validation results when content changes
      isValid: undefined,
      validationErrors: undefined
    })
    setHasChanges(true)
  }

  const handleNameChange = (name: string) => {
    setEditedMessage({ ...editedMessage, name })
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      const response = await fetch(`/api/messages/${editedMessage._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editedMessage,
          updatedAt: new Date(),
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to save: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      onSave(result.data || result)
      setHasChanges(false)

      // Show success message
      alert("Message saved successfully!")
    } catch (error) {
      console.error("Failed to save message:", error)
      alert(`Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const validateMessage = async () => {
    setIsValidating(true)
    try {
      const response = await fetch('/api/messages/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawMessage: rawContent })
      })
      const result = await response.json()
      setValidationResults(result.data)
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const segments = rawContent.split("\n").filter((line) => line.trim())

  const renderHighlightedContent = () => {
    if (!validationResults) {
      return rawContent
    }

    const highlightRules = HL7SyntaxHighlighter.validationErrorsToHighlightRules(
      rawContent,
      validationResults.results || []
    )

    return (
      <div
        className="font-mono text-sm whitespace-pre-wrap"
        dangerouslySetInnerHTML={{
          __html: HL7SyntaxHighlighter.applyHighlighting(rawContent, highlightRules)
        }}
      />
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Edit Message</CardTitle>
            <div className="flex items-center space-x-2">
              {hasChanges && <Badge variant="secondary">Unsaved changes</Badge>}
              <Button size="sm" variant="outline">
                <Undo className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline">
                <Redo className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={validateMessage}
                disabled={isValidating}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {isValidating ? 'Validating...' : 'Validate'}
              </Button>
              <Button size="sm" onClick={handleSave} disabled={!hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="message-name">Message Name</Label>
              <Input id="message-name" value={editedMessage.name} onChange={(e) => handleNameChange(e.target.value)} />
            </div>
            <div>
              <Label>Message Type</Label>
              <div className="flex items-center space-x-2 mt-2">
                <Badge>{editedMessage.metadata?.messageType || (editedMessage as any).messageType || 'Unknown'}</Badge>
                <Badge variant="outline">HL7 v{editedMessage.metadata?.versionId || (editedMessage as any).version || 'Unknown'}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message Content</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="editor" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="editor" className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>Editor</span>
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Preview</span>
              </TabsTrigger>
              <TabsTrigger value="highlighted" className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Highlighted</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editor" className="mt-4">
              <div className="space-y-4">
                <Textarea
                  value={rawContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="font-mono text-sm min-h-[400px]"
                  placeholder="Enter HL7 message content..."
                />
                <div className="text-sm text-muted-foreground">
                  {segments.length} segments • {rawContent.length} characters
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <ScrollArea className="h-[600px] w-full">
                <HL7Preview content={rawContent} />
              </ScrollArea>
            </TabsContent>

            <TabsContent value="highlighted" className="mt-4">
              <div className="border rounded-lg p-4 min-h-[400px] bg-muted/50">
                {validationResults ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 text-sm">
                      <Badge variant={validationResults.isValid ? "default" : "destructive"}>
                        {validationResults.isValid ? "Valid" : "Invalid"}
                      </Badge>
                      <span>Errors: {validationResults.summary?.totalErrors || 0}</span>
                      <span>Warnings: {validationResults.summary?.totalWarnings || 0}</span>
                    </div>
                    {renderHighlightedContent()}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Click "Validate" to see syntax highlighting and error detection
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segment Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {segments.map((segment, index) => {
              const segmentType = segment.split("|")[0]
              return (
                <div key={index} className="flex items-center space-x-2 p-2 bg-muted rounded">
                  <Badge variant="outline" className="text-xs">
                    {segmentType}
                  </Badge>
                  <span className="text-sm font-mono truncate flex-1">{segment}</span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResults && validationResults.results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className={validationResults.isValid ? "text-green-600" : "text-red-600"}>
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationResults.results.map((result: any, index: number) => (
                <div key={index} className="flex items-start space-x-2 p-2 rounded border">
                  <Badge variant={result.severity === "error" ? "destructive" : "secondary"}>
                    {result.severity}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium">{result.segment}.{result.field}</p>
                    <p className="text-sm text-muted-foreground">{result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
