import { type NextRequest, NextResponse } from "next/server"
import type { HL7Message } from "@/types/hl7"
import { getCollection } from "@/lib/mongodb"
import { HL7Service } from "@/lib/hl7Service"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Filter parameters
    const sendingFacility = searchParams.get('filter[sendingFacility]')
    const messageType = searchParams.get('filter[messageType]')
    const tags = searchParams.get('filter[tags]')
    const searchContent = searchParams.get('search[content]')
    const search = searchParams.get('search')

    const collection = await getCollection("messages")

    // Build filter query
    const filter: any = {}

    if (sendingFacility) {
      filter['metadata.sendingFacility'] = sendingFacility
    }

    if (messageType) {
      filter['metadata.messageType'] = messageType
    }

    if (tags) {
      filter['metadata.tags'] = { $in: tags.split(',') }
    }

    if (searchContent) {
      filter.$text = { $search: searchContent }
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'metadata.sendingFacility': { $regex: search, $options: 'i' } },
        { 'metadata.messageType': { $regex: search, $options: 'i' } }
      ]
    }

    // Get total count for pagination
    const total = await collection.countDocuments(filter)

    // Fetch messages with pagination
    const messages = await collection
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray()

    // Convert MongoDB _id to string for frontend compatibility
    const formattedMessages = messages.map(msg => ({
      ...msg,
      _id: msg._id.toString()
    }))

    return NextResponse.json({
      data: formattedMessages,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json()

    // Validate required fields
    if (!messageData.name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      )
    }

    const collection = await getCollection("messages")

    // Parse the HL7 message if rawMessage is provided
    let parsedMessage = messageData.parsedMessage
    let metadata = messageData.metadata

    if (messageData.rawMessage && !parsedMessage) {
      try {
        const hl7Service = new HL7Service()
        const parsed = hl7Service.parseMessage(messageData.rawMessage)
        parsedMessage = parsed.segments
        metadata = parsed.metadata
      } catch (parseError) {
        return NextResponse.json(
          {
            error: "Failed to parse HL7 message",
            details: parseError instanceof Error ? parseError.message : 'Invalid HL7 format'
          },
          { status: 400 }
        )
      }
    }

    const newMessage: Partial<HL7Message> = {
      name: messageData.name || `Message ${Date.now()}`,
      rawMessage: messageData.rawMessage || messageData.content, // Support legacy 'content' field
      parsedMessage: parsedMessage || {},
      metadata: {
        ...metadata,
        tags: messageData.tags || messageData.metadata?.tags || []
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

    return NextResponse.json(createdMessage, { status: 201 })
  } catch (error) {
    console.error("Failed to create message:", error)
    return NextResponse.json({
      error: "Failed to create message",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 })
    }

    const body = await request.json()
    const collection = await getCollection("messages")

    // Update the message
    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...body,
          updatedAt: new Date()
        }
      }
    )

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // Fetch the updated message
    const updatedMessage = await collection.findOne({ _id: new ObjectId(id) })

    if (!updatedMessage) {
      return NextResponse.json({ error: "Failed to fetch updated message" }, { status: 500 })
    }

    return NextResponse.json({
      data: {
        ...updatedMessage,
        _id: updatedMessage._id.toString()
      }
    })
  } catch (error) {
    console.error("Failed to update message:", error)
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
  }
}
