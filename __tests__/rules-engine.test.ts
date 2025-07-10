import { RulesEngine } from '../lib/rules-engine'
import type { RuleSet, ValidationRule } from '../types/hl7'

describe('RulesEngine', () => {
  let rulesEngine: RulesEngine

  beforeEach(() => {
    rulesEngine = new RulesEngine()
  })

  describe('Rule Evaluation', () => {
    const testMessage = {
      MSH: {
        'MSH.1': '|',
        'MSH.2': '^~\\&',
        'MSH.3': 'SENDING_APP',
        'MSH.4': 'SENDING_FACILITY',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001',
        'MSH.12': '2.5'
      },
      PID: {
        'PID.1': '1',
        'PID.3': 'PATIENT123',
        'PID.5': 'DOE^JOHN',
        'PID.7': '19800101',
        'PID.8': 'M'
      },
      EVN: {
        'EVN.1': 'A01',
        'EVN.2': '20231201120000'
      }
    }

    it('should evaluate exists condition correctly', () => {
      const rule: ValidationRule = {
        name: 'MSH.3 exists',
        targetPath: 'MSH.3',
        condition: 'exists',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
      expect(result.violated).toBe(false)
    })

    it('should detect missing required fields', () => {
      const rule: ValidationRule = {
        name: 'MSH.99 exists',
        targetPath: 'MSH.99',
        condition: 'exists',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(false)
      expect(result.violated).toBe(true)
    })

    it('should evaluate equals condition', () => {
      const rule: ValidationRule = {
        name: 'Gender is Male',
        targetPath: 'PID.8',
        condition: 'equals',
        expectedValue: 'M',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should evaluate not equals condition', () => {
      const rule: ValidationRule = {
        name: 'Gender is not Unknown',
        targetPath: 'PID.8',
        condition: 'notEquals',
        expectedValue: 'U',
        severity: 'warning'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should evaluate regex pattern matching', () => {
      const rule: ValidationRule = {
        name: 'Patient ID format',
        targetPath: 'PID.3',
        condition: 'matchesRegex',
        expectedValue: '^PATIENT\\d+$',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should evaluate length constraints', () => {
      const rule: ValidationRule = {
        name: 'Control ID length',
        targetPath: 'MSH.10',
        condition: 'length',
        expectedValue: '6',
        severity: 'warning'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should evaluate minimum length', () => {
      const rule: ValidationRule = {
        name: 'Patient name min length',
        targetPath: 'PID.5',
        condition: 'minLength',
        expectedValue: '3',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should evaluate maximum length', () => {
      const rule: ValidationRule = {
        name: 'Patient name max length',
        targetPath: 'PID.5',
        condition: 'maxLength',
        expectedValue: '50',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should evaluate contains condition', () => {
      const rule: ValidationRule = {
        name: 'Message type contains ADT',
        targetPath: 'MSH.9',
        condition: 'contains',
        expectedValue: 'ADT',
        severity: 'info'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should evaluate in list condition', () => {
      const rule: ValidationRule = {
        name: 'Valid gender',
        targetPath: 'PID.8',
        condition: 'inList',
        expectedValue: 'M,F,U,O',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(true)
    })

    it('should handle invalid regex patterns', () => {
      const rule: ValidationRule = {
        name: 'Invalid regex',
        targetPath: 'PID.3',
        condition: 'matchesRegex',
        expectedValue: '[invalid regex',
        severity: 'error'
      }

      expect(() => {
        rulesEngine.evaluateRule(testMessage, rule)
      }).toThrow()
    })

    it('should handle missing target paths', () => {
      const rule: ValidationRule = {
        name: 'Missing segment',
        targetPath: 'ZZZ.1',
        condition: 'exists',
        severity: 'error'
      }

      const result = rulesEngine.evaluateRule(testMessage, rule)
      expect(result.passed).toBe(false)
      expect(result.violated).toBe(true)
    })
  })

  describe('Rule Set Execution', () => {
    const testRuleSet: RuleSet = {
      _id: 'test-ruleset',
      name: 'Test Rule Set',
      description: 'Test rules for validation',
      rules: [
        {
          name: 'MSH segment required',
          targetPath: 'MSH',
          condition: 'exists',
          severity: 'error',
          actionDetail: 'MSH segment is mandatory'
        },
        {
          name: 'Patient ID required',
          targetPath: 'PID.3',
          condition: 'exists',
          severity: 'error',
          actionDetail: 'Patient ID must be present'
        },
        {
          name: 'Valid message type',
          targetPath: 'MSH.9',
          condition: 'matchesRegex',
          expectedValue: '^(ADT|ORU|ORM)\\^[A-Z0-9]+$',
          severity: 'warning',
          actionDetail: 'Message type should follow standard format'
        }
      ],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const testMessage = {
      MSH: {
        'MSH.1': '|',
        'MSH.9': 'ADT^A01',
        'MSH.10': 'MSG001'
      },
      PID: {
        'PID.1': '1',
        'PID.3': 'PATIENT123'
      }
    }

    it('should execute all rules in a rule set', async () => {
      const result = await rulesEngine.executeRuleSet(testMessage, testRuleSet)

      expect(result.totalRules).toBe(3)
      expect(result.passedRules).toBe(3)
      expect(result.failedRules).toBe(0)
      expect(result.errors).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
    })

    it('should collect rule violations', async () => {
      const messageWithoutPID = {
        MSH: {
          'MSH.1': '|',
          'MSH.9': 'ADT^A01'
        }
      }

      const result = await rulesEngine.executeRuleSet(messageWithoutPID, testRuleSet)

      expect(result.failedRules).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toBe('Patient ID must be present')
    })

    it('should categorize violations by severity', async () => {
      const messageWithInvalidType = {
        MSH: {
          'MSH.1': '|',
          'MSH.9': 'INVALID_TYPE'
        },
        PID: {
          'PID.3': 'PATIENT123'
        }
      }

      const result = await rulesEngine.executeRuleSet(messageWithInvalidType, testRuleSet)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].severity).toBe('warning')
    })

    it('should handle inactive rule sets', async () => {
      const inactiveRuleSet = { ...testRuleSet, isActive: false }

      const result = await rulesEngine.executeRuleSet(testMessage, inactiveRuleSet)

      expect(result.totalRules).toBe(0)
      expect(result.skipped).toBe(true)
    })

    it('should provide execution timing', async () => {
      const result = await rulesEngine.executeRuleSet(testMessage, testRuleSet)

      expect(result.executionTime).toBeGreaterThan(0)
      expect(typeof result.executionTime).toBe('number')
    })
  })

  describe('Custom Rule Conditions', () => {
    it('should support custom date validation', () => {
      const rule: ValidationRule = {
        name: 'Valid birth date',
        targetPath: 'PID.7',
        condition: 'customDate',
        expectedValue: 'YYYYMMDD',
        severity: 'error'
      }

      const messageWithDate = {
        PID: { 'PID.7': '19800101' }
      }

      const result = rulesEngine.evaluateRule(messageWithDate, rule)
      expect(result.passed).toBe(true)
    })

    it('should support cross-field validation', () => {
      const rule: ValidationRule = {
        name: 'Consistent patient info',
        targetPath: 'PID.3',
        condition: 'crossField',
        expectedValue: 'PV1.19', // Patient ID should match visit patient ID
        severity: 'error'
      }

      const messageWithConsistentData = {
        PID: { 'PID.3': 'PATIENT123' },
        PV1: { 'PV1.19': 'PATIENT123' }
      }

      const result = rulesEngine.evaluateRule(messageWithConsistentData, rule)
      expect(result.passed).toBe(true)
    })

    it('should support conditional rules', () => {
      const rule: ValidationRule = {
        name: 'Gender-specific validation',
        targetPath: 'PID.8',
        condition: 'conditional',
        expectedValue: 'IF PID.8=F THEN OBX.3 CONTAINS PREGNANCY',
        severity: 'warning'
      }

      const femalePatientMessage = {
        PID: { 'PID.8': 'F' },
        OBX: { 'OBX.3': 'PREGNANCY_TEST' }
      }

      const result = rulesEngine.evaluateRule(femalePatientMessage, rule)
      expect(result.passed).toBe(true)
    })
  })

  describe('Performance and Scalability', () => {
    it('should handle large rule sets efficiently', async () => {
      const largeRuleSet: RuleSet = {
        _id: 'large-ruleset',
        name: 'Large Rule Set',
        description: 'Performance test rule set',
        rules: Array.from({ length: 100 }, (_, i) => ({
          name: `Rule ${i + 1}`,
          targetPath: `MSH.${(i % 20) + 1}`,
          condition: 'exists',
          severity: 'info' as const
        })),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const startTime = Date.now()
      const result = await rulesEngine.executeRuleSet({}, largeRuleSet)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(1000) // Should complete within 1 second
      expect(result.totalRules).toBe(100)
    })

    it('should handle complex messages efficiently', async () => {
      const complexMessage = {
        MSH: { 'MSH.1': '|', 'MSH.9': 'ADT^A01' },
        ...Array.from({ length: 50 }, (_, i) => ({
          [`OBX_${i}`]: {
            'OBX.1': `${i + 1}`,
            'OBX.2': 'TX',
            'OBX.3': `CODE_${i}`,
            'OBX.5': `VALUE_${i}`
          }
        })).reduce((acc, obj) => ({ ...acc, ...obj }), {})
      }

      const simpleRuleSet: RuleSet = {
        _id: 'simple-ruleset',
        name: 'Simple Rule Set',
        description: 'Simple rules',
        rules: [
          {
            name: 'MSH exists',
            targetPath: 'MSH',
            condition: 'exists',
            severity: 'error'
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const startTime = Date.now()
      const result = await rulesEngine.executeRuleSet(complexMessage, simpleRuleSet)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(500) // Should be fast even with complex message
      expect(result.passedRules).toBe(1)
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed rule conditions gracefully', async () => {
      const malformedRuleSet: RuleSet = {
        _id: 'malformed-ruleset',
        name: 'Malformed Rule Set',
        description: 'Rules with errors',
        rules: [
          {
            name: 'Malformed rule',
            targetPath: 'MSH.1',
            condition: 'invalidCondition' as any,
            severity: 'error'
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await rulesEngine.executeRuleSet({}, malformedRuleSet)

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0].message).toContain('Unknown condition')
    })

    it('should continue execution after rule failures', async () => {
      const mixedRuleSet: RuleSet = {
        _id: 'mixed-ruleset',
        name: 'Mixed Rule Set',
        description: 'Mix of valid and invalid rules',
        rules: [
          {
            name: 'Valid rule',
            targetPath: 'MSH.1',
            condition: 'exists',
            severity: 'error'
          },
          {
            name: 'Invalid rule',
            targetPath: 'MSH.1',
            condition: 'invalidCondition' as any,
            severity: 'error'
          },
          {
            name: 'Another valid rule',
            targetPath: 'MSH.2',
            condition: 'exists',
            severity: 'warning'
          }
        ],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const testMessage = {
        MSH: { 'MSH.1': '|', 'MSH.2': '^~\\&' }
      }

      const result = await rulesEngine.executeRuleSet(testMessage, mixedRuleSet)

      expect(result.totalRules).toBe(3)
      expect(result.passedRules).toBe(2) // Two valid rules should pass
      expect(result.failedRules).toBe(1) // One invalid rule should fail
    })
  })
})
