import { type NextRequest, NextResponse } from "next/server"
import type { HL7Message } from "@/types/hl7"

// Mock data for demonstration - replace with MongoDB integration
const mockMessages: HL7Message[] = [
  {
    _id: "1",
    name: "Patient Admission - John Doe",
    content: `MSH|^~\\&|EPIC|UCSF|CERNER|CPMC|20231201120000||ADT^A01|MSG001|P|2.5
EVN||20231201120000|||^SMITH^JANE
PID|1||MRN123456^5^M11^UCSF^MR^UCSF||DOE^JOHN^MIDDLE|19850615|M||W|123 MAIN ST^^SAN FRANCISCO^CA^94102||(415)555-0123|(415)555-0124~(415)555-0125||S||SSN123456789^2^M10^UCSF^SS^A|123456789|9-87654^CA
NK1|1|DOE^JANE^|SPO|123 MAIN ST^^SAN FRANCISCO^CA^94102|(415)555-0123|(415)555-0124|N
PV1|1|I|ICU^101^01^UCSF^R^ICU||ER|||^JOHNSON^ROBERT^MD^^MD|MED|||A|||^JOHNSON^ROBERT^MD^^MD|INP|MEDICARE|||||||||||||||||||||20231201120000`,
    version: "2.5",
    messageType: "ADT^A01",
    createdAt: new Date("2023-12-01T12:00:00Z"),
    updatedAt: new Date("2023-12-01T12:00:00Z"),
    tags: ["admission", "inpatient"],
    isValid: true,
  },
  {
    _id: "2",
    name: "Lab Results - Jane Smith",
    content: `MSH|^~\\&|LAB|UCSF|EMR|CPMC|20231201140000||ORU^R01|MSG002|P|2.5
PID|1||MRN789012^5^M11^UCSF^MR^UCSF||SMITH^JANE^MARIE|19920322|F||B|456 OAK AVE^^OAKLAND^CA^94601||(510)555-0123|(510)555-0124||M||SSN987654321^2^M10^UCSF^SS^A|987654321|9-12345^CA
OBR|1|ORDER123|RESULT456|CBC^COMPLETE BLOOD COUNT^L|||20231201130000|||||||||^WILSON^DAVID^MD^^MD||||||20231201140000|||F
OBX|1|NM|WBC^WHITE BLOOD COUNT^L|1|7.5|10*3/uL|4.0-11.0|N|||F|||20231201140000
OBX|2|NM|RBC^RED BLOOD COUNT^L|2|4.2|10*6/uL|3.8-5.2|N|||F|||20231201140000
OBX|3|NM|HGB^HEMOGLOBIN^L|3|12.5|g/dL|11.5-15.5|N|||F|||20231201140000`,
    version: "2.5",
    messageType: "ORU^R01",
    createdAt: new Date("2023-12-01T14:00:00Z"),
    updatedAt: new Date("2023-12-01T14:00:00Z"),
    tags: ["lab", "results"],
    isValid: true,
  },
]

export async function GET() {
  try {
    // In a real application, this would query MongoDB
    return NextResponse.json(mockMessages)
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const messageData = await request.json()
    const newMessage: HL7Message = {
      _id: Date.now().toString(),
      ...messageData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockMessages.unshift(newMessage)
    return NextResponse.json(newMessage)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create message" }, { status: 500 })
  }
}
