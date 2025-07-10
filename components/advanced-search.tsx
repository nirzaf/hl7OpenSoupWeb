"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog"
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  User,
  Building,
  FileText,
  Hash,
  Plus
} from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import type { HL7Message } from "@/types/hl7"

interface AdvancedSearchProps {
  onSearch: (criteria: SearchCriteria) => void
  onClear: () => void
  isLoading?: boolean
}

export interface SearchCriteria {
  // Basic search
  generalSearch?: string
  
  // HL7 specific fields
  patientName?: string        // PID.5
  patientId?: string         // PID.3
  messageType?: string       // MSH.9
  sendingFacility?: string   // MSH.4
  receivingFacility?: string // MSH.6
  messageControlId?: string  // MSH.10
  
  // Metadata search
  tags?: string[]
  
  // Date range
  dateFrom?: Date
  dateTo?: Date
  
  // Advanced filters
  hasErrors?: boolean
  isValid?: boolean
  segmentTypes?: string[]
}

const MESSAGE_TYPES = [
  "ADT^A01", "ADT^A02", "ADT^A03", "ADT^A04", "ADT^A05", "ADT^A08",
  "ORM^O01", "ORU^R01", "SIU^S12", "SIU^S13", "SIU^S15"
]

const COMMON_SEGMENTS = [
  "MSH", "EVN", "PID", "NK1", "PV1", "OBR", "OBX", "AL1", "DG1", "SCH", "RGS", "AIS"
]

export function AdvancedSearch({ onSearch, onClear, isLoading = false }: AdvancedSearchProps) {
  const [criteria, setCriteria] = useState<SearchCriteria>({})
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const updateCriteria = (key: keyof SearchCriteria, value: any) => {
    setCriteria(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSearch = () => {
    onSearch(criteria)
    updateActiveFilters()
  }

  const handleClear = () => {
    setCriteria({})
    setActiveFilters([])
    onClear()
  }

  const updateActiveFilters = () => {
    const filters: string[] = []
    
    if (criteria.generalSearch) filters.push(`General: "${criteria.generalSearch}"`)
    if (criteria.patientName) filters.push(`Patient: "${criteria.patientName}"`)
    if (criteria.patientId) filters.push(`Patient ID: "${criteria.patientId}"`)
    if (criteria.messageType) filters.push(`Type: ${criteria.messageType}`)
    if (criteria.sendingFacility) filters.push(`From: "${criteria.sendingFacility}"`)
    if (criteria.receivingFacility) filters.push(`To: "${criteria.receivingFacility}"`)
    if (criteria.messageControlId) filters.push(`Control ID: "${criteria.messageControlId}"`)
    if (criteria.tags && criteria.tags.length > 0) filters.push(`Tags: ${criteria.tags.join(', ')}`)
    if (criteria.dateFrom || criteria.dateTo) filters.push('Date Range')
    if (criteria.hasErrors) filters.push('Has Errors')
    if (criteria.isValid !== undefined) filters.push(criteria.isValid ? 'Valid Only' : 'Invalid Only')
    if (criteria.segmentTypes && criteria.segmentTypes.length > 0) filters.push(`Segments: ${criteria.segmentTypes.join(', ')}`)
    
    setActiveFilters(filters)
  }

  const removeFilter = (filterToRemove: string) => {
    const newCriteria = { ...criteria }
    
    if (filterToRemove.startsWith('General:')) newCriteria.generalSearch = undefined
    else if (filterToRemove.startsWith('Patient:')) newCriteria.patientName = undefined
    else if (filterToRemove.startsWith('Patient ID:')) newCriteria.patientId = undefined
    else if (filterToRemove.startsWith('Type:')) newCriteria.messageType = undefined
    else if (filterToRemove.startsWith('From:')) newCriteria.sendingFacility = undefined
    else if (filterToRemove.startsWith('To:')) newCriteria.receivingFacility = undefined
    else if (filterToRemove.startsWith('Control ID:')) newCriteria.messageControlId = undefined
    else if (filterToRemove.startsWith('Tags:')) newCriteria.tags = undefined
    else if (filterToRemove === 'Date Range') {
      newCriteria.dateFrom = undefined
      newCriteria.dateTo = undefined
    }
    else if (filterToRemove === 'Has Errors') newCriteria.hasErrors = undefined
    else if (filterToRemove === 'Valid Only' || filterToRemove === 'Invalid Only') newCriteria.isValid = undefined
    else if (filterToRemove.startsWith('Segments:')) newCriteria.segmentTypes = undefined
    
    setCriteria(newCriteria)
    onSearch(newCriteria)
    updateActiveFilters()
  }

  return (
    <div className="space-y-4">
      {/* Search Trigger */}
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <Search className="h-4 w-4 mr-2" />
            Advanced Search
            {activeFilters.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilters.length} filters
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Advanced Message Search</span>
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Basic Search</TabsTrigger>
              <TabsTrigger value="hl7">HL7 Fields</TabsTrigger>
              <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>General Search</Label>
                  <Input
                    placeholder="Search across all message content..."
                    value={criteria.generalSearch || ''}
                    onChange={(e) => updateCriteria('generalSearch', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Message Type</Label>
                    <Select 
                      value={criteria.messageType || ''} 
                      onValueChange={(value) => updateCriteria('messageType', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select message type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All Types</SelectItem>
                        {MESSAGE_TYPES.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Date Range</Label>
                    <DatePickerWithRange
                      from={criteria.dateFrom}
                      to={criteria.dateTo}
                      onSelect={(range) => {
                        updateCriteria('dateFrom', range?.from)
                        updateCriteria('dateTo', range?.to)
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hl7" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>Patient Name (PID.5)</span>
                    </Label>
                    <Input
                      placeholder="e.g., DOE^JOHN or Smith"
                      value={criteria.patientName || ''}
                      onChange={(e) => updateCriteria('patientName', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Hash className="h-4 w-4" />
                      <span>Patient ID (PID.3)</span>
                    </Label>
                    <Input
                      placeholder="e.g., PATID1234 or 123456789"
                      value={criteria.patientId || ''}
                      onChange={(e) => updateCriteria('patientId', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>Sending Facility (MSH.4)</span>
                    </Label>
                    <Input
                      placeholder="e.g., MAIN_HOSPITAL"
                      value={criteria.sendingFacility || ''}
                      onChange={(e) => updateCriteria('sendingFacility', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center space-x-2">
                      <Building className="h-4 w-4" />
                      <span>Receiving Facility (MSH.6)</span>
                    </Label>
                    <Input
                      placeholder="e.g., LAB_SYSTEM"
                      value={criteria.receivingFacility || ''}
                      onChange={(e) => updateCriteria('receivingFacility', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center space-x-2">
                    <Hash className="h-4 w-4" />
                    <span>Message Control ID (MSH.10)</span>
                  </Label>
                  <Input
                    placeholder="e.g., MSG001 or unique identifier"
                    value={criteria.messageControlId || ''}
                    onChange={(e) => updateCriteria('messageControlId', e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label>Validation Status</Label>
                  <Select 
                    value={criteria.isValid === undefined ? '' : criteria.isValid.toString()} 
                    onValueChange={(value) => updateCriteria('isValid', value === '' ? undefined : value === 'true')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any validation status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any Status</SelectItem>
                      <SelectItem value="true">Valid Messages Only</SelectItem>
                      <SelectItem value="false">Invalid Messages Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Required Segments</Label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_SEGMENTS.map(segment => (
                      <Button
                        key={segment}
                        variant={criteria.segmentTypes?.includes(segment) ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const current = criteria.segmentTypes || []
                          const updated = current.includes(segment)
                            ? current.filter(s => s !== segment)
                            : [...current, segment]
                          updateCriteria('segmentTypes', updated.length > 0 ? updated : undefined)
                        }}
                      >
                        {segment}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Input
                    placeholder="Enter tags separated by commas"
                    value={criteria.tags?.join(', ') || ''}
                    onChange={(e) => {
                      const tags = e.target.value.split(',').map(t => t.trim()).filter(t => t)
                      updateCriteria('tags', tags.length > 0 ? tags : undefined)
                    }}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between items-center pt-4 border-t">
            <Button variant="outline" onClick={handleClear}>
              Clear All
            </Button>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => {}}>
                Cancel
              </Button>
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? 'Searching...' : 'Search Messages'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Active Filters */}
      {activeFilters.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium">Active Filters</Label>
              <Button variant="ghost" size="sm" onClick={handleClear}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                  <span>{filter}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => removeFilter(filter)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
