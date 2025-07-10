import { type NextRequest, NextResponse } from "next/server"
import type { ValidationRule } from "@/types/hl7"

// Mock validation rules
const mockRules: ValidationRule[] = [
  {
    id: "rule_001",
    name: "MSH Required Fields",
    description: "Validate required fields in MSH segment",
    ruleType: "structure",
    hl7Version: "2.5",
    segmentType: "MSH",
    fieldPosition: 9,
    ruleExpression: "field_not_empty",
    severity: "error",
    isActive: true,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  },
  {
    id: "rule_002",
    name: "PID Patient ID Required",
    description: "Patient identifier must be present",
    ruleType: "structure",
    hl7Version: "2.5",
    segmentType: "PID",
    fieldPosition: 3,
    ruleExpression: "field_not_empty",
    severity: "error",
    isActive: true,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  },
  {
    id: "rule_003",
    name: "Date Format Validation",
    description: "Validate HL7 date format",
    ruleType: "content",
    hl7Version: "2.5",
    ruleExpression: "regex:^\\d{8}(\\d{6})?$",
    severity: "warning",
    isActive: true,
    createdAt: new Date("2023-01-01"),
    updatedAt: new Date("2023-01-01"),
  },
]

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const version = searchParams.get("version")

  let filteredRules = mockRules
  if (version) {
    filteredRules = mockRules.filter((rule) => rule.hl7Version === version)
  }

  return NextResponse.json(filteredRules)
}

export async function POST(request: NextRequest) {
  try {
    const ruleData = await request.json()
    const newRule: ValidationRule = {
      id: `rule_${Date.now()}`,
      ...ruleData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockRules.push(newRule)
    return NextResponse.json(newRule)
  } catch (error) {
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 })
  }
}
