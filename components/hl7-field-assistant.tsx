"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Search, BookOpen, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import type { LookupTable } from "@/types/hl7"

interface HL7FieldAssistantProps {
  segmentType: string
  fieldIndex: number
  currentValue: string
  onValueChange: (value: string) => void
  className?: string
}

interface StandardCode {
  code: string
  description: string
  category?: string
}

export function HL7FieldAssistant({ 
  segmentType, 
  fieldIndex, 
  currentValue, 
  onValueChange,
  className = ""
}: HL7FieldAssistantProps) {
  const [lookupTables, setLookupTables] = useState<LookupTable[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  // Standard HL7 codes for common fields
  const standardCodes: Record<string, Record<number, StandardCode[]>> = {
    MSH: {
      9: [ // Message Type
        { code: "ADT^A01", description: "Admit/visit notification", category: "ADT" },
        { code: "ADT^A02", description: "Transfer a patient", category: "ADT" },
        { code: "ADT^A03", description: "Discharge/end visit", category: "ADT" },
        { code: "ADT^A04", description: "Register a patient", category: "ADT" },
        { code: "ADT^A05", description: "Pre-admit a patient", category: "ADT" },
        { code: "ADT^A08", description: "Update patient information", category: "ADT" },
        { code: "ORM^O01", description: "Order message", category: "ORM" },
        { code: "ORU^R01", description: "Observation result", category: "ORU" },
        { code: "SIU^S12", description: "Notification of new appointment booking", category: "SIU" },
        { code: "SIU^S13", description: "Notification of appointment rescheduling", category: "SIU" },
        { code: "SIU^S15", description: "Notification of appointment cancellation", category: "SIU" }
      ],
      11: [ // Processing ID
        { code: "P", description: "Production", category: "Processing" },
        { code: "T", description: "Training", category: "Processing" },
        { code: "D", description: "Debugging", category: "Processing" }
      ],
      12: [ // Version ID
        { code: "2.3", description: "HL7 Version 2.3", category: "Version" },
        { code: "2.4", description: "HL7 Version 2.4", category: "Version" },
        { code: "2.5", description: "HL7 Version 2.5", category: "Version" },
        { code: "2.5.1", description: "HL7 Version 2.5.1", category: "Version" },
        { code: "2.6", description: "HL7 Version 2.6", category: "Version" },
        { code: "2.7", description: "HL7 Version 2.7", category: "Version" },
        { code: "2.8", description: "HL7 Version 2.8", category: "Version" }
      ]
    },
    PID: {
      8: [ // Administrative Sex
        { code: "M", description: "Male", category: "Gender" },
        { code: "F", description: "Female", category: "Gender" },
        { code: "O", description: "Other", category: "Gender" },
        { code: "U", description: "Unknown", category: "Gender" },
        { code: "A", description: "Ambiguous", category: "Gender" },
        { code: "N", description: "Not applicable", category: "Gender" }
      ],
      10: [ // Race
        { code: "1002-5", description: "American Indian or Alaska Native", category: "Race" },
        { code: "2028-9", description: "Asian", category: "Race" },
        { code: "2054-5", description: "Black or African American", category: "Race" },
        { code: "2076-8", description: "Native Hawaiian or Other Pacific Islander", category: "Race" },
        { code: "2106-3", description: "White", category: "Race" },
        { code: "2131-1", description: "Other Race", category: "Race" }
      ]
    },
    EVN: {
      1: [ // Event Type Code
        { code: "A01", description: "Admit/visit notification", category: "Event" },
        { code: "A02", description: "Transfer a patient", category: "Event" },
        { code: "A03", description: "Discharge/end visit", category: "Event" },
        { code: "A04", description: "Register a patient", category: "Event" },
        { code: "A05", description: "Pre-admit a patient", category: "Event" },
        { code: "A08", description: "Update patient information", category: "Event" }
      ]
    }
  }

  useEffect(() => {
    loadLookupTables()
  }, [])

  const loadLookupTables = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/lookuptables")
      const result = await response.json()
      setLookupTables(result.data || [])
    } catch (error) {
      console.error("Failed to load lookup tables:", error)
      setLookupTables([])
    } finally {
      setIsLoading(false)
    }
  }

  const availableCodes = useMemo(() => {
    const codes: StandardCode[] = []
    
    // Add standard codes for this field
    const standardFieldCodes = standardCodes[segmentType]?.[fieldIndex] || []
    codes.push(...standardFieldCodes)
    
    // Add codes from lookup tables (if any match this field)
    const relevantTables = lookupTables.filter(table => 
      table.name.toLowerCase().includes(segmentType.toLowerCase()) ||
      table.description.toLowerCase().includes(`field ${fieldIndex}`) ||
      table.description.toLowerCase().includes(getFieldName(segmentType, fieldIndex).toLowerCase())
    )
    
    relevantTables.forEach(table => {
      table.data.forEach(item => {
        codes.push({
          code: item.key,
          description: item.value,
          category: table.name
        })
      })
    })
    
    return codes
  }, [segmentType, fieldIndex, lookupTables])

  const filteredCodes = useMemo(() => {
    if (!searchValue) return availableCodes
    
    return availableCodes.filter(code =>
      code.code.toLowerCase().includes(searchValue.toLowerCase()) ||
      code.description.toLowerCase().includes(searchValue.toLowerCase()) ||
      code.category?.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [availableCodes, searchValue])

  const getFieldName = (segment: string, field: number): string => {
    const fieldNames: Record<string, Record<number, string>> = {
      MSH: {
        9: "Message Type",
        11: "Processing ID",
        12: "Version ID"
      },
      PID: {
        8: "Administrative Sex",
        10: "Race"
      },
      EVN: {
        1: "Event Type Code"
      }
    }
    
    return fieldNames[segment]?.[field] || `Field ${field}`
  }

  const getFieldDescription = (segment: string, field: number): string => {
    const descriptions: Record<string, Record<number, string>> = {
      MSH: {
        9: "Identifies the message type and trigger event",
        11: "Indicates whether this is production, test, or debug data",
        12: "Specifies the HL7 version used for this message"
      },
      PID: {
        8: "Patient's administrative gender",
        10: "Patient's race using standard codes"
      },
      EVN: {
        1: "Code identifying the type of event"
      }
    }
    
    return descriptions[segment]?.[field] || "No description available"
  }

  if (availableCodes.length === 0) {
    return null // Don't show assistant if no codes are available
  }

  return (
    <Card className={cn("border-blue-200", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center space-x-2">
          <BookOpen className="h-4 w-4" />
          <span>Field Assistant</span>
          <Badge variant="outline" className="text-xs">
            {segmentType}.{fieldIndex}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Field Information */}
        <div className="space-y-2">
          <div className="text-sm font-medium">{getFieldName(segmentType, fieldIndex)}</div>
          <div className="text-xs text-muted-foreground">
            {getFieldDescription(segmentType, fieldIndex)}
          </div>
        </div>

        {/* Current Value */}
        <div className="space-y-2">
          <Label className="text-xs">Current Value</Label>
          <Input
            value={currentValue}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder="Enter value or select from codes below"
            className="text-sm"
          />
        </div>

        {/* Code Selection */}
        <div className="space-y-2">
          <Label className="text-xs">Standard Codes ({availableCodes.length} available)</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between text-sm"
              >
                {currentValue && availableCodes.find(code => code.code === currentValue)
                  ? availableCodes.find(code => code.code === currentValue)?.description
                  : "Select a standard code..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0">
              <Command>
                <CommandInput 
                  placeholder="Search codes..." 
                  value={searchValue}
                  onValueChange={setSearchValue}
                />
                <CommandEmpty>No codes found.</CommandEmpty>
                <CommandList>
                  <ScrollArea className="h-64">
                    {Object.entries(
                      filteredCodes.reduce((acc, code) => {
                        const category = code.category || 'Other'
                        if (!acc[category]) acc[category] = []
                        acc[category].push(code)
                        return acc
                      }, {} as Record<string, StandardCode[]>)
                    ).map(([category, codes]) => (
                      <CommandGroup key={category} heading={category}>
                        {codes.map((code) => (
                          <CommandItem
                            key={code.code}
                            value={code.code}
                            onSelect={() => {
                              onValueChange(code.code)
                              setOpen(false)
                              setSearchValue("")
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                currentValue === code.code ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-mono text-sm">{code.code}</div>
                              <div className="text-xs text-muted-foreground">{code.description}</div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    ))}
                  </ScrollArea>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Quick Actions */}
        <div className="flex space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onValueChange("")}
            className="text-xs"
          >
            Clear
          </Button>
          {currentValue && !availableCodes.find(code => code.code === currentValue) && (
            <Badge variant="secondary" className="text-xs">
              Custom Value
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
