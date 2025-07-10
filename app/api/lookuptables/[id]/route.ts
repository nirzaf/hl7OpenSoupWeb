import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"
import type { LookupTable } from "@/types/hl7"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collection = await getCollection("lookupTables")
    
    const lookupTable = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!lookupTable) {
      return NextResponse.json({ error: "Lookup table not found" }, { status: 404 })
    }

    const formattedTable = {
      ...lookupTable,
      _id: lookupTable._id.toString()
    }

    return NextResponse.json({ data: formattedTable })
  } catch (error) {
    console.error("Failed to fetch lookup table:", error)
    return NextResponse.json({ 
      error: "Failed to fetch lookup table",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tableData = await request.json()
    const collection = await getCollection("lookupTables")
    
    // Check if the lookup table exists
    const existingTable = await collection.findOne({ _id: new ObjectId(params.id) })
    if (!existingTable) {
      return NextResponse.json({ error: "Lookup table not found" }, { status: 404 })
    }
    
    // Validate required fields
    if (!tableData.name || !tableData.description) {
      return NextResponse.json({ 
        error: "Name and description are required" 
      }, { status: 400 })
    }
    
    // Check if lookup table name already exists (excluding current table)
    const existingWithSameName = await collection.findOne({ 
      name: tableData.name,
      _id: { $ne: new ObjectId(params.id) }
    })
    if (existingWithSameName) {
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
    
    const updateData = {
      name: tableData.name,
      description: tableData.description,
      data: tableData.data || existingTable.data,
      updatedAt: new Date()
    }
    
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      { $set: updateData },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: "Lookup table update failed" }, { status: 500 })
    }

    const updatedTable = {
      ...result,
      _id: result._id.toString()
    }

    return NextResponse.json({ data: updatedTable })
  } catch (error) {
    console.error("Failed to update lookup table:", error)
    return NextResponse.json({ 
      error: "Failed to update lookup table",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collection = await getCollection("lookupTables")
    
    const result = await collection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Lookup table not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 204 })
  } catch (error) {
    console.error("Failed to delete lookup table:", error)
    return NextResponse.json({ 
      error: "Failed to delete lookup table",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
