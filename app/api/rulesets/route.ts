import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import type { RuleSet } from "@/types/hl7"

export async function GET() {
  try {
    const collection = await getCollection("ruleSets")
    const ruleSets = await collection.find({}).sort({ name: 1 }).toArray()
    
    // Convert MongoDB _id to string for frontend compatibility
    const formattedRuleSets = ruleSets.map(ruleSet => ({
      ...ruleSet,
      _id: ruleSet._id.toString()
    }))
    
    return NextResponse.json({ data: formattedRuleSets })
  } catch (error) {
    console.error("Failed to fetch rule sets:", error)
    return NextResponse.json({ 
      error: "Failed to fetch rule sets",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const ruleSetData = await request.json()
    const collection = await getCollection("ruleSets")
    
    // Validate required fields
    if (!ruleSetData.name || !ruleSetData.description) {
      return NextResponse.json({ 
        error: "Name and description are required" 
      }, { status: 400 })
    }
    
    // Check if rule set name already exists
    const existingRuleSet = await collection.findOne({ name: ruleSetData.name })
    if (existingRuleSet) {
      return NextResponse.json({ 
        error: "Rule set with this name already exists" 
      }, { status: 409 })
    }
    
    const newRuleSet: Partial<RuleSet> = {
      name: ruleSetData.name,
      description: ruleSetData.description,
      isSystemDefined: false, // User-created rule sets are not system-defined
      rules: ruleSetData.rules || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Validate rules
    for (const rule of newRuleSet.rules!) {
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

    const result = await collection.insertOne(newRuleSet)
    const createdRuleSet = {
      ...newRuleSet,
      _id: result.insertedId.toString()
    }
    
    return NextResponse.json({ data: createdRuleSet }, { status: 201 })
  } catch (error) {
    console.error("Failed to create rule set:", error)
    return NextResponse.json({ 
      error: "Failed to create rule set",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
