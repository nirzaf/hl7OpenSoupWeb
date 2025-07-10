"use client"

import { useState } from "react"
import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Save, Undo, Redo } from "lucide-react"

interface MessageEditorProps {
  message: HL7Message
  onSave: (message: HL7Message) => void
}

export function MessageEditor({ message, onSave }: MessageEditorProps) {
  const [editedMessage, setEditedMessage] = useState(message)
  const [hasChanges, setHasChanges] = useState(false)

  const handleContentChange = (content: string) => {
    setEditedMessage({ ...editedMessage, content })
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
      const updated = await response.json()
      onSave(updated)
      setHasChanges(false)
    } catch (error) {
      console.error("Failed to save message:", error)
    }
  }

  const segments = editedMessage.content.split("\n").filter((line) => line.trim())

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
                <Badge>{editedMessage.messageType}</Badge>
                <Badge variant="outline">HL7 v{editedMessage.version}</Badge>
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
          <div className="space-y-4">
            <Textarea
              value={editedMessage.content}
              onChange={(e) => handleContentChange(e.target.value)}
              className="font-mono text-sm min-h-[400px]"
              placeholder="Enter HL7 message content..."
            />
            <div className="text-sm text-muted-foreground">
              {segments.length} segments • {editedMessage.content.length} characters
            </div>
          </div>
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
    </div>
  )
}
