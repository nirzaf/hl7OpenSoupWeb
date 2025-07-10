import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { data, format } = await request.json()

    let messages: any[] = []

    switch (format) {
      case "json":
        messages = JSON.parse(data)
        break
      case "xml":
        messages = parseXML(data)
        break
      case "csv":
        messages = parseCSV(data)
        break
      case "hl7":
        messages = parseHL7(data)
        break
      default:
        throw new Error("Unsupported format")
    }

    // Here you would typically save to database
    // For now, just return success with count

    return NextResponse.json({
      success: true,
      messageCount: messages.length,
      messages: messages.slice(0, 5), // Return first 5 for preview
    })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Import failed",
      },
      { status: 500 },
    )
  }
}

function parseXML(xmlData: string): any[] {
  // Simple XML parsing - in production, use a proper XML parser
  const messages: any[] = []
  const messageMatches = xmlData.match(/<message[^>]*>[\s\S]*?<\/message>/g)

  if (messageMatches) {
    messageMatches.forEach((match, index) => {
      const nameMatch = match.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>/)
      const typeMatch = match.match(/<type>(.*?)<\/type>/)
      const contentMatch = match.match(/<content><!\[CDATA\[(.*?)\]\]><\/content>/)

      messages.push({
        id: `imported_${Date.now()}_${index}`,
        name: nameMatch ? nameMatch[1] : `Imported Message ${index + 1}`,
        messageType: typeMatch ? typeMatch[1] : "Unknown",
        content: contentMatch ? contentMatch[1] : "",
      })
    })
  }

  return messages
}

function parseCSV(csvData: string): any[] {
  const lines = csvData.split("\n")
  const headers = lines[0].split(",")
  const messages: any[] = []

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim()) {
      const values = parseCSVLine(lines[i])
      messages.push({
        id: `imported_${Date.now()}_${i}`,
        name: values[1] || `Imported Message ${i}`,
        messageType: values[2] || "Unknown",
        content: values[3] || "",
      })
    }
  }

  return messages
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += char
    }
  }
  result.push(current.trim())

  return result.map((val) => val.replace(/^"|"$/g, "").replace(/""/g, '"'))
}

function parseHL7(hl7Data: string): any[] {
  const messages: any[] = []
  const messageBlocks = hl7Data.split(/\n\s*\n/).filter((block) => block.trim())

  messageBlocks.forEach((block, index) => {
    const lines = block.split("\n").filter((line) => line.trim())
    if (lines.length > 0) {
      const mshLine = lines.find((line) => line.startsWith("MSH"))
      let messageType = "Unknown"

      if (mshLine) {
        const fields = mshLine.split("|")
        if (fields[8]) {
          messageType = fields[8]
        }
      }

      messages.push({
        id: `imported_${Date.now()}_${index}`,
        name: `Imported HL7 Message ${index + 1}`,
        messageType,
        content: block,
      })
    }
  })

  return messages
}
