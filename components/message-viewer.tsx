"use client"

import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface MessageViewerProps {
  message: HL7Message
}

export function MessageViewer({ message }: MessageViewerProps) {
  const segments = message.content.split("\n").filter((line) => line.trim())

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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{message.name}</CardTitle>
          <div className="flex space-x-2">
            <Badge>{message.messageType}</Badge>
            <Badge variant="outline">HL7 v{message.version}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
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
