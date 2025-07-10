import { 
  TransformationService, 
  XMLConversionService, 
  CSVConversionService 
} from '../lib/transformation-services'
import type { HL7Message } from '../types/hl7'

describe('TransformationService', () => {
  const mockHL7Message: HL7Message = {
    _id: 'test-message-id',
    name: 'Test Message',
    rawMessage: 'MSH|^~\\&|SENDING_APP|SENDING_FACILITY|RECEIVING_APP|RECEIVING_FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M',
    parsedMessage: {
      MSH: {
        'MSH.1': '|',
        'MSH.2': '^~\\&',
        'MSH.3': 'SENDING_APP',
        'MSH.4': 'SENDING_FACILITY',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001'
      },
      PID: {
        'PID.1': '1',
        'PID.3': 'PATIENT123',
        'PID.5': 'DOE^JOHN',
        'PID.7': '19800101',
        'PID.8': 'M'
      }
    },
    metadata: {
      messageType: 'ADT^A01',
      versionId: '2.5',
      sendingFacility: 'SENDING_FACILITY',
      receivingFacility: 'RECEIVING_FACILITY',
      controlId: 'MSG001',
      timestamp: new Date('2023-12-01T12:00:00Z')
    },
    isValid: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  describe('export', () => {
    it('should export to JSON format', () => {
      const result = TransformationService.export(mockHL7Message, 'json')
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('json')
      expect(result.data).toBeDefined()
      
      const parsedData = JSON.parse(result.data!)
      expect(parsedData.MSH).toBeDefined()
      expect(parsedData.PID).toBeDefined()
    })

    it('should export to JSON with metadata', () => {
      const result = TransformationService.export(mockHL7Message, 'json', { includeMetadata: true })
      
      expect(result.success).toBe(true)
      const parsedData = JSON.parse(result.data!)
      expect(parsedData.metadata).toBeDefined()
      expect(parsedData.metadata.messageType).toBe('ADT^A01')
    })

    it('should export to XML format', () => {
      const result = TransformationService.export(mockHL7Message, 'xml')
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('xml')
      expect(result.data).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(result.data).toContain('<HL7Message>')
    })

    it('should export to CSV format', () => {
      const result = TransformationService.export(mockHL7Message, 'csv')
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('csv')
      expect(result.data).toContain('Segment,Field,Value')
    })

    it('should handle unsupported format', () => {
      const result = TransformationService.export(mockHL7Message, 'unsupported' as any)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported format')
    })
  })

  describe('import', () => {
    it('should import valid JSON data', () => {
      const jsonData = JSON.stringify({
        MSH: { 'MSH.1': '|', 'MSH.9': 'ADT^A01' },
        PID: { 'PID.1': '1', 'PID.3': 'PATIENT123' }
      })

      const result = TransformationService.import(jsonData, 'json')
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('json')
      
      const parsedData = JSON.parse(result.data!)
      expect(parsedData.MSH).toBeDefined()
      expect(parsedData.PID).toBeDefined()
    })

    it('should handle invalid JSON data', () => {
      const invalidJson = '{ invalid json }'
      
      const result = TransformationService.import(invalidJson, 'json')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Import failed')
    })

    it('should import XML data', () => {
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
        <HL7Message>
          <MSH>
            <MSH.1>|</MSH.1>
            <MSH.9>ADT^A01</MSH.9>
          </MSH>
        </HL7Message>`

      const result = TransformationService.import(xmlData, 'xml')
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('json')
    })

    it('should import CSV data', () => {
      const csvData = `Segment,Field,Value
MSH,MSH.1,|
MSH,MSH.9,ADT^A01
PID,PID.1,1`

      const result = TransformationService.import(csvData, 'csv')
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('json')
    })

    it('should handle unsupported import format', () => {
      const result = TransformationService.import('data', 'unsupported' as any)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported format')
    })
  })
})

describe('XMLConversionService', () => {
  const testData = {
    MSH: {
      'MSH.1': '|',
      'MSH.2': '^~\\&',
      'MSH.9': 'ADT^A01'
    },
    PID: {
      'PID.1': '1',
      'PID.3': 'PATIENT123'
    }
  }

  describe('toXML', () => {
    it('should convert HL7 data to XML', () => {
      const result = XMLConversionService.toXML(testData)
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('xml')
      expect(result.data).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(result.data).toContain('<HL7Message>')
      expect(result.data).toContain('<MSH>')
      expect(result.data).toContain('<PID>')
    })

    it('should handle conversion errors', () => {
      const circularData = { a: {} }
      circularData.a = circularData // Create circular reference
      
      const result = XMLConversionService.toXML(circularData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('XML conversion failed')
    })
  })

  describe('fromXML', () => {
    it('should convert XML to JSON', () => {
      const xmlData = `<?xml version="1.0" encoding="UTF-8"?>
        <HL7Message>
          <MSH>
            <MSH.1>|</MSH.1>
            <MSH.9>ADT^A01</MSH.9>
          </MSH>
        </HL7Message>`

      const result = XMLConversionService.fromXML(xmlData)
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('json')
      
      const parsedData = JSON.parse(result.data!)
      expect(parsedData).toBeDefined()
    })

    it('should handle invalid XML', () => {
      const invalidXml = '<invalid><xml>'
      
      const result = XMLConversionService.fromXML(invalidXml)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('XML parsing failed')
    })
  })
})

describe('CSVConversionService', () => {
  const testData = {
    MSH: {
      'MSH.1': '|',
      'MSH.9': 'ADT^A01'
    },
    PID: {
      'PID.1': '1',
      'PID.3': 'PATIENT123'
    }
  }

  describe('toCSV', () => {
    it('should convert HL7 data to CSV', () => {
      const result = CSVConversionService.toCSV(testData)
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('csv')
      expect(result.data).toContain('Segment,Field,Value')
      expect(result.data).toContain('MSH,MSH.1,|')
      expect(result.data).toContain('PID,PID.1,1')
    })

    it('should handle nested data structures', () => {
      const nestedData = {
        MSH: {
          'MSH.1': '|',
          'MSH.9': { component1: 'ADT', component2: 'A01' }
        }
      }

      const result = CSVConversionService.toCSV(nestedData)
      
      expect(result.success).toBe(true)
      expect(result.data).toContain('MSH,MSH.9,')
    })
  })

  describe('fromCSV', () => {
    it('should convert CSV to HL7 JSON format', () => {
      const csvData = `Segment,Field,Value
MSH,MSH.1,|
MSH,MSH.9,ADT^A01
PID,PID.1,1
PID,PID.3,PATIENT123`

      const result = CSVConversionService.fromCSV(csvData)
      
      expect(result.success).toBe(true)
      expect(result.format).toBe('json')
      
      const parsedData = JSON.parse(result.data!)
      expect(parsedData.MSH).toBeDefined()
      expect(parsedData.MSH['MSH.1']).toBe('|')
      expect(parsedData.PID).toBeDefined()
      expect(parsedData.PID['PID.3']).toBe('PATIENT123')
    })

    it('should handle invalid CSV format', () => {
      const invalidCsv = 'invalid,csv\ndata'
      
      const result = CSVConversionService.fromCSV(invalidCsv)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('CSV parsing failed')
    })

    it('should handle empty CSV data', () => {
      const result = CSVConversionService.fromCSV('')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('CSV parsing failed')
    })
  })
})
