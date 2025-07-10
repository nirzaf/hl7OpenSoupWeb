import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { messageIds, format, options } = await request.json()

    // Mock HL7 messages for export
    const mockMessages = [
      {
        id: "1",
        content: `MSH|^~\\&|EPIC|UCSF|CERNER|CPMC|20231201120000||ADT^A01|MSG001|P|2.5
PID|1||MRN123456^5^M11^UCSF^MR^UCSF||DOE^JOHN^MIDDLE|19850615|M||W|123 MAIN ST^^SAN FRANCISCO^CA^94102`,
        name: "Patient Admission - John Doe",
        messageType: "ADT^A01",
      },
    ]

    let exportData: string
    let contentType: string
    let fileExtension: string

    switch (format) {
      case "json":
        exportData = JSON.stringify(mockMessages, null, 2)
        contentType = "application/json"
        fileExtension = "json"
        break
      case "xml":
        exportData = convertToXML(mockMessages)
        contentType = "application/xml"
        fileExtension = "xml"
        break
      case "csv":
        exportData = convertToCSV(mockMessages)
        contentType = "text/csv"
        fileExtension = "csv"
        break
      default:
        throw new Error("Unsupported format")
    }

    return new NextResponse(exportData, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="hl7_export.${fileExtension}"`,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}

function convertToXML(messages: any[]): string {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<hl7Messages>\n'
  messages.forEach((message) => {
    xml += `  <message id="${message.id}">\n`
    xml += `    <name><![CDATA[${message.name}]]></name>\n`
    xml += `    <type>${message.messageType}</type>\n`
    xml += `    <content><![CDATA[${message.content}]]></content>\n`
    xml += `  </message>\n`
  })
  xml += "</hl7Messages>"
  return xml
}

function convertToCSV(messages: any[]): string {
  const headers = ["ID", "Name", "Type", "Content"]
  let csv = headers.join(",") + "\n"
  messages.forEach((message) => {
    const row = [
      message.id,
      `"${message.name.replace(/"/g, '""')}"`,
      message.messageType,
      `"${message.content.replace(/"/g, '""').replace(/\n/g, "\\n")}"`,
    ]
    csv += row.join(",") + "\n"
  })
  return csv
}
