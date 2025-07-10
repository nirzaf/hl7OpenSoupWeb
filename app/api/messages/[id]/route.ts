import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { HL7Service } from "@/lib/hl7Service"
import { ObjectId } from "mongodb"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const collection = await getCollection("messages")

    const message = await collection.findOne({ _id: new ObjectId(id) })

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const messageData = await request.json()

    const collection = await getCollection("messages")

    // Check if the message exists
    const existingMessage = await collection.findOne({ _id: new ObjectId(id) })
    if (!existingMessage) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    // Prepare update data
    let updateData: any = { ...messageData }

    // If rawMessage is updated and different from existing, regenerate parsedMessage
    if (messageData.rawMessage && messageData.rawMessage !== existingMessage.rawMessage) {
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
        // Don't fail the update if parsing fails, just log the error
      }
    }

    // If parsedMessage is updated but rawMessage is not, regenerate rawMessage
    if (messageData.parsedMessage && !messageData.rawMessage && messageData.parsedMessage !== existingMessage.parsedMessage) {
      try {
        const hl7Service = new HL7Service()
        const rawMessage = hl7Service.generateMessage(messageData.parsedMessage)
        updateData.rawMessage = rawMessage
      } catch (error) {
        console.error("Failed to regenerate raw message:", error)
        // Don't fail the update if generation fails, just log the error
      }
    }

    // Remove _id from updateData to avoid MongoDB immutable field error
    const { _id, ...updateDataWithoutId } = updateData

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updateDataWithoutId,
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

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const collection = await getCollection("messages")

    const result = await collection.deleteOne({ _id: new ObjectId(id) })

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
