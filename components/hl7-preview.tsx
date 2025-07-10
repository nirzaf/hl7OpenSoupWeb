"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  ChevronDown, 
  ChevronRight, 
  Clock, 
  Building, 
  User, 
  Hash, 
  AlertTriangle,
  Info,
  CheckCircle
} from "lucide-react"
import { HL7Service } from "@/lib/hl7Service"
import { HL7_V25_SCHEMA } from "@/lib/hl7-validator"

interface HL7PreviewProps {
  content: string
  className?: string
}

interface ParsedSegment {
  type: string
  fields: string[]
  description: string
  color: string
}

interface FieldInfo {
  position: number
  name: string
  value: string
  dataType?: string
  required?: boolean
  description?: string
}

export function HL7Preview({ content, className = "" }: HL7PreviewProps) {
  const [expandedSegments, setExpandedSegments] = useState<Set<string>>(new Set(['MSH']))
  
  const hl7Service = new HL7Service()
  
  const parsedData = useMemo(() => {
    if (!content.trim()) {
      return { segments: [], metadata: null, isValid: false }
    }
    
    try {
      const parsed = hl7Service.parseMessage(content)
      const segments = parseSegments(content)
      return {
        segments,
        metadata: parsed.metadata,
        isValid: true
      }
    } catch (error) {
      return {
        segments: parseSegments(content),
        metadata: null,
        isValid: false,
        error: error instanceof Error ? error.message : 'Unknown parsing error'
      }
    }
  }, [content])

  const parseSegments = (hl7Text: string): ParsedSegment[] => {
    const lines = hl7Text.split('\n').filter(line => line.trim())
    return lines.map(line => {
      const fields = line.split('|')
      const segmentType = fields[0] || 'UNK'
      
      return {
        type: segmentType,
        fields,
        description: getSegmentDescription(segmentType),
        color: getSegmentColor(segmentType)
      }
    })
  }

  const getSegmentDescription = (segmentType: string): string => {
    const descriptions: Record<string, string> = {
      MSH: "Message Header",
      EVN: "Event Type",
      PID: "Patient Identification", 
      PV1: "Patient Visit",
      OBX: "Observation/Result",
      OBR: "Observation Request",
      ORC: "Common Order",
      NK1: "Next of Kin",
      AL1: "Patient Allergy Information",
      DG1: "Diagnosis",
      PR1: "Procedures",
      GT1: "Guarantor",
      IN1: "Insurance",
      ZU1: "Additional PV Info (UK ITK)",
      ZU3: "Attendance Details (UK ITK)"
    }
    return descriptions[segmentType] || "Unknown Segment"
  }

  const getSegmentColor = (segmentType: string): string => {
    const colors: Record<string, string> = {
      MSH: "bg-blue-50 border-blue-200 text-blue-900",
      EVN: "bg-green-50 border-green-200 text-green-900",
      PID: "bg-purple-50 border-purple-200 text-purple-900",
      PV1: "bg-orange-50 border-orange-200 text-orange-900",
      OBX: "bg-pink-50 border-pink-200 text-pink-900",
      OBR: "bg-cyan-50 border-cyan-200 text-cyan-900",
      ORC: "bg-indigo-50 border-indigo-200 text-indigo-900",
      NK1: "bg-yellow-50 border-yellow-200 text-yellow-900",
      AL1: "bg-red-50 border-red-200 text-red-900",
      DG1: "bg-emerald-50 border-emerald-200 text-emerald-900",
      PR1: "bg-violet-50 border-violet-200 text-violet-900",
      GT1: "bg-amber-50 border-amber-200 text-amber-900",
      IN1: "bg-teal-50 border-teal-200 text-teal-900"
    }
    return colors[segmentType] || "bg-gray-50 border-gray-200 text-gray-900"
  }

  const getFieldInfo = (segmentType: string, fieldIndex: number, value: string): FieldInfo => {
    const segmentDef = HL7_V25_SCHEMA.segments[segmentType]
    const fieldDef = segmentDef?.fields.find(f => f.position === fieldIndex + 1)
    
    return {
      position: fieldIndex + 1,
      name: fieldDef?.name || `Field ${fieldIndex + 1}`,
      value: value || '',
      dataType: fieldDef?.dataType,
      required: fieldDef?.required,
      description: fieldDef?.description
    }
  }

  const toggleSegment = (segmentType: string) => {
    const newExpanded = new Set(expandedSegments)
    if (newExpanded.has(segmentType)) {
      newExpanded.delete(segmentType)
    } else {
      newExpanded.add(segmentType)
    }
    setExpandedSegments(newExpanded)
  }

  const expandAll = () => {
    setExpandedSegments(new Set(parsedData.segments.map(s => s.type)))
  }

  const collapseAll = () => {
    setExpandedSegments(new Set())
  }

  if (!content.trim()) {
    return (
      <div className={`border rounded-lg p-8 text-center text-muted-foreground ${className}`}>
        <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No HL7 Content</p>
        <p className="text-sm">Enter HL7 message content in the editor to see the preview</p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header with metadata and controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Hash className="h-5 w-5" />
              <span>HL7 Message Preview</span>
              {!parsedData.isValid && (
                <Badge variant="destructive" className="ml-2">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Parse Error
                </Badge>
              )}
              {parsedData.isValid && (
                <Badge variant="default" className="ml-2">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Valid
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>
                Collapse All
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {parsedData.metadata && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Message Type</p>
                  <p className="text-muted-foreground">{parsedData.metadata.messageType}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Building className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Sending Facility</p>
                  <p className="text-muted-foreground">{parsedData.metadata.sendingFacility}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Timestamp</p>
                  <p className="text-muted-foreground">
                    {parsedData.metadata.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Version</p>
                  <p className="text-muted-foreground">HL7 v{parsedData.metadata.versionId}</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Error display */}
      {parsedData.error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">Parsing Error</p>
                <p className="text-sm text-red-700 mt-1">{parsedData.error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Segments */}
      <div className="space-y-3">
        {parsedData.segments.map((segment, index) => (
          <Card key={`${segment.type}-${index}`} className={`border ${segment.color}`}>
            <Collapsible 
              open={expandedSegments.has(segment.type)} 
              onOpenChange={() => toggleSegment(segment.type)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {expandedSegments.has(segment.type) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <div>
                        <CardTitle className="text-lg">
                          {segment.type} - {segment.description}
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {segment.fields.length - 1} fields
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Segment {index + 1}
                    </Badge>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {segment.fields.slice(1).map((field, fieldIndex) => {
                      const fieldInfo = getFieldInfo(segment.type, fieldIndex, field)
                      return (
                        <div key={fieldIndex} className="border rounded-lg p-3 bg-background">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary" className="text-xs">
                                {fieldInfo.position}
                              </Badge>
                              <span className="font-medium text-sm">{fieldInfo.name}</span>
                              {fieldInfo.required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                              {fieldInfo.dataType && (
                                <Badge variant="outline" className="text-xs">{fieldInfo.dataType}</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="font-mono text-sm bg-muted p-2 rounded border">
                              {fieldInfo.value || <span className="text-muted-foreground italic">Empty</span>}
                            </div>
                            
                            {fieldInfo.description && (
                              <p className="text-xs text-muted-foreground">{fieldInfo.description}</p>
                            )}
                            
                            {/* Parse components if field contains ^ separator */}
                            {fieldInfo.value && fieldInfo.value.includes('^') && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Components:</p>
                                <div className="grid gap-1">
                                  {fieldInfo.value.split('^').map((component, compIndex) => (
                                    <div key={compIndex} className="flex items-center space-x-2 text-xs">
                                      <Badge variant="outline" className="text-xs w-8 h-5 flex items-center justify-center">
                                        {compIndex + 1}
                                      </Badge>
                                      <span className="font-mono">{component || <span className="text-muted-foreground italic">Empty</span>}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  )
}
