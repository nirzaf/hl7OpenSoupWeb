import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import type { LookupTable } from "@/types/hl7"

export async function GET() {
  try {
    const collection = await getCollection("lookupTables")
    const lookupTables = await collection.find({}).sort({ name: 1 }).toArray()
    
    // Convert MongoDB _id to string for frontend compatibility
    const formattedLookupTables = lookupTables.map(table => ({
      ...table,
      _id: table._id.toString()
    }))
    
    return NextResponse.json({ data: formattedLookupTables })
  } catch (error) {
    console.error("Failed to fetch lookup tables:", error)
    return NextResponse.json({ 
      error: "Failed to fetch lookup tables",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tableData = await request.json()
    const collection = await getCollection("lookupTables")
    
    // Validate required fields
    if (!tableData.name || !tableData.description) {
      return NextResponse.json({ 
        error: "Name and description are required" 
      }, { status: 400 })
    }
    
    // Check if lookup table name already exists
    const existingTable = await collection.findOne({ name: tableData.name })
    if (existingTable) {
      return NextResponse.json({ 
        error: "Lookup table with this name already exists" 
      }, { status: 409 })
    }
    
    // Validate data format
    if (tableData.data && !Array.isArray(tableData.data)) {
      return NextResponse.json({ 
        error: "Data must be an array of key-value pairs" 
      }, { status: 400 })
    }
    
    // Validate each data entry
    if (tableData.data) {
      for (const entry of tableData.data) {
        if (!entry.key || !entry.value) {
          return NextResponse.json({ 
            error: "Each data entry must have both key and value" 
          }, { status: 400 })
        }
      }
    }
    
    const newLookupTable: Partial<LookupTable> = {
      name: tableData.name,
      description: tableData.description,
      data: tableData.data || [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = await collection.insertOne(newLookupTable)
    const createdTable = {
      ...newLookupTable,
      _id: result.insertedId.toString()
    }
    
    return NextResponse.json({ data: createdTable }, { status: 201 })
  } catch (error) {
    console.error("Failed to create lookup table:", error)
    return NextResponse.json({ 
      error: "Failed to create lookup table",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
