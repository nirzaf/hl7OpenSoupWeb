import type { HL7Message, ValidationError, HL7Schema } from '@/types/hl7'

export interface ParsedHL7Message {
  segments: Record<string, any>
  metadata: {
    messageType: string
    versionId: string
    sendingFacility: string
    receivingFacility: string
    timestamp: Date
    controlId: string
  }
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}

export class HL7Service {
  private customSchema?: any

  constructor(customSchema?: any) {
    this.customSchema = customSchema
  }

  /**
   * Parse raw HL7 message text into structured JSON format
   */
  parseMessage(hl7Text: string): ParsedHL7Message {
    try {
      // Clean the HL7 text - remove extra whitespace and normalize line endings
      const cleanedText = hl7Text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')

      // Simple HL7 parsing - split by line breaks and parse each segment
      const lines = cleanedText.split('\n').filter(line => line.trim())
      const segments: Record<string, any> = {}

      for (const line of lines) {
        const fields = line.split('|')
        if (fields.length > 0) {
          const segmentType = fields[0]
          segments[segmentType] = fields
        }
      }

      // Extract metadata from MSH segment
      const msh = segments.MSH
      const metadata = this.extractMetadata(msh)

      return {
        segments,
        metadata
      }
    } catch (error) {
      throw new Error(`Failed to parse HL7 message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Generate HL7 message text from JSON object
   */
  generateMessage(jsonObject: any): string {
    try {
      // Simple HL7 generation - convert segments back to pipe-delimited format
      const lines: string[] = []

      if (jsonObject.segments) {
        // Handle nested segments structure
        for (const [segmentType, fields] of Object.entries(jsonObject.segments)) {
          if (Array.isArray(fields)) {
            lines.push(fields.join('|'))
          }
        }
      } else {
        // Handle flat structure
        for (const [segmentType, fields] of Object.entries(jsonObject)) {
          if (Array.isArray(fields)) {
            lines.push(fields.join('|'))
          }
        }
      }

      return lines.join('\n')
    } catch (error) {
      throw new Error(`Failed to generate HL7 message: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate message against schema
   */
  validateMessage(jsonObject: any, schema?: any): ValidationResult {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []

    try {
      // Use custom schema if provided, otherwise use the instance schema
      const validationSchema = schema || this.customSchema
      
      if (validationSchema) {
        // Try to parse - this will throw if validation fails
        const hl7Text = this.generateMessage(jsonObject)
        this.parseMessage(hl7Text)
      }

      // Additional custom validation logic can be added here
      this.performStructuralValidation(jsonObject, errors, warnings)

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    } catch (error) {
      errors.push({
        segment: 'MSH',
        field: 0,
        message: error instanceof Error ? error.message : 'Validation failed',
        severity: 'error'
      })

      return {
        isValid: false,
        errors,
        warnings
      }
    }
  }

  /**
   * Edit a specific field in the message
   */
  editField(jsonObject: any, path: string, value: string): any {
    try {
      const pathParts = path.split('.')
      let current = jsonObject

      // Navigate to the parent of the target field
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {}
        }
        current = current[pathParts[i]]
      }

      // Set the value
      const lastPart = pathParts[pathParts.length - 1]
      current[lastPart] = value

      return jsonObject
    } catch (error) {
      throw new Error(`Failed to edit field ${path}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Extract metadata from MSH segment
   */
  private extractMetadata(msh: any): ParsedHL7Message['metadata'] {
    try {
      // MSH segment is an array: [MSH, field_separator, encoding_chars, sending_app, sending_facility, ...]
      if (Array.isArray(msh) && msh.length > 0) {
        return {
          messageType: msh[9] || 'Unknown', // Message type is typically in field 9
          versionId: msh[12] || '2.5', // Version ID is typically in field 12
          sendingFacility: msh[4] || 'Unknown', // Sending facility is in field 4
          receivingFacility: msh[6] || 'Unknown', // Receiving facility is in field 6
          timestamp: this.parseHL7DateTime(msh[7]), // Timestamp is in field 7
          controlId: msh[10] || 'Unknown' // Control ID is in field 10
        }
      }

      // Fallback for object format
      return {
        messageType: msh?.messageType || msh?.['9'] || 'Unknown',
        versionId: msh?.versionId || msh?.['12'] || '2.5',
        sendingFacility: msh?.sendingFacility || msh?.['4'] || 'Unknown',
        receivingFacility: msh?.receivingFacility || msh?.['6'] || 'Unknown',
        timestamp: this.parseHL7DateTime(msh?.timestamp || msh?.['7']),
        controlId: msh?.controlId || msh?.['10'] || 'Unknown'
      }
    } catch (error) {
      // Return default metadata if extraction fails
      return {
        messageType: 'Unknown',
        versionId: '2.5',
        sendingFacility: 'Unknown',
        receivingFacility: 'Unknown',
        timestamp: new Date(),
        controlId: 'Unknown'
      }
    }
  }

  /**
   * Parse HL7 datetime format (YYYYMMDDHHMMSS) to JavaScript Date
   */
  private parseHL7DateTime(hl7DateTime: string): Date {
    if (!hl7DateTime || typeof hl7DateTime !== 'string') {
      return new Date()
    }

    try {
      // HL7 datetime format: YYYYMMDDHHMMSS[.SSSS][+/-ZZZZ]
      const cleanDateTime = hl7DateTime.replace(/[^0-9]/g, '')
      
      if (cleanDateTime.length >= 8) {
        const year = parseInt(cleanDateTime.substring(0, 4))
        const month = parseInt(cleanDateTime.substring(4, 6)) - 1 // JavaScript months are 0-based
        const day = parseInt(cleanDateTime.substring(6, 8))
        const hour = cleanDateTime.length >= 10 ? parseInt(cleanDateTime.substring(8, 10)) : 0
        const minute = cleanDateTime.length >= 12 ? parseInt(cleanDateTime.substring(10, 12)) : 0
        const second = cleanDateTime.length >= 14 ? parseInt(cleanDateTime.substring(12, 14)) : 0

        return new Date(year, month, day, hour, minute, second)
      }
    } catch (error) {
      console.warn('Failed to parse HL7 datetime:', hl7DateTime, error)
    }

    return new Date()
  }

  /**
   * Perform structural validation checks
   */
  private performStructuralValidation(jsonObject: any, errors: ValidationError[], warnings: ValidationError[]): void {
    // Check for required MSH segment
    if (!jsonObject.MSH && !jsonObject.segments?.MSH) {
      errors.push({
        segment: 'MSH',
        field: 0,
        message: 'MSH segment is required',
        severity: 'error'
      })
      return
    }

    // Check for required MSH fields
    const msh = jsonObject.MSH || jsonObject.segments?.MSH
    const requiredMshFields = ['MSH.1', 'MSH.2', 'MSH.3', 'MSH.4', 'MSH.5', 'MSH.6', 'MSH.7', 'MSH.9', 'MSH.10', 'MSH.11', 'MSH.12']
    
    requiredMshFields.forEach((field, index) => {
      const fieldNumber = index + 1
      if (!msh?.[field] && !msh?.[fieldNumber.toString()]) {
        warnings.push({
          segment: 'MSH',
          field: fieldNumber,
          message: `${field} is recommended but missing`,
          severity: 'warning'
        })
      }
    })
  }
}

// Export a default instance for convenience
export const defaultHL7Service = new HL7Service()
