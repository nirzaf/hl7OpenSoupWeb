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
    const tags = searchParams.get('filter[tags]')
    const searchContent = searchParams.get('search[content]')

    const collection = await getCollection("messages")

    // Build filter query
    const filter: any = {}

    if (sendingFacility) {
      filter['metadata.sendingFacility'] = sendingFacility
    }

    if (tags) {
      filter['metadata.tags'] = { $in: tags.split(',') }
    }

    if (searchContent) {
      filter.$text = { $search: searchContent }
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
    const collection = await getCollection("messages")

    // Parse the HL7 message if rawMessage is provided
    let parsedMessage = messageData.parsedMessage
    let metadata = messageData.metadata

    if (messageData.rawMessage && !parsedMessage) {
      const hl7Service = new HL7Service()
      const parsed = hl7Service.parseMessage(messageData.rawMessage)
      parsedMessage = parsed.segments
      metadata = parsed.metadata
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
