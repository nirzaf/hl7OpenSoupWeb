import * as xmljs from 'xml-js'
import * as json2csv from 'json-2-csv'
import type { HL7Message, TransformationOptions } from '@/types/hl7'

export interface TransformationResult {
  success: boolean
  data?: string
  error?: string
  format: 'json' | 'xml' | 'csv'
}

export class XMLConversionService {
  /**
   * Convert HL7 JSON to XML format
   */
  static toXML(jsonData: any, options?: Partial<TransformationOptions>): TransformationResult {
    try {
      const xmlOptions = {
        compact: true,
        ignoreComment: true,
        ignoreInstruction: true,
        ignoreAttributes: false,
        ignoreDeclaration: false,
        ignoreCdata: true,
        ignoreDoctype: true,
        spaces: options?.includeMetadata ? 2 : 0,
        elementNameFn: (name: string) => {
          // Convert field names to valid XML element names
          return name.replace(/[^a-zA-Z0-9_]/g, '_')
        }
      }

      // Prepare data for XML conversion
      const xmlData = {
        HL7Message: {
          ...jsonData
        }
      }

      const xmlString = xmljs.js2xml(xmlData, xmlOptions)
      const xmlWithDeclaration = `<?xml version="1.0" encoding="UTF-8"?>${xmlString}`

      return {
        success: true,
        data: xmlWithDeclaration,
        format: 'xml'
      }
    } catch (error) {
      return {
        success: false,
        error: `XML conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        format: 'xml'
      }
    }
  }

  /**
   * Convert XML to HL7 JSON format
   */
  static fromXML(xmlData: string): TransformationResult {
    try {
      const jsonOptions = {
        compact: true,
        ignoreComment: true,
        ignoreInstruction: true,
        ignoreAttributes: false,
        ignoreDeclaration: true,
        ignoreCdata: true,
        ignoreDoctype: true,
        textKey: '_text',
        attributesKey: '_attributes',
        elementsKey: '_elements'
      }

      const result = xmljs.xml2js(xmlData, jsonOptions)
      
      // Extract the HL7Message content if it exists
      const hl7Data = result.HL7Message || result
      
      return {
        success: true,
        data: JSON.stringify(hl7Data, null, 2),
        format: 'json'
      }
    } catch (error) {
      return {
        success: false,
        error: `XML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        format: 'json'
      }
    }
  }
}

export class CSVConversionService {
  /**
   * Convert HL7 JSON to CSV format
   */
  static toCSV(jsonData: any, options?: Partial<TransformationOptions>): TransformationResult {
    try {
      // Create simple CSV format: Segment,Field,Value
      const csvRows: string[] = ['Segment,Field,Value']

      // Process segments
      const segments = jsonData.segments || jsonData

      Object.keys(segments).forEach(segmentName => {
        const segment = segments[segmentName]

        if (typeof segment === 'object' && segment !== null) {
          Object.keys(segment).forEach(fieldName => {
            const value = segment[fieldName]
            if (value !== undefined && value !== null) {
              // Escape commas and quotes in values
              const escapedValue = String(value).replace(/"/g, '""')
              const finalValue = escapedValue.includes(',') ? `"${escapedValue}"` : escapedValue
              csvRows.push(`${segmentName},${fieldName},${finalValue}`)
            }
          })
        }
      })

      return {
        success: true,
        data: csvRows.join('\n'),
        format: 'csv'
      }
    } catch (error) {
      return {
        success: false,
        error: `CSV conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        format: 'csv'
      }
    }
  }

  /**
   * Convert CSV to HL7 JSON format
   */
  static fromCSV(csvData: string): TransformationResult {
    try {
      if (!csvData || csvData.trim() === '') {
        return {
          success: false,
          error: 'CSV parsing failed: Empty CSV data',
          format: 'json'
        }
      }

      // Parse simple CSV format: Segment,Field,Value
      const lines = csvData.split('\n').filter(line => line.trim())

      if (lines.length === 0) {
        return {
          success: false,
          error: 'CSV parsing failed: No data found',
          format: 'json'
        }
      }

      // Skip header line if it exists
      const dataLines = lines[0].includes('Segment,Field,Value') ? lines.slice(1) : lines

      const hl7Data: any = {}

      let validLines = 0
      dataLines.forEach(line => {
        const parts = line.split(',')
        if (parts.length >= 3) {
          const segment = parts[0].trim()
          const field = parts[1].trim()
          const value = parts.slice(2).join(',').trim().replace(/^"|"$/g, '') // Handle quoted values

          // Validate that segment and field are not empty
          if (segment && field) {
            if (!hl7Data[segment]) {
              hl7Data[segment] = {}
            }

            hl7Data[segment][field] = value
            validLines++
          }
        }
      })

      // If no valid lines were found, consider it invalid
      if (validLines === 0 && dataLines.length > 0) {
        return {
          success: false,
          error: 'CSV parsing failed: No valid HL7 data found',
          format: 'json'
        }
      }

      return {
        success: true,
        data: JSON.stringify(hl7Data, null, 2),
        format: 'json'
      }
    } catch (error) {
      return {
        success: false,
        error: `CSV parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        format: 'json'
      }
    }
  }

  /**
   * Flatten hierarchical HL7 data for CSV export
   */
  private static flattenHL7Data(data: any, options?: Partial<TransformationOptions>): any[] {
    const result: any[] = []
    
    // If data has segments, process each segment
    if (data.segments || typeof data === 'object') {
      const segments = data.segments || data
      
      Object.keys(segments).forEach(segmentName => {
        const segment = segments[segmentName]
        
        if (Array.isArray(segment)) {
          // Handle repeating segments
          segment.forEach((segmentInstance, index) => {
            const flatSegment = this.flattenSegment(segmentName, segmentInstance, index)
            if (options?.includeMetadata && data.metadata) {
              Object.assign(flatSegment, {
                messageType: data.metadata.messageType,
                versionId: data.metadata.versionId,
                sendingFacility: data.metadata.sendingFacility,
                receivingFacility: data.metadata.receivingFacility,
                timestamp: data.metadata.timestamp
              })
            }
            result.push(flatSegment)
          })
        } else {
          // Handle single segment
          const flatSegment = this.flattenSegment(segmentName, segment, 0)
          if (options?.includeMetadata && data.metadata) {
            Object.assign(flatSegment, {
              messageType: data.metadata.messageType,
              versionId: data.metadata.versionId,
              sendingFacility: data.metadata.sendingFacility,
              receivingFacility: data.metadata.receivingFacility,
              timestamp: data.metadata.timestamp
            })
          }
          result.push(flatSegment)
        }
      })
    }
    
    return result.length > 0 ? result : [data]
  }

  /**
   * Flatten a single segment for CSV
   */
  private static flattenSegment(segmentName: string, segment: any, index: number): any {
    const result: any = {
      segmentType: segmentName,
      segmentIndex: index
    }
    
    if (typeof segment === 'object' && segment !== null) {
      Object.keys(segment).forEach(fieldKey => {
        const fieldValue = segment[fieldKey]
        
        if (typeof fieldValue === 'object' && fieldValue !== null) {
          // Flatten nested objects
          Object.keys(fieldValue).forEach(subKey => {
            result[`${fieldKey}.${subKey}`] = fieldValue[subKey]
          })
        } else {
          result[fieldKey] = fieldValue
        }
      })
    }
    
    return result
  }

  /**
   * Reconstruct HL7 data from flattened CSV
   */
  private static reconstructHL7Data(csvArray: any[]): any {
    const segments: any = {}
    
    csvArray.forEach(row => {
      const segmentType = row.segmentType
      if (!segmentType) return
      
      // Remove metadata fields
      const { segmentType: _, segmentIndex: __, messageType: ___, versionId: ____, sendingFacility: _____, receivingFacility: ______, timestamp: _______, ...segmentData } = row
      
      // Reconstruct nested structure
      const segment: any = {}
      Object.keys(segmentData).forEach(key => {
        if (key.includes('.')) {
          const [parentKey, childKey] = key.split('.')
          if (!segment[parentKey]) {
            segment[parentKey] = {}
          }
          segment[parentKey][childKey] = segmentData[key]
        } else {
          segment[key] = segmentData[key]
        }
      })
      
      // Handle repeating segments
      if (segments[segmentType]) {
        if (!Array.isArray(segments[segmentType])) {
          segments[segmentType] = [segments[segmentType]]
        }
        segments[segmentType].push(segment)
      } else {
        segments[segmentType] = segment
      }
    })
    
    return { segments }
  }
}

export class TransformationService {
  /**
   * Export HL7 message to specified format
   */
  static export(message: HL7Message, format: 'json' | 'xml' | 'csv', options?: Partial<TransformationOptions>): TransformationResult {
    try {
      const data = options?.includeMetadata 
        ? { ...message.parsedMessage, metadata: message.metadata }
        : message.parsedMessage

      switch (format) {
        case 'json':
          return {
            success: true,
            data: JSON.stringify(data, null, 2),
            format: 'json'
          }
        
        case 'xml':
          return XMLConversionService.toXML(data, options)
        
        case 'csv':
          return CSVConversionService.toCSV(data, options)
        
        default:
          return {
            success: false,
            error: `Unsupported format: ${format}`,
            format
          }
      }
    } catch (error) {
      return {
        success: false,
        error: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        format
      }
    }
  }

  /**
   * Import data and convert to HL7 JSON format
   */
  static import(data: string, format: 'json' | 'xml' | 'csv'): TransformationResult {
    try {
      switch (format) {
        case 'json':
          // Validate JSON
          const jsonData = JSON.parse(data)
          return {
            success: true,
            data: JSON.stringify(jsonData, null, 2),
            format: 'json'
          }
        
        case 'xml':
          return XMLConversionService.fromXML(data)
        
        case 'csv':
          return CSVConversionService.fromCSV(data)
        
        default:
          return {
            success: false,
            error: `Unsupported format: ${format}`,
            format
          }
      }
    } catch (error) {
      return {
        success: false,
        error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        format
      }
    }
  }
}
