"use client"

import { useState, useRef, useEffect } from "react"
import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Eye, Code, Grid3X3, MousePointer } from "lucide-react"
import { HL7DataGrid } from "./hl7-data-grid"

interface InteractiveHL7ViewerProps {
  message: HL7Message
}

interface FieldMapping {
  segmentIndex: number
  fieldIndex: number
  rawPosition: {
    start: number
    end: number
    line: number
  }
  value: string
  description?: string
}

export function InteractiveHL7Viewer({ message }: InteractiveHL7ViewerProps) {
  const [highlightedField, setHighlightedField] = useState<FieldMapping | null>(null)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([])
  const rawTextRef = useRef<HTMLDivElement>(null)
  const structuredRef = useRef<HTMLDivElement>(null)

  const rawContent = message.rawMessage || (message as any).content || ''
  const lines = rawContent.split('\n').filter(line => line.trim())

  useEffect(() => {
    generateFieldMappings()
  }, [rawContent])

  const generateFieldMappings = () => {
    const mappings: FieldMapping[] = []
    let currentPosition = 0

    lines.forEach((line, lineIndex) => {
      const fields = line.split('|')
      let fieldPosition = 0

      fields.forEach((field, fieldIndex) => {
        const fieldStart = currentPosition + fieldPosition
        const fieldEnd = fieldStart + field.length

        mappings.push({
          segmentIndex: lineIndex,
          fieldIndex,
          rawPosition: {
            start: fieldStart,
            end: fieldEnd,
            line: lineIndex
          },
          value: field,
          description: getFieldDescription(fields[0], fieldIndex)
        })

        fieldPosition += field.length + 1 // +1 for the pipe separator
      })

      currentPosition += line.length + 1 // +1 for newline
    })

    setFieldMappings(mappings)
  }

  const getFieldDescription = (segmentType: string, fieldIndex: number): string => {
    const descriptions: Record<string, Record<number, string>> = {
      MSH: {
        0: 'Segment ID',
        1: 'Field Separator',
        2: 'Encoding Characters',
        3: 'Sending Application',
        4: 'Sending Facility',
        5: 'Receiving Application',
        6: 'Receiving Facility',
        7: 'Date/Time of Message',
        8: 'Security',
        9: 'Message Type',
        10: 'Message Control ID',
        11: 'Processing ID',
        12: 'Version ID'
      },
      PID: {
        0: 'Segment ID',
        1: 'Set ID',
        2: 'Patient ID (External)',
        3: 'Patient ID (Internal)',
        4: 'Alternate Patient ID',
        5: 'Patient Name',
        6: 'Mother\'s Maiden Name',
        7: 'Date/Time of Birth',
        8: 'Administrative Sex',
        9: 'Patient Alias',
        10: 'Race',
        11: 'Patient Address',
        12: 'County Code',
        13: 'Phone Number - Home',
        14: 'Phone Number - Business'
      },
      EVN: {
        0: 'Segment ID',
        1: 'Event Type Code',
        2: 'Recorded Date/Time',
        3: 'Date/Time Planned Event',
        4: 'Event Reason Code',
        5: 'Operator ID',
        6: 'Event Occurred'
      }
    }

    return descriptions[segmentType]?.[fieldIndex] || `Field ${fieldIndex}`
  }

  const handleFieldClick = (mapping: FieldMapping) => {
    setHighlightedField(mapping)
    
    // Scroll to the corresponding position in the raw text
    if (rawTextRef.current) {
      const rawTextElement = rawTextRef.current.querySelector(`[data-line="${mapping.rawPosition.line}"]`)
      if (rawTextElement) {
        rawTextElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }

  const handleRawTextClick = (lineIndex: number, charIndex: number) => {
    // Find the field mapping that contains this position
    const mapping = fieldMappings.find(m => 
      m.rawPosition.line === lineIndex &&
      charIndex >= m.rawPosition.start &&
      charIndex <= m.rawPosition.end
    )

    if (mapping) {
      setHighlightedField(mapping)
      
      // Scroll to the corresponding field in the structured view
      if (structuredRef.current) {
        const fieldElement = structuredRef.current.querySelector(
          `[data-segment="${mapping.segmentIndex}"][data-field="${mapping.fieldIndex}"]`
        )
        if (fieldElement) {
          fieldElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }
    }
  }

  const renderStructuredView = () => {
    return (
      <div ref={structuredRef} className="space-y-4">
        {lines.map((line, lineIndex) => {
          const fields = line.split('|')
          const segmentType = fields[0]
          
          return (
            <Card key={lineIndex} className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span className="font-mono">{segmentType}</span>
                  <Badge variant="outline">{fields.length - 1} fields</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {fields.map((field, fieldIndex) => {
                    const mapping = fieldMappings.find(m => 
                      m.segmentIndex === lineIndex && m.fieldIndex === fieldIndex
                    )
                    const isHighlighted = highlightedField?.segmentIndex === lineIndex && 
                                        highlightedField?.fieldIndex === fieldIndex

                    return (
                      <div
                        key={fieldIndex}
                        data-segment={lineIndex}
                        data-field={fieldIndex}
                        className={`p-2 rounded border cursor-pointer transition-colors ${
                          isHighlighted 
                            ? 'bg-yellow-100 border-yellow-400' 
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                        }`}
                        onClick={() => mapping && handleFieldClick(mapping)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            {mapping?.description || `Field ${fieldIndex}`}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {segmentType}.{fieldIndex}
                          </Badge>
                        </div>
                        <div className="font-mono text-sm break-all">
                          {field || <span className="text-gray-400 italic">(empty)</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderRawView = () => {
    return (
      <div ref={rawTextRef} className="space-y-1">
        {lines.map((line, lineIndex) => {
          const fields = line.split('|')
          
          return (
            <div
              key={lineIndex}
              data-line={lineIndex}
              className="font-mono text-sm leading-relaxed"
            >
              {fields.map((field, fieldIndex) => {
                const mapping = fieldMappings.find(m => 
                  m.segmentIndex === lineIndex && m.fieldIndex === fieldIndex
                )
                const isHighlighted = highlightedField?.segmentIndex === lineIndex && 
                                    highlightedField?.fieldIndex === fieldIndex

                return (
                  <span key={fieldIndex}>
                    <span
                      className={`cursor-pointer transition-colors px-1 rounded ${
                        isHighlighted 
                          ? 'bg-yellow-200 text-yellow-900' 
                          : 'hover:bg-blue-100'
                      }`}
                      onClick={() => mapping && handleFieldClick(mapping)}
                      title={mapping?.description}
                    >
                      {field}
                    </span>
                    {fieldIndex < fields.length - 1 && (
                      <span className="text-gray-400">|</span>
                    )}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    )
  }

  const renderGridView = () => {
    const allSegments = lines.map(line => line.split('|'))
    const maxFields = Math.max(...allSegments.map(fields => fields.length))

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 p-2 text-left font-medium">Segment</th>
              {Array.from({ length: maxFields - 1 }, (_, i) => (
                <th key={i} className="border border-gray-300 p-2 text-left font-medium text-xs">
                  Field {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allSegments.map((fields, lineIndex) => (
              <tr key={lineIndex} className="hover:bg-gray-50">
                <td className="border border-gray-300 p-2 font-mono font-medium bg-blue-50">
                  {fields[0]}
                </td>
                {Array.from({ length: maxFields - 1 }, (_, fieldIndex) => {
                  const field = fields[fieldIndex + 1] || ''
                  const mapping = fieldMappings.find(m => 
                    m.segmentIndex === lineIndex && m.fieldIndex === fieldIndex + 1
                  )
                  const isHighlighted = highlightedField?.segmentIndex === lineIndex && 
                                      highlightedField?.fieldIndex === fieldIndex + 1

                  return (
                    <td
                      key={fieldIndex}
                      className={`border border-gray-300 p-2 font-mono text-sm cursor-pointer transition-colors ${
                        isHighlighted 
                          ? 'bg-yellow-100' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={() => mapping && handleFieldClick(mapping)}
                      title={mapping?.description}
                    >
                      {field || <span className="text-gray-400 italic">-</span>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Field Info Panel */}
      {highlightedField && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">
                  {highlightedField.description}
                </h4>
                <p className="text-sm text-gray-600">
                  Segment {lines[highlightedField.segmentIndex]?.split('|')[0]}, Field {highlightedField.fieldIndex}
                </p>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm bg-white px-2 py-1 rounded border">
                  {highlightedField.value || '(empty)'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Interactive Views */}
      <Tabs defaultValue="structured" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="structured" className="flex items-center space-x-2">
              <Eye className="h-4 w-4" />
              <span>Structured</span>
            </TabsTrigger>
            <TabsTrigger value="raw" className="flex items-center space-x-2">
              <Code className="h-4 w-4" />
              <span>Raw</span>
            </TabsTrigger>
            <TabsTrigger value="grid" className="flex items-center space-x-2">
              <Grid3X3 className="h-4 w-4" />
              <span>Grid</span>
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <MousePointer className="h-4 w-4" />
            <span>Click fields to highlight across views</span>
          </div>
        </div>

        <TabsContent value="structured">
          <ScrollArea className="h-96">
            {renderStructuredView()}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="raw">
          <ScrollArea className="h-96 bg-gray-50 p-4 rounded border">
            {renderRawView()}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="grid">
          <HL7DataGrid message={message} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
