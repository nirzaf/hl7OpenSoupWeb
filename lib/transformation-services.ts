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
          _attributes: {
            version: '1.0',
            encoding: options?.encoding || 'UTF-8'
          },
          ...jsonData
        }
      }

      const xmlString = xmljs.js2xml(xmlData, xmlOptions)
      
      return {
        success: true,
        data: xmlString,
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
      // Flatten the hierarchical HL7 structure for CSV
      const flattenedData = this.flattenHL7Data(jsonData, options)
      
      const csvOptions = {
        delimiter: {
          field: ',',
          wrap: '"',
          eol: '\n'
        },
        prependHeader: true,
        sortHeader: false,
        trimHeaderFields: true,
        trimFieldValues: true,
        expandNestedObjects: options?.flattenStructure !== false,
        unwindArrays: true,
        emptyFieldValue: ''
      }

      const csvString = json2csv.json2csv(flattenedData, csvOptions)
      
      return {
        success: true,
        data: csvString,
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
      // Parse CSV to JSON array
      // For now, we'll implement a simple CSV parser
      const lines = csvData.split('\n')
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const jsonArray = lines.slice(1).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const obj: any = {}
        headers.forEach((header, index) => {
          obj[header] = values[index] || ''
        })
        return obj
      })


      // Reconstruct HL7 structure from flattened CSV data
      const hl7Data = this.reconstructHL7Data(jsonArray)
      
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
