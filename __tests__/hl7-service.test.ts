import { HL7Service } from '../lib/hl7Service'

// Create __tests__ directory structure
// This test file validates the HL7Service functionality

// Mock the @ehr/hl7-v2 module
jest.mock('@ehr/hl7-v2', () => ({
  HL7v2: jest.fn().mockImplementation(() => ({
    parse: jest.fn().mockReturnValue({
      MSH: {
        'MSH.1': '|',
        'MSH.2': '^~\\&',
        'MSH.3': 'SENDING_APP',
        'MSH.4': 'SENDING_FACILITY',
        'MSH.5': 'RECEIVING_APP',
        'MSH.6': 'RECEIVING_FACILITY',
        'MSH.7': '20231201120000',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001',
        'MSH.11': 'P',
        'MSH.12': '2.5'
      }
    }),
    generate: jest.fn().mockReturnValue('MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5')
  }))
}))

describe('HL7Service', () => {
  let hl7Service: HL7Service

  beforeEach(() => {
    hl7Service = new HL7Service()
  })

  describe('parseMessage', () => {
    it('should parse a valid HL7 message', () => {
      const hl7Text = 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5'
      
      const result = hl7Service.parseMessage(hl7Text)
      
      expect(result).toHaveProperty('segments')
      expect(result).toHaveProperty('metadata')
      expect(result.metadata.messageType).toBe('ADT^A01')
      expect(result.metadata.versionId).toBe('2.5')
      expect(result.metadata.sendingFacility).toBe('SENDING_FACILITY')
    })

    it('should handle parsing errors gracefully', () => {
      const invalidHL7 = 'INVALID_MESSAGE'
      
      expect(() => {
        hl7Service.parseMessage(invalidHL7)
      }).toThrow('Failed to parse HL7 message')
    })

    it('should clean input text before parsing', () => {
      const hl7TextWithWhitespace = '  \r\nMSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\r\n  '
      
      const result = hl7Service.parseMessage(hl7TextWithWhitespace)
      
      expect(result).toHaveProperty('segments')
      expect(result).toHaveProperty('metadata')
    })
  })

  describe('generateMessage', () => {
    it('should generate HL7 message from JSON object', () => {
      const jsonObject = {
        MSH: {
          'MSH.1': '|',
          'MSH.2': '^~\\&',
          'MSH.3': 'SENDING_APP'
        }
      }
      
      const result = hl7Service.generateMessage(jsonObject)
      
      expect(typeof result).toBe('string')
      expect(result).toContain('MSH|')
    })

    it('should handle generation errors gracefully', () => {
      const invalidObject = null
      
      expect(() => {
        hl7Service.generateMessage(invalidObject)
      }).toThrow('Failed to generate HL7 message')
    })
  })

  describe('validateMessage', () => {
    it('should validate a valid message', () => {
      const validMessage = {
        MSH: {
          'MSH.1': '|',
          'MSH.9': 'ADT^A01',
          'MSH.10': 'MSG001'
        }
      }
      
      const result = hl7Service.validateMessage(validMessage)
      
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect missing MSH segment', () => {
      const invalidMessage = {
        PID: {
          'PID.1': '1'
        }
      }
      
      const result = hl7Service.validateMessage(invalidMessage)
      
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          segment: 'MSH',
          message: 'MSH segment is required'
        })
      )
    })

    it('should generate warnings for missing recommended fields', () => {
      const messageWithMissingFields = {
        MSH: {
          'MSH.1': '|',
          'MSH.2': '^~\\&'
          // Missing other recommended fields
        }
      }
      
      const result = hl7Service.validateMessage(messageWithMissingFields)
      
      expect(result.warnings.length).toBeGreaterThan(0)
    })
  })

  describe('editField', () => {
    it('should edit an existing field', () => {
      const message = {
        MSH: {
          'MSH.3': 'OLD_APP'
        }
      }
      
      const result = hl7Service.editField(message, 'MSH.MSH.3', 'NEW_APP')
      
      expect(result.MSH['MSH.3']).toBe('NEW_APP')
    })

    it('should create new field if it does not exist', () => {
      const message = {
        MSH: {}
      }
      
      const result = hl7Service.editField(message, 'MSH.MSH.3', 'NEW_APP')
      
      expect(result.MSH['MSH.3']).toBe('NEW_APP')
    })

    it('should handle nested path creation', () => {
      const message = {}
      
      const result = hl7Service.editField(message, 'PID.PID.3', 'PATIENT_ID')
      
      expect(result.PID['PID.3']).toBe('PATIENT_ID')
    })
  })

  describe('parseHL7DateTime', () => {
    it('should parse valid HL7 datetime', () => {
      // Access private method through any cast for testing
      const parseDateTime = (hl7Service as any).parseHL7DateTime.bind(hl7Service)
      
      const result = parseDateTime('20231201120000')
      
      expect(result).toBeInstanceOf(Date)
      expect(result.getFullYear()).toBe(2023)
      expect(result.getMonth()).toBe(11) // December (0-based)
      expect(result.getDate()).toBe(1)
    })

    it('should handle invalid datetime gracefully', () => {
      const parseDateTime = (hl7Service as any).parseHL7DateTime.bind(hl7Service)
      
      const result = parseDateTime('INVALID_DATE')
      
      expect(result).toBeInstanceOf(Date)
    })

    it('should handle empty datetime', () => {
      const parseDateTime = (hl7Service as any).parseHL7DateTime.bind(hl7Service)
      
      const result = parseDateTime('')
      
      expect(result).toBeInstanceOf(Date)
    })
  })

  describe('extractMetadata', () => {
    it('should extract metadata from MSH segment', () => {
      const msh = {
        'MSH.3': 'SENDING_APP',
        'MSH.4': 'SENDING_FACILITY',
        'MSH.6': 'RECEIVING_FACILITY',
        'MSH.7': '20231201120000',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001',
        'MSH.12': '2.5'
      }
      
      const extractMetadata = (hl7Service as any).extractMetadata.bind(hl7Service)
      const result = extractMetadata(msh)
      
      expect(result.messageType).toBe('ADT^A01')
      expect(result.versionId).toBe('2.5')
      expect(result.sendingFacility).toBe('SENDING_FACILITY')
      expect(result.receivingFacility).toBe('RECEIVING_FACILITY')
      expect(result.controlId).toBe('MSG001')
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should handle missing MSH fields gracefully', () => {
      const msh = {}
      
      const extractMetadata = (hl7Service as any).extractMetadata.bind(hl7Service)
      const result = extractMetadata(msh)
      
      expect(result.messageType).toBe('Unknown')
      expect(result.versionId).toBe('2.5')
      expect(result.sendingFacility).toBe('Unknown')
      expect(result.receivingFacility).toBe('Unknown')
      expect(result.controlId).toBe('Unknown')
      expect(result.timestamp).toBeInstanceOf(Date)
    })
  })
})
