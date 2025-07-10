import { getCollection } from '../../lib/mongodb'

// Mock Next.js server components before importing routes
jest.mock('next/server', () => ({
  NextRequest: class NextRequest {
    constructor(url, options = {}) {
      this.url = url
      this.method = options.method || 'GET'
      this.headers = new Map()
      this._body = options.body
    }

    async json() {
      if (typeof this._body === 'string') {
        return JSON.parse(this._body)
      }
      return this._body || {}
    }
  },
  NextResponse: {
    json: (data, options = {}) => ({
      json: () => Promise.resolve(data),
      status: options.status || 200,
      headers: new Map()
    }),
    next: () => ({ next: true })
  }
}))

// Import routes after mocking
import { GET, POST } from '../../app/api/messages/route'
import { POST as validatePOST } from '../../app/api/messages/validate/route'
import { NextRequest } from 'next/server'

// Mock MongoDB
jest.mock('../../lib/mongodb')
jest.mock('mongodb', () => ({
  ObjectId: jest.fn().mockImplementation((id) => ({ toString: () => id || 'mock-id' })),
  MongoClient: jest.fn()
}))

const mockGetCollection = getCollection as jest.MockedFunction<typeof getCollection>

// Mock HL7Service
jest.mock('../../lib/hl7Service', () => ({
  HL7Service: jest.fn().mockImplementation(() => ({
    parseMessage: jest.fn().mockImplementation((message) => {
      if (message.includes('INVALID')) {
        throw new Error('Invalid HL7 format')
      }
      return {
        segments: {
          MSH: { 'MSH.1': '|', 'MSH.9': 'ADT^A01' },
          PID: { 'PID.1': '1', 'PID.3': 'PATIENT123' }
        },
        metadata: {
          messageType: 'ADT^A01',
          versionId: '2.5',
          sendingFacility: 'TEST_FACILITY'
        }
      }
    }),
    validateMessage: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
      warnings: []
    })
  }))
}))

// Mock ValidationEngine
jest.mock('../../lib/validation-engine', () => ({
  ValidationEngine: jest.fn().mockImplementation(() => ({
    validateMessage: jest.fn().mockResolvedValue({
      isValid: true,
      errors: [],
      warnings: [],
      info: [],
      summary: {
        totalErrors: 0,
        totalWarnings: 0,
        totalInfo: 0,
        validationTime: 100
      }
    })
  }))
}))

describe('/api/messages', () => {
  let mockCollection: any

  beforeEach(() => {
    mockCollection = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([])
            })
          })
        })
      }),
      countDocuments: jest.fn().mockResolvedValue(0),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'new-message-id' }),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    }

    mockGetCollection.mockResolvedValue(mockCollection)
  })

  describe('GET /api/messages', () => {
    it('should return paginated messages', async () => {
      const mockMessages = [
        {
          _id: 'message-1',
          name: 'Test Message 1',
          rawMessage: 'MSH|^~\\&|...',
          metadata: { messageType: 'ADT^A01' },
          createdAt: new Date()
        },
        {
          _id: 'message-2',
          name: 'Test Message 2',
          rawMessage: 'MSH|^~\\&|...',
          metadata: { messageType: 'ADT^A04' },
          createdAt: new Date()
        }
      ]

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue(mockMessages)
            })
          })
        })
      })
      mockCollection.countDocuments.mockResolvedValue(2)

      const req = new NextRequest('http://localhost:3000/api/messages?page=1&limit=10', {
        method: 'GET'
      })

      await GET(req)

      expect(mockCollection.find).toHaveBeenCalled()
      expect(mockCollection.countDocuments).toHaveBeenCalled()
    })

    it('should handle filtering by message type', async () => {
      const req = new NextRequest('http://localhost:3000/api/messages?filter[messageType]=ADT^A01', {
        method: 'GET'
      })

      await GET(req)

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          'metadata.messageType': 'ADT^A01'
        })
      )
    })

    it('should handle search queries', async () => {
      const req = new NextRequest('http://localhost:3000/api/messages?search=patient', {
        method: 'GET'
      })

      await GET(req)

      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { name: expect.objectContaining({ $regex: 'patient', $options: 'i' }) }
          ])
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      mockCollection.find.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const req = new NextRequest('http://localhost:3000/api/messages', {
        method: 'GET'
      })

      const response = await GET(req)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toContain('Failed to fetch messages')
    })
  })

  describe('POST /api/messages', () => {
    it('should create a new message with raw HL7 content', async () => {
      const messageData = {
        name: 'New Test Message',
        rawMessage: 'MSH|^~\\&|SENDING_APP|FACILITY|RECEIVING_APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5\rPID|1||PATIENT123||DOE^JOHN||19800101|M'
      }

      const req = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: messageData.name,
          rawMessage: messageData.rawMessage,
          parsedMessage: expect.any(Object),
          metadata: expect.any(Object)
        })
      )
    })

    it('should create a message with pre-parsed data', async () => {
      const messageData = {
        name: 'Pre-parsed Message',
        parsedMessage: {
          MSH: { 'MSH.1': '|', 'MSH.9': 'ADT^A01' }
        },
        metadata: {
          messageType: 'ADT^A01',
          versionId: '2.5'
        }
      }

      const req = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      const response = await POST(req)

      expect(response.status).toBe(201)
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: messageData.name,
          parsedMessage: messageData.parsedMessage,
          metadata: expect.objectContaining({
            messageType: messageData.metadata.messageType,
            versionId: messageData.metadata.versionId
          })
        })
      )
    })

    it('should handle invalid HL7 message gracefully', async () => {
      // Mock HL7Service to throw an error
      const { HL7Service } = require('../../lib/hl7Service')
      HL7Service.mockImplementation(() => ({
        parseMessage: jest.fn().mockImplementation(() => {
          throw new Error('Invalid HL7 format')
        })
      }))

      const messageData = {
        name: 'Invalid Message',
        rawMessage: 'INVALID_HL7_CONTENT'
      }

      const req = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Failed to parse HL7 message')
    })

    it('should handle missing required fields', async () => {
      const messageData = {
        // Missing name field
        rawMessage: 'MSH|^~\\&|...'
      }

      const req = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Name is required')
    })

    it('should handle database insertion errors', async () => {
      mockCollection.insertOne.mockRejectedValue(new Error('Database write failed'))

      const messageData = {
        name: 'Test Message',
        rawMessage: 'MSH|^~\\&|...'
      }

      const req = new NextRequest('http://localhost:3000/api/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toContain('Failed to create message')
    })
  })

  describe('POST /api/messages/validate', () => {
    it('should validate message by ID', async () => {
      const mockMessage = {
        _id: 'message-id',
        parsedMessage: {
          MSH: { 'MSH.1': '|', 'MSH.9': 'ADT^A01' }
        },
        rawMessage: 'MSH|^~\\&|...'
      }

      mockCollection.findOne.mockResolvedValue(mockMessage)

      const req = new NextRequest('http://localhost:3000/api/messages/validate', {
        method: 'POST',
        body: JSON.stringify({
          messageId: 'message-id'
        })
      })

      const response = await validatePOST(req)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.isValid).toBe(true)
      expect(responseData.summary).toBeDefined()
    })

    it('should validate raw message content', async () => {
      const req = new NextRequest('http://localhost:3000/api/messages/validate', {
        method: 'POST',
        body: JSON.stringify({
          rawMessage: 'MSH|^~\\&|SENDING_APP|FACILITY|RECEIVING_APP|FACILITY|20231201120000||ADT^A01|MSG001|P|2.5'
        })
      })

      const response = await validatePOST(req)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.isValid).toBe(true)
    })

    it('should validate with custom rule set', async () => {
      const mockRuleSet = {
        _id: 'ruleset-id',
        name: 'Test Rules',
        rules: [
          {
            name: 'MSH.3 Required',
            targetPath: 'MSH.3',
            condition: 'exists',
            severity: 'error'
          }
        ]
      }

      mockCollection.findOne
        .mockResolvedValueOnce({
          _id: 'message-id',
          parsedMessage: { MSH: { 'MSH.1': '|' } }
        })
        .mockResolvedValueOnce(mockRuleSet)

      const req = new NextRequest('http://localhost:3000/api/messages/validate', {
        method: 'POST',
        body: JSON.stringify({
          messageId: 'message-id',
          ruleSetId: 'ruleset-id'
        })
      })

      const response = await validatePOST(req)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.summary.ruleSetUsed).toBe('Test Rules')
    })

    it('should handle UK ITK validation', async () => {
      const req = new NextRequest('http://localhost:3000/api/messages/validate', {
        method: 'POST',
        body: JSON.stringify({
          rawMessage: 'MSH|^~\\&|...',
          useUKITK: true
        })
      })

      const response = await validatePOST(req)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.isValid).toBe(true)
    })

    it('should handle validation errors', async () => {
      const req = new NextRequest('http://localhost:3000/api/messages/validate', {
        method: 'POST',
        body: JSON.stringify({
          messageId: 'non-existent-id'
        })
      })

      const response = await validatePOST(req)
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toContain('Message not found')
    })

    it('should handle missing validation data', async () => {
      const req = new NextRequest('http://localhost:3000/api/messages/validate', {
        method: 'POST',
        body: JSON.stringify({})
      })

      const response = await validatePOST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('No message provided for validation')
    })
  })
})
