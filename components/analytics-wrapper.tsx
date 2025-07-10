"use client"

import { useState, useEffect } from "react"
import type { HL7Message } from "@/types/hl7"
import { StatisticsDashboard } from "./statistics-dashboard"

export function AnalyticsWrapper() {
  const [messages, setMessages] = useState<HL7Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMessages()
  }, [])

  const loadMessages = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Fetch all messages for analytics (we might want to paginate this in production)
      const response = await fetch("/api/messages?limit=1000")
      
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`)
      }
      
      const result = await response.json()
      const data = result.data || result
      
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Failed to load messages for analytics:", error)
      setError(error instanceof Error ? error.message : 'Failed to load messages')
      setMessages([])
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error loading analytics data</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button 
            onClick={loadMessages}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return <StatisticsDashboard messages={messages} />
}
