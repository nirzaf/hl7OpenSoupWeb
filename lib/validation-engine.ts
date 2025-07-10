import { HL7Service } from './hl7Service'
import { getCollection } from './mongodb'
import type { ValidationRule, RuleSet, ValidationError, HL7Message } from '@/types/hl7'

export interface ValidationContext {
  messageData: any
  rawMessage?: string
  ruleSet?: RuleSet
  customSchema?: any
}

export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
  info: ValidationError[]
  summary: {
    totalErrors: number
    totalWarnings: number
    totalInfo: number
    ruleSetUsed?: string
    validationTime: number
  }
}

export class ValidationEngine {
  private hl7Service: HL7Service
  private customSchemas: Map<string, any> = new Map()

  constructor(customSchema?: any) {
    this.hl7Service = new HL7Service(customSchema)
    if (customSchema) {
      this.customSchemas.set('default', customSchema)
    }
  }

  /**
   * Comprehensive validation of HL7 message
   */
  async validateMessage(context: ValidationContext): Promise<ValidationResult> {
    const startTime = Date.now()
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const info: ValidationError[] = []

    try {
      // 1. Basic HL7 structural validation
      const basicValidation = this.hl7Service.validateMessage(context.messageData, context.customSchema)
      errors.push(...basicValidation.errors)
      warnings.push(...basicValidation.warnings)

      // 2. Custom rules validation if rule set is provided
      if (context.ruleSet) {
        const customValidation = await this.validateWithRuleSet(context.messageData, context.ruleSet)
        errors.push(...customValidation.errors)
        warnings.push(...customValidation.warnings)
        info.push(...customValidation.info)
      }

      // 3. Schema-specific validation (e.g., UK ITK)
      if (context.customSchema) {
        const schemaValidation = await this.validateWithCustomSchema(context.messageData, context.customSchema)
        errors.push(...schemaValidation.errors)
        warnings.push(...schemaValidation.warnings)
        info.push(...schemaValidation.info)
      }

      // 4. Content-based validation
      const contentValidation = this.validateMessageContent(context.messageData)
      errors.push(...contentValidation.errors)
      warnings.push(...contentValidation.warnings)
      info.push(...contentValidation.info)

      const validationTime = Date.now() - startTime

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        info,
        summary: {
          totalErrors: errors.length,
          totalWarnings: warnings.length,
          totalInfo: info.length,
          ruleSetUsed: context.ruleSet?.name,
          validationTime
        }
      }
    } catch (error) {
      const validationTime = Date.now() - startTime
      
      return {
        isValid: false,
        errors: [{
          segment: 'SYSTEM',
          field: 0,
          message: `Validation engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        }],
        warnings: [],
        info: [],
        summary: {
          totalErrors: 1,
          totalWarnings: 0,
          totalInfo: 0,
          ruleSetUsed: context.ruleSet?.name,
          validationTime
        }
      }
    }
  }

  /**
   * Validate message against a specific rule set
   */
  private async validateWithRuleSet(messageData: any, ruleSet: RuleSet): Promise<{
    errors: ValidationError[]
    warnings: ValidationError[]
    info: ValidationError[]
  }> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const info: ValidationError[] = []

    for (const rule of ruleSet.rules) {
      if (!rule.isActive) continue

      try {
        const result = this.evaluateRule(messageData, rule)
        
        if (result.violated) {
          const validationError: ValidationError = {
            segment: this.extractSegmentFromPath(rule.targetPath || ''),
            field: this.extractFieldFromPath(rule.targetPath || ''),
            message: rule.actionDetail || `Rule violation: ${rule.name}`,
            severity: rule.severity
          }

          switch (rule.severity) {
            case 'error':
              errors.push(validationError)
              break
            case 'warning':
              warnings.push(validationError)
              break
            case 'info':
              info.push(validationError)
              break
          }
        }
      } catch (error) {
        warnings.push({
          segment: 'RULE_ENGINE',
          field: 0,
          message: `Failed to evaluate rule "${rule.name}": ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'warning'
        })
      }
    }

    return { errors, warnings, info }
  }

  /**
   * Validate message against custom schema (e.g., UK ITK)
   */
  private async validateWithCustomSchema(messageData: any, customSchema: any): Promise<{
    errors: ValidationError[]
    warnings: ValidationError[]
    info: ValidationError[]
  }> {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const info: ValidationError[] = []

    // UK ITK specific validations
    if (customSchema.name === 'UK_ITK') {
      // EVN segment mandatory check
      if (!messageData.EVN) {
        errors.push({
          segment: 'EVN',
          field: 0,
          message: 'EVN segment is mandatory in UK ITK messages',
          severity: 'error'
        })
      }

      // QAK segment cardinality check
      if (messageData.QAK && Array.isArray(messageData.QAK) && messageData.QAK.length !== 1) {
        errors.push({
          segment: 'QAK',
          field: 0,
          message: 'QAK segment cardinality must be [1..1] in UK ITK',
          severity: 'error'
        })
      }

      // Z-segments validation
      this.validateZSegments(messageData, errors, warnings, info)
    }

    return { errors, warnings, info }
  }

  /**
   * Validate UK ITK Z-segments
   */
  private validateZSegments(messageData: any, errors: ValidationError[], warnings: ValidationError[], info: ValidationError[]): void {
    // ZU1 - Additional PV info validation
    if (messageData.ZU1) {
      if (!messageData.ZU1['ZU1.1']) {
        warnings.push({
          segment: 'ZU1',
          field: 1,
          message: 'ZU1.1 (Additional PV info) is recommended',
          severity: 'warning'
        })
      }
    }

    // ZU3 - Attendance Details validation
    if (messageData.ZU3) {
      if (!messageData.ZU3['ZU3.1']) {
        warnings.push({
          segment: 'ZU3',
          field: 1,
          message: 'ZU3.1 (Attendance Details) is recommended',
          severity: 'warning'
        })
      }
    }
  }

  /**
   * Content-based validation
   */
  private validateMessageContent(messageData: any): {
    errors: ValidationError[]
    warnings: ValidationError[]
    info: ValidationError[]
  } {
    const errors: ValidationError[] = []
    const warnings: ValidationError[] = []
    const info: ValidationError[] = []

    // Date format validation
    this.validateDateFormats(messageData, warnings)

    // ID format validation
    this.validateIdFormats(messageData, warnings)

    // Code validation
    this.validateCodes(messageData, warnings, info)

    return { errors, warnings, info }
  }

  /**
   * Validate date formats in the message
   */
  private validateDateFormats(messageData: any, warnings: ValidationError[]): void {
    const dateFields = ['MSH.7', 'EVN.2', 'PID.7', 'PV1.44', 'PV1.45']
    
    for (const field of dateFields) {
      const value = this.getValueAtPath(messageData, field)
      if (value && !this.isValidHL7Date(value)) {
        warnings.push({
          segment: field.split('.')[0],
          field: parseInt(field.split('.')[1]) || 0,
          message: `Invalid date format in ${field}: ${value}`,
          severity: 'warning'
        })
      }
    }
  }

  /**
   * Validate ID formats
   */
  private validateIdFormats(messageData: any, warnings: ValidationError[]): void {
    // Patient ID validation
    const patientId = this.getValueAtPath(messageData, 'PID.3')
    if (patientId && typeof patientId === 'string' && patientId.length < 3) {
      warnings.push({
        segment: 'PID',
        field: 3,
        message: 'Patient ID appears to be too short',
        severity: 'warning'
      })
    }

    // Control ID validation
    const controlId = this.getValueAtPath(messageData, 'MSH.10')
    if (controlId && typeof controlId === 'string' && !/^[A-Za-z0-9]+$/.test(controlId)) {
      warnings.push({
        segment: 'MSH',
        field: 10,
        message: 'Control ID should contain only alphanumeric characters',
        severity: 'warning'
      })
    }
  }

  /**
   * Validate codes against lookup tables
   */
  private validateCodes(messageData: any, warnings: ValidationError[], info: ValidationError[]): void {
    // This would typically validate against external code systems
    // For now, we'll do basic format validation
    
    const messageType = this.getValueAtPath(messageData, 'MSH.9')
    if (messageType && typeof messageType === 'string') {
      if (!messageType.includes('^')) {
        warnings.push({
          segment: 'MSH',
          field: 9,
          message: 'Message type should follow format: EVENT^TRIGGER',
          severity: 'warning'
        })
      }
    }
  }

  /**
   * Evaluate a single validation rule
   */
  private evaluateRule(messageData: any, rule: ValidationRule): { violated: boolean, value?: any } {
    if (!rule.targetPath || !rule.condition) {
      return { violated: false }
    }

    const value = this.getValueAtPath(messageData, rule.targetPath)

    switch (rule.condition) {
      case 'exists':
        return { violated: value === undefined || value === null || value === '', value }
      
      case 'not_exists':
        return { violated: value !== undefined && value !== null && value !== '', value }
      
      case 'equals':
        return { violated: value !== rule.value, value }
      
      case 'not_equals':
        return { violated: value === rule.value, value }
      
      case 'startsWith':
        return { 
          violated: typeof value !== 'string' || !value.startsWith(rule.value || ''), 
          value 
        }
      
      case 'endsWith':
        return { 
          violated: typeof value !== 'string' || !value.endsWith(rule.value || ''), 
          value 
        }
      
      case 'contains':
        return { 
          violated: typeof value !== 'string' || !value.includes(rule.value || ''), 
          value 
        }
      
      case 'matchesRegex':
        try {
          const regex = new RegExp(rule.value || '')
          return { 
            violated: typeof value !== 'string' || !regex.test(value), 
            value 
          }
        } catch (error) {
          return { violated: false, value }
        }
      
      default:
        return { violated: false, value }
    }
  }

  /**
   * Get value at a specific path in the message data
   */
  private getValueAtPath(obj: any, path: string): any {
    const pathParts = path.split('.')
    let current = obj

    for (const part of pathParts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part]
      } else {
        return undefined
      }
    }

    return current
  }

  /**
   * Extract segment name from path
   */
  private extractSegmentFromPath(path: string): string {
    return path.split('.')[0] || 'Unknown'
  }

  /**
   * Extract field number from path
   */
  private extractFieldFromPath(path: string): number {
    const parts = path.split('.')
    return parts.length > 1 ? parseInt(parts[1]) || 0 : 0
  }

  /**
   * Validate HL7 date format
   */
  private isValidHL7Date(dateString: string): boolean {
    // HL7 date format: YYYYMMDD[HHMMSS[.SSSS]][+/-ZZZZ]
    const hl7DateRegex = /^\d{8}(\d{6}(\.\d{1,4})?)?([+-]\d{4})?$/
    return hl7DateRegex.test(dateString)
  }

  /**
   * Load UK ITK schema
   */
  static async loadUKITKSchema(): Promise<any> {
    // This would typically load from a file or database
    // For now, return a basic UK ITK schema structure
    return {
      name: 'UK_ITK',
      version: '2.2',
      description: 'UK Interoperability Toolkit for NHS',
      mandatorySegments: ['MSH', 'EVN'],
      optionalSegments: ['PID', 'PV1', 'ZU1', 'ZU3'],
      segmentCardinality: {
        'QAK': '[1..1]',
        'EVN': '[1..1]'
      },
      zSegments: {
        'ZU1': {
          name: 'Additional PV info',
          fields: ['ZU1.1', 'ZU1.2', 'ZU1.3']
        },
        'ZU3': {
          name: 'Attendance Details',
          fields: ['ZU3.1', 'ZU3.2']
        }
      }
    }
  }
}

// Export a default instance
export const defaultValidationEngine = new ValidationEngine()
