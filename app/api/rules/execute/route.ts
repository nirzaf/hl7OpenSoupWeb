import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { RulesEngine } from "@/lib/rules-engine"
import { HL7Service } from "@/lib/hl7Service"
import { ObjectId } from "mongodb"
import type { RuleSet } from "@/types/hl7"

export async function POST(request: NextRequest) {
  try {
    const { messageId, ruleSetId, rawMessage, parsedMessage } = await request.json()
    
    let messageToValidate: any
    
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
      const hl7Service = new HL7Service()
      const parsed = hl7Service.parseMessage(rawMessage)
      messageToValidate = parsed.segments
    } else {
      return NextResponse.json({ 
        error: "No message provided. Provide messageId, parsedMessage, or rawMessage" 
      }, { status: 400 })
    }
    
    // Get the rule set
    if (!ruleSetId) {
      return NextResponse.json({ 
        error: "ruleSetId is required" 
      }, { status: 400 })
    }
    
    const ruleSetsCollection = await getCollection("ruleSets")
    const ruleSet = await ruleSetsCollection.findOne({ _id: new ObjectId(ruleSetId) })
    
    if (!ruleSet) {
      return NextResponse.json({ error: "Rule set not found" }, { status: 404 })
    }
    
    // Execute rules
    const rulesEngine = new RulesEngine()
    const executionResult = await rulesEngine.executeRuleSet(messageToValidate, ruleSet)
    
    // Generate highlighting rules
    const highlightingRules = rulesEngine.generateHighlightingRules(executionResult.results)
    
    // Format response
    const response = {
      ruleSetName: ruleSet.name,
      execution: {
        summary: executionResult.summary,
        results: executionResult.results.map(result => ({
          ruleId: result.ruleId,
          ruleName: result.ruleName,
          success: result.success,
          violated: result.violated,
          value: result.value,
          action: result.action,
          actionDetail: result.actionDetail,
          severity: result.severity,
          executionTime: result.executionTime,
          error: result.error
        }))
      },
      highlighting: highlightingRules,
      validationErrors: executionResult.results
        .filter(result => result.violated)
        .map(result => ({
          segment: result.ruleName.includes('.') ? result.ruleName.split('.')[0] : 'Unknown',
          field: 0,
          message: result.actionDetail || `Rule violation: ${result.ruleName}`,
          severity: result.severity,
          ruleName: result.ruleName
        }))
    }
    
    return NextResponse.json({ data: response })
  } catch (error) {
    console.error("Rules execution failed:", error)
    return NextResponse.json({ 
      error: "Rules execution failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
