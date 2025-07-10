import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { TransformationService } from "@/lib/transformation-services"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') as 'json' | 'xml' | 'csv'
    const includeMetadata = searchParams.get('includeMetadata') === 'true'
    const flattenStructure = searchParams.get('flattenStructure') !== 'false'
    
    if (!format || !['json', 'xml', 'csv'].includes(format)) {
      return NextResponse.json({ 
        error: "Invalid format. Supported formats: json, xml, csv" 
      }, { status: 400 })
    }
    
    // Get the message
    const collection = await getCollection("messages")
    const message = await collection.findOne({ _id: new ObjectId(params.id) })
    
    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }
    
    // Transform the message
    const transformationOptions = {
      includeMetadata,
      flattenStructure,
      customMapping: false,
      dateFormat: 'ISO',
      encoding: 'UTF-8'
    }
    
    const result = TransformationService.export(message, format, transformationOptions)
    
    if (!result.success) {
      return NextResponse.json({ 
        error: "Export failed",
        details: result.error
      }, { status: 500 })
    }
    
    // Set appropriate content type and filename
    const contentTypes = {
      json: 'application/json',
      xml: 'application/xml',
      csv: 'text/csv'
    }
    
    const fileExtensions = {
      json: 'json',
      xml: 'xml',
      csv: 'csv'
    }
    
    const filename = `${message.name || 'hl7-message'}.${fileExtensions[format]}`
    
    return new NextResponse(result.data, {
      status: 200,
      headers: {
        'Content-Type': contentTypes[format],
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error("Export failed:", error)
    return NextResponse.json({ 
      error: "Export failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
