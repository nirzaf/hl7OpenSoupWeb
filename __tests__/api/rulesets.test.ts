import { createMocks } from 'node-mocks-http'
import { GET, POST } from '../../app/api/rulesets/route'
import { GET as getById, PUT, DELETE } from '../../app/api/rulesets/[id]/route'
import { getCollection } from '../../lib/mongodb'
import type { RuleSet } from '../../types/hl7'

// Mock MongoDB
jest.mock('../../lib/mongodb')
const mockGetCollection = getCollection as jest.MockedFunction<typeof getCollection>

describe('/api/rulesets', () => {
  let mockCollection: any

  beforeEach(() => {
    mockCollection = {
      find: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue([])
        })
      }),
      insertOne: jest.fn().mockResolvedValue({ insertedId: 'new-ruleset-id' }),
      findOne: jest.fn().mockResolvedValue(null),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 })
    }

    mockGetCollection.mockResolvedValue(mockCollection)
  })

  describe('GET /api/rulesets', () => {
    it('should return all rule sets', async () => {
      const mockRuleSets: RuleSet[] = [
        {
          _id: 'ruleset-1',
          name: 'Standard HL7 Rules',
          description: 'Basic HL7 validation rules',
          rules: [
            {
              name: 'MSH Required',
              targetPath: 'MSH',
              condition: 'exists',
              severity: 'error'
            }
          ],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          _id: 'ruleset-2',
          name: 'Custom Facility Rules',
          description: 'Facility-specific validation rules',
          rules: [
            {
              name: 'PID.3 Format',
              targetPath: 'PID.3',
              condition: 'matchesRegex',
              expectedValue: '^[A-Z0-9]+$',
              severity: 'warning'
            }
          ],
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ]

      mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          toArray: jest.fn().mockResolvedValue(mockRuleSets)
        })
      })

      const { req } = createMocks({
        method: 'GET',
        url: '/api/rulesets'
      })

      const response = await GET(req)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData).toHaveLength(2)
      expect(responseData[0].name).toBe('Standard HL7 Rules')
      expect(responseData[1].name).toBe('Custom Facility Rules')
    })

    it('should filter active rule sets only', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/rulesets?active=true'
      })

      await GET(req)

      expect(mockCollection.find).toHaveBeenCalledWith({ isActive: true })
    })

    it('should handle database errors', async () => {
      mockCollection.find.mockImplementation(() => {
        throw new Error('Database connection failed')
      })

      const { req } = createMocks({
        method: 'GET',
        url: '/api/rulesets'
      })

      const response = await GET(req)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toContain('Failed to fetch rule sets')
    })
  })

  describe('POST /api/rulesets', () => {
    it('should create a new rule set', async () => {
      const newRuleSet = {
        name: 'New Test Rules',
        description: 'Test rule set for unit testing',
        rules: [
          {
            name: 'Test Rule',
            targetPath: 'MSH.3',
            condition: 'exists',
            severity: 'error',
            actionDetail: 'Sending application is required'
          }
        ],
        isActive: true
      }

      const { req } = createMocks({
        method: 'POST',
        body: newRuleSet
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newRuleSet.name,
          description: newRuleSet.description,
          rules: newRuleSet.rules,
          isActive: true,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        })
      )
    })

    it('should validate required fields', async () => {
      const invalidRuleSet = {
        // Missing name
        description: 'Test rule set',
        rules: []
      }

      const { req } = createMocks({
        method: 'POST',
        body: invalidRuleSet
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Name is required')
    })

    it('should validate rule structure', async () => {
      const ruleSetWithInvalidRule = {
        name: 'Invalid Rules Test',
        description: 'Test rule set with invalid rules',
        rules: [
          {
            // Missing required fields
            name: 'Invalid Rule'
          }
        ]
      }

      const { req } = createMocks({
        method: 'POST',
        body: ruleSetWithInvalidRule
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Invalid rule structure')
    })

    it('should handle duplicate rule set names', async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: 'existing-id',
        name: 'Existing Rule Set'
      })

      const duplicateRuleSet = {
        name: 'Existing Rule Set',
        description: 'Duplicate name test',
        rules: []
      }

      const { req } = createMocks({
        method: 'POST',
        body: duplicateRuleSet
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(409)
      expect(responseData.error).toContain('Rule set with this name already exists')
    })
  })

  describe('GET /api/rulesets/[id]', () => {
    it('should return specific rule set by ID', async () => {
      const mockRuleSet: RuleSet = {
        _id: 'specific-ruleset-id',
        name: 'Specific Rule Set',
        description: 'A specific rule set for testing',
        rules: [
          {
            name: 'Specific Rule',
            targetPath: 'PID.5',
            condition: 'exists',
            severity: 'error'
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockCollection.findOne.mockResolvedValue(mockRuleSet)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/rulesets/specific-ruleset-id'
      })

      const response = await getById(req, { params: { id: 'specific-ruleset-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.name).toBe('Specific Rule Set')
      expect(responseData.rules).toHaveLength(1)
    })

    it('should return 404 for non-existent rule set', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'GET',
        url: '/api/rulesets/non-existent-id'
      })

      const response = await getById(req, { params: { id: 'non-existent-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Rule set not found')
    })

    it('should handle invalid ObjectId format', async () => {
      const { req } = createMocks({
        method: 'GET',
        url: '/api/rulesets/invalid-id-format'
      })

      const response = await getById(req, { params: { id: 'invalid-id-format' } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Invalid rule set ID format')
    })
  })

  describe('PUT /api/rulesets/[id]', () => {
    it('should update existing rule set', async () => {
      const existingRuleSet = {
        _id: 'update-test-id',
        name: 'Original Name',
        description: 'Original description',
        rules: [],
        isActive: true
      }

      const updateData = {
        name: 'Updated Name',
        description: 'Updated description',
        rules: [
          {
            name: 'New Rule',
            targetPath: 'MSH.10',
            condition: 'exists',
            severity: 'warning'
          }
        ],
        isActive: false
      }

      mockCollection.findOne.mockResolvedValue(existingRuleSet)

      const { req } = createMocks({
        method: 'PUT',
        body: updateData
      })

      const response = await PUT(req, { params: { id: 'update-test-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        {
          $set: expect.objectContaining({
            name: 'Updated Name',
            description: 'Updated description',
            rules: updateData.rules,
            isActive: false,
            updatedAt: expect.any(Date)
          })
        }
      )
    })

    it('should return 404 for non-existent rule set update', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'PUT',
        body: { name: 'Updated Name' }
      })

      const response = await PUT(req, { params: { id: 'non-existent-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Rule set not found')
    })

    it('should validate update data', async () => {
      const existingRuleSet = {
        _id: 'validate-test-id',
        name: 'Existing Rule Set'
      }

      mockCollection.findOne.mockResolvedValue(existingRuleSet)

      const invalidUpdateData = {
        name: '', // Empty name should be invalid
        rules: [
          {
            // Invalid rule structure
            name: 'Invalid Rule'
          }
        ]
      }

      const { req } = createMocks({
        method: 'PUT',
        body: invalidUpdateData
      })

      const response = await PUT(req, { params: { id: 'validate-test-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('validation')
    })
  })

  describe('DELETE /api/rulesets/[id]', () => {
    it('should delete existing rule set', async () => {
      const existingRuleSet = {
        _id: 'delete-test-id',
        name: 'Rule Set to Delete'
      }

      mockCollection.findOne.mockResolvedValue(existingRuleSet)

      const { req } = createMocks({
        method: 'DELETE'
      })

      const response = await DELETE(req, { params: { id: 'delete-test-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.message).toBe('Rule set deleted successfully')
      expect(mockCollection.deleteOne).toHaveBeenCalledWith({
        _id: expect.any(Object)
      })
    })

    it('should return 404 for non-existent rule set deletion', async () => {
      mockCollection.findOne.mockResolvedValue(null)

      const { req } = createMocks({
        method: 'DELETE'
      })

      const response = await DELETE(req, { params: { id: 'non-existent-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(404)
      expect(responseData.error).toBe('Rule set not found')
    })

    it('should handle deletion errors', async () => {
      const existingRuleSet = {
        _id: 'error-test-id',
        name: 'Rule Set with Error'
      }

      mockCollection.findOne.mockResolvedValue(existingRuleSet)
      mockCollection.deleteOne.mockRejectedValue(new Error('Database deletion failed'))

      const { req } = createMocks({
        method: 'DELETE'
      })

      const response = await DELETE(req, { params: { id: 'error-test-id' } })
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toContain('Failed to delete rule set')
    })
  })

  describe('Rule Set Validation', () => {
    it('should validate rule conditions', async () => {
      const ruleSetWithInvalidCondition = {
        name: 'Invalid Condition Test',
        description: 'Test invalid conditions',
        rules: [
          {
            name: 'Invalid Condition Rule',
            targetPath: 'MSH.1',
            condition: 'invalidCondition',
            severity: 'error'
          }
        ]
      }

      const { req } = createMocks({
        method: 'POST',
        body: ruleSetWithInvalidCondition
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Invalid condition')
    })

    it('should validate severity levels', async () => {
      const ruleSetWithInvalidSeverity = {
        name: 'Invalid Severity Test',
        description: 'Test invalid severity',
        rules: [
          {
            name: 'Invalid Severity Rule',
            targetPath: 'MSH.1',
            condition: 'exists',
            severity: 'invalidSeverity'
          }
        ]
      }

      const { req } = createMocks({
        method: 'POST',
        body: ruleSetWithInvalidSeverity
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Invalid severity')
    })

    it('should validate target path format', async () => {
      const ruleSetWithInvalidPath = {
        name: 'Invalid Path Test',
        description: 'Test invalid target paths',
        rules: [
          {
            name: 'Invalid Path Rule',
            targetPath: '', // Empty path
            condition: 'exists',
            severity: 'error'
          }
        ]
      }

      const { req } = createMocks({
        method: 'POST',
        body: ruleSetWithInvalidPath
      })

      const response = await POST(req)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toContain('Target path is required')
    })
  })
})
