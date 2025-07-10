"use client"

import { useState, useMemo } from "react"
import type { HL7Message } from "@/types/hl7"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Eye, 
  Grid3X3,
  ChevronDown,
  ChevronRight
} from "lucide-react"

interface HL7DataGridProps {
  message: HL7Message
  editable?: boolean
  onFieldEdit?: (segmentIndex: number, fieldIndex: number, newValue: string) => void
}

interface GridRow {
  segmentType: string
  segmentIndex: number
  fields: Array<{
    index: number
    value: string
    description: string
    dataType?: string
    required?: boolean
  }>
}

interface FieldDefinition {
  name: string
  dataType: string
  required: boolean
  description: string
}

export function HL7DataGrid({ message, editable = false, onFieldEdit }: HL7DataGridProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSegment, setSelectedSegment] = useState<string>("all")
  const [editingCell, setEditingCell] = useState<{segment: number, field: number} | null>(null)
  const [editValue, setEditValue] = useState("")
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed")

  const rawContent = message.rawMessage || (message as any).content || ''
  const lines = rawContent.split('\n').filter(line => line.trim())

  const fieldDefinitions: Record<string, Record<number, FieldDefinition>> = {
    MSH: {
      1: { name: "Field Separator", dataType: "ST", required: true, description: "Field separator character" },
      2: { name: "Encoding Characters", dataType: "ST", required: true, description: "Component separator, repetition separator, escape character, subcomponent separator" },
      3: { name: "Sending Application", dataType: "HD", required: false, description: "Sending application name" },
      4: { name: "Sending Facility", dataType: "HD", required: false, description: "Sending facility name" },
      5: { name: "Receiving Application", dataType: "HD", required: false, description: "Receiving application name" },
      6: { name: "Receiving Facility", dataType: "HD", required: false, description: "Receiving facility name" },
      7: { name: "Date/Time of Message", dataType: "TS", required: true, description: "Date and time message was created" },
      8: { name: "Security", dataType: "ST", required: false, description: "Security information" },
      9: { name: "Message Type", dataType: "MSG", required: true, description: "Message type and trigger event" },
      10: { name: "Message Control ID", dataType: "ST", required: true, description: "Unique message identifier" },
      11: { name: "Processing ID", dataType: "PT", required: true, description: "Processing ID (P=Production, T=Test, D=Debug)" },
      12: { name: "Version ID", dataType: "VID", required: true, description: "HL7 version number" }
    },
    PID: {
      1: { name: "Set ID", dataType: "SI", required: false, description: "Sequence number for patient identification" },
      2: { name: "Patient ID (External)", dataType: "CX", required: false, description: "External patient identifier" },
      3: { name: "Patient ID (Internal)", dataType: "CX", required: true, description: "Internal patient identifier" },
      4: { name: "Alternate Patient ID", dataType: "CX", required: false, description: "Alternate patient identifier" },
      5: { name: "Patient Name", dataType: "XPN", required: true, description: "Patient's full name" },
      6: { name: "Mother's Maiden Name", dataType: "XPN", required: false, description: "Mother's maiden name" },
      7: { name: "Date/Time of Birth", dataType: "TS", required: false, description: "Patient's date of birth" },
      8: { name: "Administrative Sex", dataType: "IS", required: false, description: "Patient's gender (M/F/O/U)" },
      9: { name: "Patient Alias", dataType: "XPN", required: false, description: "Patient alias names" },
      10: { name: "Race", dataType: "CE", required: false, description: "Patient's race" },
      11: { name: "Patient Address", dataType: "XAD", required: false, description: "Patient's address" },
      12: { name: "County Code", dataType: "IS", required: false, description: "County code" },
      13: { name: "Phone Number - Home", dataType: "XTN", required: false, description: "Home phone number" },
      14: { name: "Phone Number - Business", dataType: "XTN", required: false, description: "Business phone number" }
    },
    EVN: {
      1: { name: "Event Type Code", dataType: "ID", required: false, description: "Event type code" },
      2: { name: "Recorded Date/Time", dataType: "TS", required: true, description: "Date/time event was recorded" },
      3: { name: "Date/Time Planned Event", dataType: "TS", required: false, description: "Planned date/time of event" },
      4: { name: "Event Reason Code", dataType: "IS", required: false, description: "Reason for the event" },
      5: { name: "Operator ID", dataType: "XCN", required: false, description: "Operator who recorded the event" },
      6: { name: "Event Occurred", dataType: "TS", required: false, description: "Date/time event actually occurred" }
    }
  }

  const gridData = useMemo(() => {
    const rows: GridRow[] = []
    
    lines.forEach((line, segmentIndex) => {
      const fields = line.split('|')
      const segmentType = fields[0]
      
      if (selectedSegment !== "all" && segmentType !== selectedSegment) {
        return
      }

      const segmentFields = fields.slice(1).map((value, index) => {
        const fieldIndex = index + 1
        const fieldDef = fieldDefinitions[segmentType]?.[fieldIndex]
        
        return {
          index: fieldIndex,
          value,
          description: fieldDef?.name || `Field ${fieldIndex}`,
          dataType: fieldDef?.dataType,
          required: fieldDef?.required || false
        }
      })

      // Filter by search term
      if (searchTerm) {
        const matchesSearch = segmentType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            segmentFields.some(field => 
                              field.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              field.description.toLowerCase().includes(searchTerm.toLowerCase())
                            )
        if (!matchesSearch) return
      }

      rows.push({
        segmentType,
        segmentIndex,
        fields: segmentFields
      })
    })

    return rows
  }, [lines, selectedSegment, searchTerm])

  const uniqueSegments = useMemo(() => {
    const segments = new Set(lines.map(line => line.split('|')[0]))
    return Array.from(segments).sort()
  }, [lines])

  const maxFields = useMemo(() => {
    return Math.max(...lines.map(line => line.split('|').length - 1), 0)
  }, [lines])

  const handleCellEdit = (segmentIndex: number, fieldIndex: number, currentValue: string) => {
    setEditingCell({ segment: segmentIndex, field: fieldIndex })
    setEditValue(currentValue)
  }

  const handleSaveEdit = () => {
    if (editingCell && onFieldEdit) {
      onFieldEdit(editingCell.segment, editingCell.field, editValue)
    }
    setEditingCell(null)
    setEditValue("")
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue("")
  }

  const renderCell = (row: GridRow, field: any, fieldIndex: number) => {
    const isEditing = editingCell?.segment === row.segmentIndex && editingCell?.field === field.index
    const isEmpty = !field.value.trim()
    
    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit()
              if (e.key === 'Escape') handleCancelEdit()
            }}
            autoFocus
          />
          <Button size="sm" variant="outline" onClick={handleSaveEdit} className="h-6 w-6 p-0">
            ✓
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-6 w-6 p-0">
            ✕
          </Button>
        </div>
      )
    }

    return (
      <div className="group relative">
        <div 
          className={`font-mono text-xs p-1 rounded cursor-pointer transition-colors ${
            isEmpty ? 'text-gray-400 italic' : 'text-gray-900'
          } ${editable ? 'hover:bg-blue-50' : ''}`}
          onClick={() => editable && handleCellEdit(row.segmentIndex, field.index, field.value)}
          title={`${field.description}${field.dataType ? ` (${field.dataType})` : ''}${field.required ? ' - Required' : ''}`}
        >
          {field.value || '(empty)'}
        </div>
        {viewMode === "detailed" && (
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 text-white text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {field.description}
            {field.dataType && <span className="ml-2 text-blue-300">({field.dataType})</span>}
            {field.required && <span className="ml-1 text-red-300">*</span>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Grid3X3 className="h-5 w-5" />
              <span>HL7 Data Grid</span>
              <Badge variant="outline">{gridData.length} segments</Badge>
            </CardTitle>
            <div className="flex items-center space-x-2">
              <Select value={viewMode} onValueChange={(value: any) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="detailed">Detailed</SelectItem>
                </SelectContent>
              </Select>
              {editable && (
                <Badge variant="secondary">Editable</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search segments and fields..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedSegment} onValueChange={setSelectedSegment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All segments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Segments</SelectItem>
                {uniqueSegments.map(segment => (
                  <SelectItem key={segment} value={segment}>{segment}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Data Grid */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="w-20 font-medium">Segment</TableHead>
                  {Array.from({ length: maxFields }, (_, i) => (
                    <TableHead key={i} className="min-w-32 font-medium text-xs">
                      Field {i + 1}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {gridData.map((row) => (
                  <TableRow key={row.segmentIndex} className="hover:bg-gray-50">
                    <TableCell className="font-mono font-medium bg-blue-50 sticky left-0 z-10">
                      <div className="flex items-center space-x-2">
                        <span>{row.segmentType}</span>
                        <Badge variant="outline" className="text-xs">
                          {row.fields.length}
                        </Badge>
                      </div>
                    </TableCell>
                    {Array.from({ length: maxFields }, (_, fieldIndex) => {
                      const field = row.fields[fieldIndex]
                      return (
                        <TableCell key={fieldIndex} className="p-2 relative">
                          {field ? renderCell(row, field, fieldIndex) : (
                            <span className="text-gray-300 text-xs italic">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{gridData.length}</div>
            <div className="text-sm text-muted-foreground">Segments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{uniqueSegments.length}</div>
            <div className="text-sm text-muted-foreground">Segment Types</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{maxFields}</div>
            <div className="text-sm text-muted-foreground">Max Fields</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {gridData.reduce((acc, row) => acc + row.fields.filter(f => f.value.trim()).length, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Populated Fields</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
