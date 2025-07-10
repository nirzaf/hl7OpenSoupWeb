import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { HL7Service } from "@/lib/hl7Service"
import { TransformationService } from "@/lib/transformation-services"
import { ObjectId } from "mongodb"
import type { Workflow, WorkflowStep, HL7Message } from "@/types/hl7"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { messageId } = await request.json()
    
    if (!messageId) {
      return NextResponse.json({ 
        error: "messageId is required" 
      }, { status: 400 })
    }
    
    // Get the workflow
    const workflowsCollection = await getCollection("workflows")
    const workflow = await workflowsCollection.findOne({ _id: new ObjectId(params.id) })
    
    if (!workflow) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 })
    }
    
    // Get the message
    const messagesCollection = await getCollection("messages")
    const message = await messagesCollection.findOne({ _id: new ObjectId(messageId) })
    
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }
    
    // Execute workflow steps
    const executionResults = []
    let currentMessage = { ...message }
    
    // Sort steps by order
    const sortedSteps = workflow.steps.sort((a, b) => a.order - b.order)
    
    for (const step of sortedSteps) {
      try {
        const stepResult = await executeWorkflowStep(step, currentMessage)
        executionResults.push({
          stepType: step.type,
          stepOrder: step.order,
          success: stepResult.success,
          result: stepResult.result,
          error: stepResult.error
        })
        
        // If step failed and it's critical, stop execution
        if (!stepResult.success && step.parameters.critical !== false) {
          break
        }
        
        // Update current message if step modified it
        if (stepResult.modifiedMessage) {
          currentMessage = stepResult.modifiedMessage
        }
        
      } catch (error) {
        executionResults.push({
          stepType: step.type,
          stepOrder: step.order,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        // Stop execution on error
        break
      }
    }
    
    // Save the modified message if any steps changed it
    const hasModifications = executionResults.some(result => result.success && 
      ['editField', 'lookupAndReplace'].includes(result.stepType))
    
    if (hasModifications) {
      await messagesCollection.findOneAndUpdate(
        { _id: new ObjectId(messageId) },
        { 
          $set: {
            ...currentMessage,
            updatedAt: new Date()
          }
        }
      )
    }
    
    const overallSuccess = executionResults.every(result => result.success)
    
    return NextResponse.json({
      success: overallSuccess,
      workflowName: workflow.name,
      executionResults,
      message: overallSuccess ? 
        "Workflow executed successfully" : 
        "Workflow execution completed with errors"
    })
    
  } catch (error) {
    console.error("Workflow execution failed:", error)
    return NextResponse.json({ 
      error: "Workflow execution failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function executeWorkflowStep(step: WorkflowStep, message: HL7Message): Promise<{
  success: boolean
  result?: any
  error?: string
  modifiedMessage?: HL7Message
}> {
  const hl7Service = new HL7Service()
  
  switch (step.type) {
    case 'validate':
      try {
        const ruleSetsCollection = await getCollection("ruleSets")
        const ruleSet = await ruleSetsCollection.findOne({ _id: new ObjectId(step.parameters.ruleSetId) })
        
        if (!ruleSet) {
          return { success: false, error: "Rule set not found" }
        }
        
        const validation = hl7Service.validateMessage(message.parsedMessage)
        
        return {
          success: validation.isValid,
          result: {
            isValid: validation.isValid,
            errors: validation.errors,
            warnings: validation.warnings,
            ruleSetUsed: ruleSet.name
          }
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }
    
    case 'transform':
      try {
        const transformResult = TransformationService.export(message, step.parameters.format, step.parameters.options)
        
        return {
          success: transformResult.success,
          result: transformResult.success ? {
            format: step.parameters.format,
            data: transformResult.data
          } : undefined,
          error: transformResult.error
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Transformation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }
    
    case 'editField':
      try {
        const modifiedParsedMessage = hl7Service.editField(
          message.parsedMessage, 
          step.parameters.path, 
          step.parameters.value
        )
        
        // Regenerate raw message
        const rawMessage = hl7Service.generateMessage(modifiedParsedMessage)
        
        const modifiedMessage: HL7Message = {
          ...message,
          rawMessage,
          parsedMessage: modifiedParsedMessage
        }
        
        return {
          success: true,
          result: {
            path: step.parameters.path,
            oldValue: getValueAtPath(message.parsedMessage, step.parameters.path),
            newValue: step.parameters.value
          },
          modifiedMessage
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Field edit failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }
    
    case 'lookupAndReplace':
      try {
        const lookupTablesCollection = await getCollection("lookupTables")
        const lookupTable = await lookupTablesCollection.findOne({ _id: new ObjectId(step.parameters.tableId) })
        
        if (!lookupTable) {
          return { success: false, error: "Lookup table not found" }
        }
        
        const currentValue = getValueAtPath(message.parsedMessage, step.parameters.path)
        const lookupEntry = lookupTable.data.find(entry => entry.key === currentValue)
        
        if (!lookupEntry) {
          return { 
            success: false, 
            error: `No lookup entry found for value: ${currentValue}` 
          }
        }
        
        const modifiedParsedMessage = hl7Service.editField(
          message.parsedMessage, 
          step.parameters.path, 
          lookupEntry.value
        )
        
        // Regenerate raw message
        const rawMessage = hl7Service.generateMessage(modifiedParsedMessage)
        
        const modifiedMessage: HL7Message = {
          ...message,
          rawMessage,
          parsedMessage: modifiedParsedMessage
        }
        
        return {
          success: true,
          result: {
            path: step.parameters.path,
            lookupKey: currentValue,
            lookupValue: lookupEntry.value,
            tableName: lookupTable.name
          },
          modifiedMessage
        }
      } catch (error) {
        return { 
          success: false, 
          error: `Lookup and replace failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }
      }
    
    default:
      return { 
        success: false, 
        error: `Unknown step type: ${step.type}` 
      }
  }
}

function getValueAtPath(obj: any, path: string): any {
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
