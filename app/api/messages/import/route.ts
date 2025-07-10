import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { TransformationService } from "@/lib/transformation-services"
import { HL7Service } from "@/lib/hl7Service"
import type { HL7Message } from "@/types/hl7"

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let format: 'json' | 'xml' | 'csv'
    let data: string
    
    // Determine format from content type or form data
    if (contentType.includes('application/json')) {
      format = 'json'
      data = await request.text()
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      format = 'xml'
      data = await request.text()
    } else if (contentType.includes('text/csv')) {
      format = 'csv'
      data = await request.text()
    } else if (contentType.includes('multipart/form-data')) {
      // Handle file upload
      const formData = await request.formData()
      const file = formData.get('file') as File
      const formatParam = formData.get('format') as string
      
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }
      
      data = await file.text()
      
      // Determine format from parameter or file extension
      if (formatParam && ['json', 'xml', 'csv'].includes(formatParam)) {
        format = formatParam as 'json' | 'xml' | 'csv'
      } else {
        const extension = file.name.split('.').pop()?.toLowerCase()
        switch (extension) {
          case 'json':
            format = 'json'
            break
          case 'xml':
            format = 'xml'
            break
          case 'csv':
            format = 'csv'
            break
          default:
            return NextResponse.json({ 
              error: "Unable to determine file format. Please specify format parameter or use a file with .json, .xml, or .csv extension" 
            }, { status: 400 })
        }
      }
    } else {
      return NextResponse.json({ 
        error: "Unsupported content type. Use application/json, application/xml, text/csv, or multipart/form-data" 
      }, { status: 400 })
    }
    
    // Transform the imported data to HL7 JSON format
    const transformResult = TransformationService.import(data, format)
    
    if (!transformResult.success) {
      return NextResponse.json({ 
        error: "Import transformation failed",
        details: transformResult.error
      }, { status: 400 })
    }
    
    // Parse the transformed JSON to create HL7 message
    let parsedData: any
    try {
      parsedData = JSON.parse(transformResult.data!)
    } catch (error) {
      return NextResponse.json({ 
        error: "Invalid JSON data after transformation",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }
    
    // Use HL7Service to validate and generate raw message
    const hl7Service = new HL7Service()
    let rawMessage: string
    let metadata: any
    
    try {
      // If the data has segments, use it directly; otherwise assume it's the parsed message
      const messageData = parsedData.segments || parsedData
      
      // Generate raw HL7 message
      rawMessage = hl7Service.generateMessage(messageData)
      
      // Parse it back to get proper metadata
      const parsed = hl7Service.parseMessage(rawMessage)
      metadata = parsed.metadata
    } catch (error) {
      return NextResponse.json({ 
        error: "Failed to generate valid HL7 message from imported data",
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 400 })
    }
    
    // Create the message document
    const collection = await getCollection("messages")
    
    const newMessage: Partial<HL7Message> = {
      name: `Imported Message ${Date.now()}`,
      rawMessage,
      parsedMessage: parsedData.segments || parsedData,
      metadata: {
        ...metadata,
        tags: ['imported']
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isValid: true
    }
    
    const result = await collection.insertOne(newMessage)
    const createdMessage = {
      ...newMessage,
      _id: result.insertedId.toString()
    }
    
    return NextResponse.json({ 
      data: createdMessage,
      message: `Successfully imported ${format.toUpperCase()} data as HL7 message`
    }, { status: 201 })
    
  } catch (error) {
    console.error("Import failed:", error)
    return NextResponse.json({ 
      error: "Import failed",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
