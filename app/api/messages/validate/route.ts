import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { HL7Service } from "@/lib/hl7Service"
import { ValidationEngine } from "@/lib/validation-engine"
import { ObjectId } from "mongodb"
import type { ValidationRule, RuleSet } from "@/types/hl7"

export async function POST(request: NextRequest) {
  try {
    const { messageId, ruleSetId, rawMessage, parsedMessage, useUKITK } = await request.json()

    let messageToValidate: any
    let rawMessageText: string | undefined

    // Get the message to validate
    if (messageId) {
      const messagesCollection = await getCollection("messages")
      const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) })

      if (!message) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }

      messageToValidate = message.parsedMessage
      rawMessageText = message.rawMessage
    } else if (parsedMessage) {
      messageToValidate = parsedMessage
    } else if (rawMessage) {
      // Parse the raw message first
      const hl7Service = new HL7Service()
      const parsed = hl7Service.parseMessage(rawMessage)
      messageToValidate = parsed.segments
      rawMessageText = rawMessage
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

    // Load UK ITK schema if requested
    let customSchema: any = undefined
    if (useUKITK) {
      customSchema = await ValidationEngine.loadUKITKSchema()
    }

    // Initialize validation engine
    const validationEngine = new ValidationEngine(customSchema)

    // Perform comprehensive validation
    const validationResult = await validationEngine.validateMessage({
      messageData: messageToValidate,
      rawMessage: rawMessageText,
      ruleSet: ruleSet || undefined,
      customSchema
    })

    // Format results for API response
    const formattedResult = {
      isValid: validationResult.isValid,
      results: [
        ...validationResult.errors.map(error => ({
          type: 'error',
          segment: error.segment,
          field: error.field,
          message: error.message,
          severity: error.severity
        })),
        ...validationResult.warnings.map(warning => ({
          type: 'warning',
          segment: warning.segment,
          field: warning.field,
          message: warning.message,
          severity: warning.severity
        })),
        ...validationResult.info.map(info => ({
          type: 'info',
          segment: info.segment,
          field: info.field,
          message: info.message,
          severity: info.severity
        }))
      ],
      summary: validationResult.summary
    }

    return NextResponse.json({ data: formattedResult })
  } catch (error) {
    console.error("Validation failed:", error)
    return NextResponse.json({
      error: "Validation failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


