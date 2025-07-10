import { type NextRequest, NextResponse } from "next/server"
import type { HL7Message } from "@/types/hl7"
import { getCollection } from "@/lib/mongodb"
import { ObjectId } from "mongodb"

export async function GET() {
  try {
    const collection = await getCollection("messages")
    const messages = await collection.find({}).sort({ createdAt: -1 }).toArray()
    
    // Convert MongoDB _id to string for frontend compatibility
    const formattedMessages = messages.map(msg => ({
      ...msg,
      _id: msg._id.toString()
    }))
    
    return NextResponse.json(formattedMessages)
  } catch (error) {
    console.error("Failed to fetch messages:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json()
    const collection = await getCollection("messages")
    
    const newMessage = {
      ...messageData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isValid: true,
      tags: messageData.tags || []
    }

    const result = await collection.insertOne(newMessage)
    const createdMessage = {
      ...newMessage,
      _id: result.insertedId.toString()
    }
    
    return NextResponse.json(createdMessage)
  } catch (error) {
    console.error("Failed to create message:", error)
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 })
  }
}
