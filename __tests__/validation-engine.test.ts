import { ValidationEngine } from '../lib/validation-engine'
import { HL7Service } from '../lib/hl7Service'
import type { RuleSet, ValidationRule } from '../types/hl7'

// Mock HL7Service
jest.mock('../lib/hl7Service')

describe('ValidationEngine', () => {
  let validationEngine: ValidationEngine
  let mockHL7Service: jest.Mocked<HL7Service>

  beforeEach(() => {
    mockHL7Service = {
      validateMessage: jest.fn(),
      parseMessage: jest.fn(),
      generateMessage: jest.fn(),
      editField: jest.fn(),
    } as any

    // Mock the HL7Service constructor
    ;(HL7Service as jest.MockedClass<typeof HL7Service>).mockImplementation(() => mockHL7Service)
    
    validationEngine = new ValidationEngine()
  })

  describe('validateMessage', () => {
    const mockMessageData = {
      MSH: {
        'MSH.1': '|',
        'MSH.2': '^~\\&',
        'MSH.3': 'SENDING_APP',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001'
      },
      PID: {
        'PID.1': '1',
        'PID.3': 'PATIENT123',
        'PID.5': 'DOE^JOHN'
      }
    }

    it('should validate message with basic HL7 validation only', async () => {
      mockHL7Service.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await validationEngine.validateMessage({
        messageData: mockMessageData
      })

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(mockHL7Service.validateMessage).toHaveBeenCalledWith(mockMessageData, undefined)
    })

    it('should validate message with custom rule set', async () => {
      const mockRuleSet: RuleSet = {
        _id: 'test-ruleset',
        name: 'Test Rules',
        description: 'Test rule set',
        rules: [
          {
            name: 'PID.3 Required',
            targetPath: 'PID.3',
            condition: 'exists',
            severity: 'error',
            actionDetail: 'Patient ID is required'
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockHL7Service.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await validationEngine.validateMessage({
        messageData: mockMessageData,
        ruleSet: mockRuleSet
      })

      expect(result.isValid).toBe(true)
      expect(result.summary?.ruleSetUsed).toBe('Test Rules')
    })

    it('should detect rule violations', async () => {
      const mockRuleSet: RuleSet = {
        _id: 'test-ruleset',
        name: 'Test Rules',
        description: 'Test rule set',
        rules: [
          {
            name: 'PID.8 Must be M or F',
            targetPath: 'PID.8',
            condition: 'equals',
            expectedValue: 'M',
            severity: 'error',
            actionDetail: 'Gender must be M or F'
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const messageWithoutGender = {
        ...mockMessageData,
        PID: {
          ...mockMessageData.PID,
          'PID.8': 'X' // Invalid gender
        }
      }

      mockHL7Service.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const result = await validationEngine.validateMessage({
        messageData: messageWithoutGender,
        ruleSet: mockRuleSet
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('Gender must be M or F')
      expect(result.errors[0].severity).toBe('error')
    })

    it('should handle UK ITK validation', async () => {
      const customSchema = {
        segments: {
          EVN: { required: true },
          MSH: { required: true }
        }
      }

      mockHL7Service.validateMessage.mockReturnValue({
        isValid: true,
        errors: [],
        warnings: []
      })

      const validationEngineWithSchema = new ValidationEngine(customSchema)
      
      const result = await validationEngineWithSchema.validateMessage({
        messageData: mockMessageData,
        customSchema
      })

      expect(mockHL7Service.validateMessage).toHaveBeenCalledWith(mockMessageData, customSchema)
    })

    it('should handle validation errors gracefully', async () => {
      mockHL7Service.validateMessage.mockImplementation(() => {
        throw new Error('Validation service error')
      })

      const result = await validationEngine.validateMessage({
        messageData: mockMessageData
      })

      expect(result.isValid).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].segment).toBe('SYSTEM')
      expect(result.errors[0].message).toContain('Validation engine error')
    })
  })

  describe('evaluateRule', () => {
    const testMessage = {
      MSH: { 'MSH.3': 'TEST_APP', 'MSH.9': 'ADT^A01' },
      PID: { 'PID.3': 'PATIENT123', 'PID.5': 'DOE^JOHN', 'PID.8': 'M' }
    }

    it('should evaluate exists condition correctly', () => {
      const rule: ValidationRule = {
        name: 'PID.3 exists',
        targetPath: 'PID.3',
        condition: 'exists',
        severity: 'error'
      }

      const result = (validationEngine as any).evaluateRule(testMessage, rule)
      expect(result.violated).toBe(false)
    })

    it('should evaluate missing field with exists condition', () => {
      const rule: ValidationRule = {
        name: 'PID.99 exists',
        targetPath: 'PID.99',
        condition: 'exists',
        severity: 'error'
      }

      const result = (validationEngine as any).evaluateRule(testMessage, rule)
      expect(result.violated).toBe(true)
    })

    it('should evaluate equals condition correctly', () => {
      const rule: ValidationRule = {
        name: 'Gender is M',
        targetPath: 'PID.8',
        condition: 'equals',
        expectedValue: 'M',
        severity: 'error'
      }

      const result = (validationEngine as any).evaluateRule(testMessage, rule)
      expect(result.violated).toBe(false)
    })

    it('should evaluate regex condition correctly', () => {
      const rule: ValidationRule = {
        name: 'Patient ID format',
        targetPath: 'PID.3',
        condition: 'matchesRegex',
        expectedValue: '^PATIENT\\d+$',
        severity: 'warning'
      }

      const result = (validationEngine as any).evaluateRule(testMessage, rule)
      expect(result.violated).toBe(false)
    })

    it('should evaluate length condition correctly', () => {
      const rule: ValidationRule = {
        name: 'Patient name length',
        targetPath: 'PID.5',
        condition: 'length',
        expectedValue: '8',
        severity: 'warning'
      }

      const result = (validationEngine as any).evaluateRule(testMessage, rule)
      expect(result.violated).toBe(false)
    })

    it('should handle invalid regex gracefully', () => {
      const rule: ValidationRule = {
        name: 'Invalid regex',
        targetPath: 'PID.3',
        condition: 'matchesRegex',
        expectedValue: '[invalid regex',
        severity: 'error'
      }

      expect(() => {
        (validationEngine as any).evaluateRule(testMessage, rule)
      }).toThrow()
    })
  })

  describe('loadUKITKSchema', () => {
    it('should load UK ITK schema', async () => {
      const schema = await ValidationEngine.loadUKITKSchema()
      
      expect(schema).toBeDefined()
      expect(schema.segments).toBeDefined()
      expect(schema.segments.MSH).toBeDefined()
      expect(schema.segments.EVN).toBeDefined()
    })
  })

  describe('helper methods', () => {
    it('should extract segment from path correctly', () => {
      const segment = (validationEngine as any).extractSegmentFromPath('PID.5.1')
      expect(segment).toBe('PID')
    })

    it('should extract field from path correctly', () => {
      const field = (validationEngine as any).extractFieldFromPath('PID.5.1')
      expect(field).toBe(5)
    })

    it('should handle invalid path gracefully', () => {
      const segment = (validationEngine as any).extractSegmentFromPath('invalid')
      expect(segment).toBe('UNKNOWN')
    })
  })
})
