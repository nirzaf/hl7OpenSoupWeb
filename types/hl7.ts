export interface HL7Message {
  _id: string
  name: string
  content: string
  version: string
  messageType: string
  createdAt: Date
  updatedAt: Date
  tags?: string[]
  isValid?: boolean
  validationErrors?: ValidationError[]
}

export interface ValidationError {
  segment: string
  field: number
  message: string
  severity: "error" | "warning" | "info"
}

export interface HL7Segment {
  type: string
  fields: string[]
  description: string
}

export interface HL7Schema {
  version: string
  segments: Record<string, HL7SegmentDefinition>
}

export interface HL7SegmentDefinition {
  name: string
  description: string
  fields: HL7FieldDefinition[]
}

export interface HL7FieldDefinition {
  position: number
  name: string
  dataType: string
  required: boolean
  maxLength?: number
  description: string
}

export type HL7Version =
  | "2.1"
  | "2.2"
  | "2.3"
  | "2.3.1"
  | "2.4"
  | "2.5"
  | "2.5.1"
  | "2.6"
  | "2.7"
  | "2.8"
  | "2.8.1"
  | "2.8.2"
  | "2.9"

export interface ValidationRule {
  id: string
  name: string
  description: string
  ruleType: "structure" | "content" | "custom"
  hl7Version: HL7Version
  segmentType?: string
  fieldPosition?: number
  ruleExpression: string
  severity: "error" | "warning" | "info"
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface TransformationOptions {
  includeMetadata: boolean
  flattenStructure: boolean
  customMapping: boolean
  dateFormat: string
  encoding: string
}

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user" | "viewer"
  permissions: string[]
  lastLogin?: Date
}
