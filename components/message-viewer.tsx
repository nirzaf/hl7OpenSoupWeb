"use client"

import { useState } from "react"
import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Clock, User, Building, Hash, Eye, Code, TreePine } from "lucide-react"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageViewerProps {
  message: HL7Message
}

export function MessageViewer({ message }: MessageViewerProps) {
  const [validationResults, setValidationResults] = useState<any>(null)
  const [isValidating, setIsValidating] = useState(false)

  // Use rawMessage if available, fallback to content for backward compatibility
  const rawContent = message.rawMessage || (message as any).content || ''
  const segments = rawContent.split("\n").filter((line) => line.trim())

  const getSegmentColor = (segmentType: string) => {
    const colors: Record<string, string> = {
      MSH: "bg-blue-100 text-blue-800 border-blue-200",
      EVN: "bg-green-100 text-green-800 border-green-200",
      PID: "bg-purple-100 text-purple-800 border-purple-200",
      PV1: "bg-orange-100 text-orange-800 border-orange-200",
      OBX: "bg-pink-100 text-pink-800 border-pink-200",
      NK1: "bg-yellow-100 text-yellow-800 border-yellow-200",
    }
    return colors[segmentType] || "bg-gray-100 text-gray-800 border-gray-200"
  }

  const parseSegment = (segment: string) => {
    const fields = segment.split("|")
    const segmentType = fields[0]
    return { segmentType, fields }
  }

  const formatHL7Content = (content: string) => {
    return content.split('\n').map((line, index) => (
      <div key={index} className="font-mono text-sm hover:bg-muted/50 px-2 py-1 rounded">
        <span className="text-muted-foreground mr-4 select-none">{(index + 1).toString().padStart(2, '0')}</span>
        <span className="text-foreground">{line}</span>
      </div>
    ))
  }

  const renderStructuredView = () => {
    if (!message.parsedMessage) {
      return (
        <div className="space-y-4">
          {segments.map((segment, index) => {
            const { segmentType, fields } = parseSegment(segment)
            return (
              <div key={index} className="space-y-2">
                <div className={`p-3 rounded-lg border ${getSegmentColor(segmentType)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">
                      {segmentType} - {getSegmentDescription(segmentType)}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {fields.length - 1} fields
                    </Badge>
                  </div>
                  <div className="grid gap-2">
                    {fields.slice(1).map((field, fieldIndex) => (
                      <div key={fieldIndex} className="flex items-start space-x-2">
                        <span className="text-xs font-mono bg-white/50 px-1 rounded min-w-[2rem] text-center">
                          {fieldIndex + 1}
                        </span>
                        <span className="text-sm font-mono flex-1 break-all">
                          {field || <span className="text-muted-foreground italic">{"<empty>"}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                {index < segments.length - 1 && <Separator />}
              </div>
            )
          })}
        </div>
      )
    }

    const renderSegment = (segmentName: string, segmentData: any, level = 0) => {
      const indent = level * 20

      return (
        <div key={segmentName} className="border rounded-lg p-3 mb-2" style={{ marginLeft: indent }}>
          <div className="flex items-center space-x-2 mb-2">
            <Badge variant="outline" className="font-mono">
              {segmentName}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {getSegmentDescription(segmentName)}
            </span>
          </div>

          {typeof segmentData === 'object' && segmentData !== null ? (
            <div className="space-y-1">
              {Object.entries(segmentData).map(([fieldKey, fieldValue]) => (
                <div key={fieldKey} className="flex items-start space-x-2 text-sm">
                  <span className="font-mono text-muted-foreground min-w-[80px]">
                    {fieldKey}:
                  </span>
                  <span className="flex-1 break-all">
                    {typeof fieldValue === 'object'
                      ? JSON.stringify(fieldValue, null, 2)
                      : String(fieldValue)
                    }
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {String(segmentData)}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-2">
        {Object.entries(message.parsedMessage).map(([segmentName, segmentData]) =>
          renderSegment(segmentName, segmentData)
        )}
      </div>
    )
  }

  const validateMessage = async () => {
    setIsValidating(true)
    try {
      const response = await fetch('/api/messages/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId: message._id })
      })
      const result = await response.json()
      setValidationResults(result.data)
    } catch (error) {
      console.error('Validation failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Message Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Hash className="h-5 w-5" />
              <span>{message.name}</span>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Badge variant={message.isValid ? "default" : "destructive"}>
                {message.isValid ? "Valid" : "Invalid"}
              </Badge>
              <Badge variant="outline">{message.metadata?.versionId || (message as any).version || 'Unknown'}</Badge>
              <Badge variant="secondary">{message.metadata?.messageType || (message as any).messageType || 'Unknown'}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Created</p>
                <p className="text-muted-foreground">
                  {new Date(message.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Last Modified</p>
                <p className="text-muted-foreground">
                  {new Date(message.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Building className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Sending Facility</p>
                <p className="text-muted-foreground">{message.metadata?.sendingFacility || 'Unknown'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Control ID</p>
                <p className="text-muted-foreground">{message.metadata?.controlId || 'Unknown'}</p>
              </div>
            </div>
          </div>
          {message.metadata?.tags && message.metadata.tags.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-wrap gap-2">
                {message.metadata.tags.map((tag, index) => (
                  <Badge key={index} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Message Content Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Message Content</CardTitle>
            <Button
              onClick={validateMessage}
              disabled={isValidating}
              size="sm"
              variant="outline"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="structured" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="structured" className="flex items-center space-x-2">
                <TreePine className="h-4 w-4" />
                <span>Structured View</span>
              </TabsTrigger>
              <TabsTrigger value="raw" className="flex items-center space-x-2">
                <Eye className="h-4 w-4" />
                <span>Raw View</span>
              </TabsTrigger>
              <TabsTrigger value="highlighted" className="flex items-center space-x-2">
                <Code className="h-4 w-4" />
                <span>Syntax Highlighted</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="structured" className="mt-4">
              <ScrollArea className="h-96 w-full rounded border p-4">
                {renderStructuredView()}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="raw" className="mt-4">
              <ScrollArea className="h-96 w-full rounded border p-4">
                <div className="space-y-1">
                  {formatHL7Content(rawContent)}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="highlighted" className="mt-4">
              <ScrollArea className="h-96 w-full rounded border">
                <SyntaxHighlighter
                  language="text"
                  style={tomorrow}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent'
                  }}
                  showLineNumbers
                  lineNumberStyle={{ color: '#6b7280', fontSize: '0.875rem' }}
                >
                  {rawContent}
                </SyntaxHighlighter>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className={validationResults.isValid ? "text-green-600" : "text-red-600"}>
              Validation Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4 text-sm">
                <Badge variant={validationResults.isValid ? "default" : "destructive"}>
                  {validationResults.isValid ? "Valid" : "Invalid"}
                </Badge>
                <span>Errors: {validationResults.summary.totalErrors}</span>
                <span>Warnings: {validationResults.summary.totalWarnings}</span>
                <span>Validation Time: {validationResults.summary.validationTime}ms</span>
              </div>

              {validationResults.results.length > 0 && (
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
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function getSegmentDescription(segmentType: string): string {
  const descriptions: Record<string, string> = {
    MSH: "Message Header",
    EVN: "Event Type",
    PID: "Patient Identification",
    PV1: "Patient Visit",
    OBX: "Observation/Result",
    NK1: "Next of Kin",
    AL1: "Patient Allergy Information",
    DG1: "Diagnosis",
    PR1: "Procedures",
    ORC: "Common Order",
    OBR: "Observation Request",
  }
  return descriptions[segmentType] || "Unknown Segment"
}
