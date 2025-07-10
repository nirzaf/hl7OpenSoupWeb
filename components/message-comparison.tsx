"use client"

import { useState, useEffect } from "react"
import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ArrowLeftRight, Eye, Code, Grid3X3 } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MessageComparisonProps {
  messages: HL7Message[]
  initialMessage1?: HL7Message
  initialMessage2?: HL7Message
}

interface DiffResult {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  segment: string
  field?: number
  oldValue?: string
  newValue?: string
  line: number
}

export function MessageComparison({ messages, initialMessage1, initialMessage2 }: MessageComparisonProps) {
  const [message1, setMessage1] = useState<HL7Message | null>(initialMessage1 || null)
  const [message2, setMessage2] = useState<HL7Message | null>(initialMessage2 || null)
  const [diffResults, setDiffResults] = useState<DiffResult[]>([])
  const [isComparing, setIsComparing] = useState(false)

  useEffect(() => {
    if (message1 && message2) {
      performComparison()
    }
  }, [message1, message2])

  const performComparison = () => {
    if (!message1 || !message2) return

    setIsComparing(true)
    
    const content1 = message1.rawMessage || (message1 as any).content || ''
    const content2 = message2.rawMessage || (message2 as any).content || ''
    
    const lines1 = content1.split('\n').filter(line => line.trim())
    const lines2 = content2.split('\n').filter(line => line.trim())
    
    const results: DiffResult[] = []
    const maxLines = Math.max(lines1.length, lines2.length)
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || ''
      const line2 = lines2[i] || ''
      
      if (!line1 && line2) {
        // Added line
        const segment = line2.split('|')[0]
        results.push({
          type: 'added',
          segment,
          newValue: line2,
          line: i
        })
      } else if (line1 && !line2) {
        // Removed line
        const segment = line1.split('|')[0]
        results.push({
          type: 'removed',
          segment,
          oldValue: line1,
          line: i
        })
      } else if (line1 !== line2) {
        // Modified line
        const segment = line1.split('|')[0]
        const fields1 = line1.split('|')
        const fields2 = line2.split('|')
        
        results.push({
          type: 'modified',
          segment,
          oldValue: line1,
          newValue: line2,
          line: i
        })
        
        // Check individual fields for more granular differences
        const maxFields = Math.max(fields1.length, fields2.length)
        for (let j = 0; j < maxFields; j++) {
          if (fields1[j] !== fields2[j]) {
            results.push({
              type: 'modified',
              segment,
              field: j,
              oldValue: fields1[j] || '',
              newValue: fields2[j] || '',
              line: i
            })
          }
        }
      } else {
        // Unchanged line
        const segment = line1.split('|')[0]
        results.push({
          type: 'unchanged',
          segment,
          oldValue: line1,
          newValue: line2,
          line: i
        })
      }
    }
    
    setDiffResults(results)
    setIsComparing(false)
  }

  const renderDiffLine = (diff: DiffResult, side: 'left' | 'right') => {
    const value = side === 'left' ? diff.oldValue : diff.newValue
    if (!value && diff.type === (side === 'left' ? 'added' : 'removed')) {
      return null
    }

    const getLineClass = () => {
      switch (diff.type) {
        case 'added':
          return side === 'right' ? 'bg-green-50 border-l-4 border-green-500' : ''
        case 'removed':
          return side === 'left' ? 'bg-red-50 border-l-4 border-red-500' : ''
        case 'modified':
          return 'bg-yellow-50 border-l-4 border-yellow-500'
        default:
          return 'bg-gray-50'
      }
    }

    return (
      <div key={`${side}-${diff.line}`} className={`p-2 font-mono text-sm ${getLineClass()}`}>
        {value || (diff.type === 'added' && side === 'left' ? '(empty)' : diff.type === 'removed' && side === 'right' ? '(empty)' : '')}
      </div>
    )
  }

  const getDiffSummary = () => {
    const added = diffResults.filter(d => d.type === 'added').length
    const removed = diffResults.filter(d => d.type === 'removed').length
    const modified = diffResults.filter(d => d.type === 'modified' && !d.field).length
    
    return { added, removed, modified }
  }

  return (
    <div className="space-y-6">
      {/* Message Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ArrowLeftRight className="h-5 w-5" />
            <span>Message Comparison</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Message 1 (Original)</label>
              <Select value={message1?._id || ''} onValueChange={(value) => {
                const selected = messages.find(m => m._id === value)
                setMessage1(selected || null)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select first message" />
                </SelectTrigger>
                <SelectContent>
                  {messages.map((message) => (
                    <SelectItem key={message._id} value={message._id || ''}>
                      {message.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Message 2 (Comparison)</label>
              <Select value={message2?._id || ''} onValueChange={(value) => {
                const selected = messages.find(m => m._id === value)
                setMessage2(selected || null)
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select second message" />
                </SelectTrigger>
                <SelectContent>
                  {messages.map((message) => (
                    <SelectItem key={message._id} value={message._id || ''}>
                      {message.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {message1 && message2 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="flex space-x-4">
                {(() => {
                  const summary = getDiffSummary()
                  return (
                    <>
                      <Badge variant="destructive">{summary.removed} removed</Badge>
                      <Badge variant="secondary">{summary.modified} modified</Badge>
                      <Badge variant="default">{summary.added} added</Badge>
                    </>
                  )
                })()}
              </div>
              <Button onClick={performComparison} disabled={isComparing}>
                {isComparing ? 'Comparing...' : 'Refresh Comparison'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {message1 && message2 && diffResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="side-by-side" className="space-y-4">
              <TabsList>
                <TabsTrigger value="side-by-side">Side by Side</TabsTrigger>
                <TabsTrigger value="unified">Unified View</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
              </TabsList>

              <TabsContent value="side-by-side">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">{message1.name}</h4>
                    <ScrollArea className="h-96 border rounded">
                      {diffResults.filter(d => d.oldValue || d.type === 'removed').map((diff, index) => 
                        renderDiffLine(diff, 'left')
                      )}
                    </ScrollArea>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">{message2.name}</h4>
                    <ScrollArea className="h-96 border rounded">
                      {diffResults.filter(d => d.newValue || d.type === 'added').map((diff, index) => 
                        renderDiffLine(diff, 'right')
                      )}
                    </ScrollArea>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="unified">
                <ScrollArea className="h-96 border rounded">
                  <div className="p-4 space-y-1">
                    {diffResults.filter(d => !d.field).map((diff, index) => (
                      <div key={index} className="space-y-1">
                        {diff.type === 'removed' && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-2 font-mono text-sm">
                            <span className="text-red-600">- </span>{diff.oldValue}
                          </div>
                        )}
                        {diff.type === 'added' && (
                          <div className="bg-green-50 border-l-4 border-green-500 p-2 font-mono text-sm">
                            <span className="text-green-600">+ </span>{diff.newValue}
                          </div>
                        )}
                        {diff.type === 'modified' && (
                          <>
                            <div className="bg-red-50 border-l-4 border-red-500 p-2 font-mono text-sm">
                              <span className="text-red-600">- </span>{diff.oldValue}
                            </div>
                            <div className="bg-green-50 border-l-4 border-green-500 p-2 font-mono text-sm">
                              <span className="text-green-600">+ </span>{diff.newValue}
                            </div>
                          </>
                        )}
                        {diff.type === 'unchanged' && (
                          <div className="p-2 font-mono text-sm text-gray-600">
                            <span className="text-gray-400">  </span>{diff.oldValue}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="summary">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{getDiffSummary().removed}</div>
                        <div className="text-sm text-muted-foreground">Removed Lines</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-600">{getDiffSummary().modified}</div>
                        <div className="text-sm text-muted-foreground">Modified Lines</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{getDiffSummary().added}</div>
                        <div className="text-sm text-muted-foreground">Added Lines</div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Segment Changes</h4>
                    {Object.entries(
                      diffResults
                        .filter(d => d.type !== 'unchanged' && !d.field)
                        .reduce((acc, diff) => {
                          acc[diff.segment] = (acc[diff.segment] || 0) + 1
                          return acc
                        }, {} as Record<string, number>)
                    ).map(([segment, count]) => (
                      <div key={segment} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <span className="font-mono">{segment}</span>
                        <Badge variant="outline">{count} changes</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
