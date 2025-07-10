import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { HL7Service } from "@/lib/hl7Service"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collection = await getCollection("messages")

    const message = await collection.findOne({ _id: new ObjectId(params.id) })

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    const formattedMessage = {
      ...message,
      _id: message._id.toString()
    }

    return NextResponse.json({ data: formattedMessage })
  } catch (error) {
    console.error("Failed to fetch message:", error)
    return NextResponse.json({ error: "Failed to fetch message" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messageData = await request.json()
    const collection = await getCollection("messages")

    // Check if the message exists
    const existingMessage = await collection.findOne({ _id: new ObjectId(params.id) })
    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // If parsedMessage is updated, regenerate rawMessage
    let updateData: any = { ...messageData }

    if (messageData.parsedMessage && !messageData.rawMessage) {
      try {
        const hl7Service = new HL7Service()
        const rawMessage = hl7Service.generateMessage(messageData.parsedMessage)
        updateData.rawMessage = rawMessage
      } catch (error) {
        console.error("Failed to regenerate raw message:", error)
        return NextResponse.json({
          error: "Failed to update message: Could not regenerate raw message from parsed data",
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 })
      }
    }

    // If rawMessage is updated, regenerate parsedMessage
    if (messageData.rawMessage && !messageData.parsedMessage) {
      try {
        const hl7Service = new HL7Service()
        const parsed = hl7Service.parseMessage(messageData.rawMessage)
        updateData.parsedMessage = parsed.segments
        updateData.metadata = {
          ...existingMessage.metadata,
          ...parsed.metadata
        }
      } catch (error) {
        console.error("Failed to parse raw message:", error)
        return NextResponse.json({
          error: "Failed to update message: Could not parse raw message",
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 400 })
      }
    }

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          ...updateData,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    )

    if (!result) {
      return NextResponse.json({ error: "Message update failed" }, { status: 500 })
    }

    const updatedMessage = {
      ...result,
      _id: result._id.toString()
    }

    return NextResponse.json({ data: updatedMessage })
  } catch (error) {
    console.error("Failed to update message:", error)
    return NextResponse.json({
      error: "Failed to update message",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const collection = await getCollection("messages")

    const result = await collection.deleteOne({ _id: new ObjectId(params.id) })

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true }, { status: 204 })
  } catch (error) {
    console.error("Failed to delete message:", error)
    return NextResponse.json({
      error: "Failed to delete message",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
