import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import type { Workflow } from "@/types/hl7"

export async function GET() {
  try {
    const collection = await getCollection("workflows")
    const workflows = await collection.find({}).sort({ name: 1 }).toArray()
    
    // Convert MongoDB _id to string for frontend compatibility
    const formattedWorkflows = workflows.map(workflow => ({
      ...workflow,
      _id: workflow._id.toString()
    }))
    
    return NextResponse.json({ data: formattedWorkflows })
  } catch (error) {
    console.error("Failed to fetch workflows:", error)
    return NextResponse.json({ 
      error: "Failed to fetch workflows",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const workflowData = await request.json()
    const collection = await getCollection("workflows")
    
    // Validate required fields
    if (!workflowData.name || !workflowData.description) {
      return NextResponse.json({ 
        error: "Name and description are required" 
      }, { status: 400 })
    }
    
    // Check if workflow name already exists
    const existingWorkflow = await collection.findOne({ name: workflowData.name })
    if (existingWorkflow) {
      return NextResponse.json({ 
        error: "Workflow with this name already exists" 
      }, { status: 409 })
    }
    
    // Validate steps
    if (!workflowData.steps || !Array.isArray(workflowData.steps) || workflowData.steps.length === 0) {
      return NextResponse.json({ 
        error: "Workflow must contain at least one step" 
      }, { status: 400 })
    }
    
    // Validate each step
    for (const step of workflowData.steps) {
      if (!step.type || !step.parameters) {
        return NextResponse.json({ 
          error: "Each step must have a type and parameters" 
        }, { status: 400 })
      }
      
      // Validate step type
      if (!['validate', 'transform', 'editField', 'lookupAndReplace'].includes(step.type)) {
        return NextResponse.json({ 
          error: `Invalid step type: ${step.type}. Allowed types: validate, transform, editField, lookupAndReplace` 
        }, { status: 400 })
      }
      
      // Validate parameters based on step type
      switch (step.type) {
        case 'validate':
          if (!step.parameters.ruleSetId) {
            return NextResponse.json({ 
              error: "Validate step requires ruleSetId parameter" 
            }, { status: 400 })
          }
          break;
        case 'transform':
          if (!step.parameters.format || !['json', 'xml', 'csv'].includes(step.parameters.format)) {
            return NextResponse.json({ 
              error: "Transform step requires valid format parameter (json, xml, csv)" 
            }, { status: 400 })
          }
          break;
        case 'editField':
          if (!step.parameters.path || step.parameters.value === undefined) {
            return NextResponse.json({ 
              error: "EditField step requires path and value parameters" 
            }, { status: 400 })
          }
          break;
        case 'lookupAndReplace':
          if (!step.parameters.path || !step.parameters.tableId) {
            return NextResponse.json({ 
              error: "LookupAndReplace step requires path and tableId parameters" 
            }, { status: 400 })
          }
          break;
      }
    }
    
    // Add order to steps if not provided
    const stepsWithOrder = workflowData.steps.map((step, index) => ({
      ...step,
      order: step.order || index + 1
    }))
    
    const newWorkflow: Partial<Workflow> = {
      name: workflowData.name,
      description: workflowData.description,
      steps: stepsWithOrder,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.insertOne(newWorkflow)
    const createdWorkflow = {
      ...newWorkflow,
      _id: result.insertedId.toString()
    }
    
    return NextResponse.json({ data: createdWorkflow }, { status: 201 })
  } catch (error) {
    console.error("Failed to create workflow:", error)
    return NextResponse.json({ 
      error: "Failed to create workflow",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
