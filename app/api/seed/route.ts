import { type NextRequest, NextResponse } from "next/server"
import { getCollection } from "@/lib/mongodb"
import { SAMPLE_HL7_MESSAGES } from "@/lib/sample-hl7-messages"
import { HL7Service } from "@/lib/hl7Service"

// Convert sample messages to database format
const seedMessages = SAMPLE_HL7_MESSAGES.map(sample => {
  const hl7Service = new HL7Service()
  const parsed = hl7Service.parseMessage(sample.rawMessage)

  return {
    name: sample.name,
    rawMessage: sample.rawMessage,
    parsedMessage: parsed.segments,
    metadata: {
      ...parsed.metadata,
      messageType: sample.messageType,
      tags: sample.tags,
      category: sample.category,
      description: sample.description
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isValid: true,
    isSample: true // Mark as sample data
  }
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const force = body.force === true

    const collection = await getCollection('messages')

    // Check if collection already has sample data
    const existingSampleCount = await collection.countDocuments({ isSample: true })

    if (existingSampleCount > 0 && !force) {
      return NextResponse.json({
        message: 'Database already contains sample messages, skipping seed. Use force=true to re-seed.',
        count: existingSampleCount
      })
    }

    // Remove existing sample data if force is true
    if (force && existingSampleCount > 0) {
      await collection.deleteMany({ isSample: true })
    }

    // Insert seed data
    const result = await collection.insertMany(seedMessages)

    return NextResponse.json({
      message: `Successfully seeded ${result.insertedCount} sample messages to the database.`,
      count: result.insertedCount,
      samples: seedMessages.map(msg => ({
        name: msg.name,
        messageType: msg.metadata.messageType,
        category: msg.metadata.category
      }))
    })

  } catch (error) {
    console.error('Error seeding database:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}