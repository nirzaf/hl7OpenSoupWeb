import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { RuleSet } from "@/types/hl7"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collection = await getCollection("ruleSets")
    
    const ruleSet = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!ruleSet) {
      return NextResponse.json({ error: "Rule set not found" }, { status: 404 })
    }

    const formattedRuleSet = {
      ...ruleSet,
      _id: ruleSet._id.toString()
    }

    return NextResponse.json({ data: formattedRuleSet })
  } catch (error) {
    console.error("Failed to fetch rule set:", error)
    return NextResponse.json({ 
      error: "Failed to fetch rule set",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ruleSetData = await request.json()
    const collection = await getCollection("ruleSets")
    
    // Check if the rule set exists
    const existingRuleSet = await collection.findOne({ _id: new ObjectId(params.id) })
    if (!existingRuleSet) {
      return NextResponse.json({ error: "Rule set not found" }, { status: 404 })
    }
    
    // Prevent modification of system-defined rule sets
    if (existingRuleSet.isSystemDefined) {
      return NextResponse.json({ 
        error: "Cannot modify system-defined rule sets" 
      }, { status: 403 })
    }
    
    // Validate required fields
    if (!ruleSetData.name || !ruleSetData.description) {
      return NextResponse.json({ 
        error: "Name and description are required" 
      }, { status: 400 })
    }
    
    // Check if rule set name already exists (excluding current rule set)
    const existingWithSameName = await collection.findOne({ 
      name: ruleSetData.name,
      _id: { $ne: new ObjectId(params.id) }
    })
    if (existingWithSameName) {
      return NextResponse.json({ 
        error: "Rule set with this name already exists" 
      }, { status: 409 })
    }
    
    // Validate rules
    if (ruleSetData.rules) {
      for (const rule of ruleSetData.rules) {
        if (!rule.name || !rule.description || !rule.action || !rule.severity) {
          return NextResponse.json({ 
            error: "Each rule must have name, description, action, and severity" 
          }, { status: 400 })
        }
        
        // Set default values
        rule.isActive = rule.isActive !== false
        rule.ruleType = rule.ruleType || 'custom'
        rule.hl7Version = rule.hl7Version || '2.5'
      }
    }
    
    const updateData = {
      name: ruleSetData.name,
      description: ruleSetData.description,
      rules: ruleSetData.rules || existingRuleSet.rules,
      updatedAt: new Date()
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: "Rule set update failed" }, { status: 500 })
    }

    const updatedRuleSet = {
      ...result,
      _id: result._id.toString()
    }

    return NextResponse.json({ data: updatedRuleSet })
  } catch (error) {
    console.error("Failed to update rule set:", error)
    return NextResponse.json({ 
      error: "Failed to update rule set",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collection = await getCollection("ruleSets")
    
    // Check if the rule set exists and is not system-defined
    const existingRuleSet = await collection.findOne({ _id: new ObjectId(params.id) })
    if (!existingRuleSet) {
      return NextResponse.json({ error: "Rule set not found" }, { status: 404 })
    }
    
    if (existingRuleSet.isSystemDefined) {
      return NextResponse.json({ 
        error: "Cannot delete system-defined rule sets" 
      }, { status: 403 })
    }
    
    const result = await collection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Rule set deletion failed" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 204 })
  } catch (error) {
    console.error("Failed to delete rule set:", error)
    return NextResponse.json({ 
      error: "Failed to delete rule set",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
