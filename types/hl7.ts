export interface HL7Message {
  _id: string
  name: string
  rawMessage: string
  parsedMessage: Record<string, any>
  metadata: {
    messageType: string
    versionId: string
    sendingFacility: string
    receivingFacility: string
    timestamp: Date
    controlId: string
    tags?: string[]
  }
  createdAt: Date
  updatedAt: Date
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
  _id?: string
  name: string
  description: string
  ruleType: "structure" | "content" | "custom"
  hl7Version: HL7Version
  segmentType?: string
  fieldPosition?: number
  targetPath?: string
  condition?: "exists" | "not_exists" | "equals" | "not_equals" | "startsWith" | "endsWith" | "contains" | "matchesRegex"
  value?: string
  action: "error" | "warning" | "info" | "highlight"
  actionDetail?: string
  severity: "error" | "warning" | "info"
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface RuleSet {
  _id?: string
  name: string
  description: string
  isSystemDefined: boolean
  rules: ValidationRule[]
  createdAt?: Date
  updatedAt?: Date
}

export interface LookupTable {
  _id?: string
  name: string
  description: string
  data: Array<{key: string, value: string}>
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

export interface Workflow {
  _id?: string
  name: string
  description: string
  steps: WorkflowStep[]
  createdAt?: Date
  updatedAt?: Date
}

export interface WorkflowStep {
  type: "validate" | "transform" | "editField" | "lookupAndReplace"
  parameters: Record<string, any>
  order: number
}

export interface User {
  id: string
  email: string
  name: string
  role: "admin" | "user" | "viewer"
  permissions: string[]
  lastLogin?: Date
}
