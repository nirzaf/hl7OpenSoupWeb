"use client"

import type { HL7Message } from "@/types/hl7"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"

interface MessageListProps {
  messages: HL7Message[]
  selectedMessage: HL7Message | null
  onSelectMessage: (message: HL7Message) => void
}

export function MessageList({ messages, selectedMessage, onSelectMessage }: MessageListProps) {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto p-4">
      {messages.map((message) => (
        <Card
          key={message._id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-muted/50",
            selectedMessage?._id === message._id && "ring-2 ring-primary",
          )}
          onClick={() => onSelectMessage(message)}
        >
          <CardContent className="p-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{message.name}</h4>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="text-xs">
                    {message.metadata?.messageType || (message as any).messageType || 'Unknown'}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    v{message.metadata?.versionId || (message as any).version || 'Unknown'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(message.updatedAt), { addSuffix: true })}
                </p>
              </div>
              <div className="flex items-center space-x-1">
                <div
                  className={`h-2 w-2 rounded-full ${message.isValid ? 'bg-green-500' : 'bg-red-500'}`}
                  title={message.isValid ? "Valid" : "Invalid"}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
