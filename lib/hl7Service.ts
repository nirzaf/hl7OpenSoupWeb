import { Parser, Generator } from '@ehr/hl7-v2'
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
  private parser: any
  private generator: any
  private customSchema?: any

  constructor(customSchema?: any) {
    this.customSchema = customSchema
    this.parser = new Parser(customSchema)
    this.generator = new Generator(customSchema)
  }

  /**
   * Parse raw HL7 message text into structured JSON format
   */
  parseMessage(hl7Text: string): ParsedHL7Message {
    try {
      // Clean the HL7 text - remove extra whitespace and normalize line endings
      const cleanedText = hl7Text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n')
      
      // Parse using @ehr/hl7-v2
      const parsed = this.parser.parse(cleanedText)
      
      // Extract metadata from MSH segment
      const msh = parsed.MSH || parsed.segments?.MSH
      const metadata = this.extractMetadata(msh)
      
      return {
        segments: parsed,
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
      return this.generator.generate(jsonObject)
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
        // Create a new parser instance with the validation schema
        const validator = new Parser(validationSchema)

        // Try to parse - this will throw if validation fails
        const hl7Text = this.generateMessage(jsonObject)
        validator.parse(hl7Text)
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
      return {
        messageType: msh?.['MSH.9']?.['MSH.9.1'] || msh?.['9']?.['1'] || 'Unknown',
        versionId: msh?.['MSH.12'] || msh?.['12'] || '2.5',
        sendingFacility: msh?.['MSH.4'] || msh?.['4'] || 'Unknown',
        receivingFacility: msh?.['MSH.6'] || msh?.['6'] || 'Unknown',
        timestamp: this.parseHL7DateTime(msh?.['MSH.7'] || msh?.['7']),
        controlId: msh?.['MSH.10'] || msh?.['10'] || 'Unknown'
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
