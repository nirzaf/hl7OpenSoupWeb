import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { HL7Service } from "@/lib/hl7Service"
import { ObjectId } from "mongodb"
import type { ValidationRule, RuleSet } from "@/types/hl7"

export async function POST(request: NextRequest) {
  try {
    const { messageId, ruleSetId, rawMessage, parsedMessage } = await request.json()
    
    let messageToValidate: any
    let hl7Service: HL7Service
    
    // Get the message to validate
    if (messageId) {
      const messagesCollection = await getCollection("messages")
      const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) })
      
      if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }
      
      messageToValidate = message.parsedMessage
    } else if (parsedMessage) {
      messageToValidate = parsedMessage
    } else if (rawMessage) {
      // Parse the raw message first
      hl7Service = new HL7Service()
      const parsed = hl7Service.parseMessage(rawMessage)
      messageToValidate = parsed.segments
    } else {
      return NextResponse.json({ 
        error: "No message provided for validation. Provide messageId, parsedMessage, or rawMessage" 
      }, { status: 400 })
    }
    
    // Get the rule set for validation
    let ruleSet: RuleSet | null = null
    if (ruleSetId) {
      const ruleSetsCollection = await getCollection("ruleSets")
      ruleSet = await ruleSetsCollection.findOne({ _id: new ObjectId(ruleSetId) })
      
      if (!ruleSet) {
        return NextResponse.json({ error: "Rule set not found" }, { status: 404 })
      }
    }
    
    // Initialize HL7 service with custom schema if available
    if (!hl7Service) {
      hl7Service = new HL7Service()
    }
    
    // Perform basic HL7 validation
    const basicValidation = hl7Service.validateMessage(messageToValidate)
    
    // Perform custom rules validation if rule set is provided
    const customValidation = ruleSet ? await validateWithCustomRules(messageToValidate, ruleSet) : {
      isValid: true,
      errors: [],
      warnings: []
    }
    
    // Combine validation results
    const combinedErrors = [...basicValidation.errors, ...customValidation.errors]
    const combinedWarnings = [...basicValidation.warnings, ...customValidation.warnings]
    
    const validationResult = {
      isValid: combinedErrors.length === 0,
      results: [
        ...combinedErrors.map(error => ({
          type: 'error',
          segment: error.segment,
          field: error.field,
          message: error.message,
          severity: error.severity,
          ruleType: 'basic'
        })),
        ...combinedWarnings.map(warning => ({
          type: 'warning',
          segment: warning.segment,
          field: warning.field,
          message: warning.message,
          severity: warning.severity,
          ruleType: 'basic'
        }))
      ],
      summary: {
        totalErrors: combinedErrors.length,
        totalWarnings: combinedWarnings.length,
        ruleSetUsed: ruleSet?.name || 'Basic HL7 Validation'
      }
    }
    
    return NextResponse.json({ data: validationResult })
  } catch (error) {
    console.error("Validation failed:", error)
    return NextResponse.json({ 
      error: "Validation failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function validateWithCustomRules(messageData: any, ruleSet: RuleSet) {
  const errors: any[] = []
  const warnings: any[] = []
  
  for (const rule of ruleSet.rules) {
    if (!rule.isActive) continue
    
    try {
      const result = evaluateRule(messageData, rule)
      
      if (result.violated) {
        const validationError = {
          segment: rule.targetPath?.split('.')[0] || 'Unknown',
          field: 0,
          message: rule.actionDetail || `Rule violation: ${rule.name}`,
          severity: rule.severity,
          ruleName: rule.name,
          ruleType: 'custom'
        }
        
        if (rule.severity === 'error') {
          errors.push(validationError)
        } else {
          warnings.push(validationError)
        }
      }
    } catch (error) {
      console.error(`Error evaluating rule ${rule.name}:`, error)
      warnings.push({
        segment: 'Unknown',
        field: 0,
        message: `Failed to evaluate rule: ${rule.name}`,
        severity: 'warning',
        ruleName: rule.name,
        ruleType: 'custom'
      })
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

function evaluateRule(messageData: any, rule: ValidationRule): { violated: boolean, value?: any } {
  if (!rule.targetPath || !rule.condition) {
    return { violated: false }
  }
  
  // Navigate to the target field
  const pathParts = rule.targetPath.split('.')
  let current = messageData
  
  for (const part of pathParts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part]
    } else {
      current = undefined
      break
    }
  }
  
  // Evaluate the condition
  switch (rule.condition) {
    case 'exists':
      return { violated: current === undefined || current === null || current === '', value: current }
    
    case 'not_exists':
      return { violated: current !== undefined && current !== null && current !== '', value: current }
    
    case 'equals':
      return { violated: current !== rule.value, value: current }
    
    case 'not_equals':
      return { violated: current === rule.value, value: current }
    
    case 'startsWith':
      return { 
        violated: typeof current !== 'string' || !current.startsWith(rule.value || ''), 
        value: current 
      }
    
    case 'endsWith':
      return { 
        violated: typeof current !== 'string' || !current.endsWith(rule.value || ''), 
        value: current 
      }
    
    case 'contains':
      return { 
        violated: typeof current !== 'string' || !current.includes(rule.value || ''), 
        value: current 
      }
    
    case 'matchesRegex':
      try {
        const regex = new RegExp(rule.value || '')
        return { 
          violated: typeof current !== 'string' || !regex.test(current), 
          value: current 
        }
      } catch (error) {
        console.error('Invalid regex pattern:', rule.value)
        return { violated: false, value: current }
      }
    
    default:
      return { violated: false, value: current }
  }
}
