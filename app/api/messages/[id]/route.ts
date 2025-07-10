import { type NextRequest, NextResponse } from "next/server"

// Mock data - replace with MongoDB integration
const mockMessages = [
  // ... same mock data as in route.ts
]

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messageData = await request.json()
    const messageIndex = mockMessages.findIndex((m) => m._id === params.id)

    if (messageIndex === -1) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    mockMessages[messageIndex] = {
      ...mockMessages[messageIndex],
      ...messageData,
      updatedAt: new Date(),
    }

    return NextResponse.json(mockMessages[messageIndex])
  } catch (error) {
    return NextResponse.json({ error: "Failed to update message" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messageIndex = mockMessages.findIndex((m) => m._id === params.id)

    if (messageIndex === -1) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    mockMessages.splice(messageIndex, 1)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 })
  }
}
