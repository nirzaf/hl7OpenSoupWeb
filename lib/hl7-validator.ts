import type { HL7Message, ValidationError, HL7Schema } from "@/types/hl7"

export class HL7Validator {
  private schema: HL7Schema

  constructor(schema: HL7Schema) {
    this.schema = schema
  }

  validate(message: HL7Message): ValidationError[] {
    const errors: ValidationError[] = []
    const segments = message.content.split("\n").filter((line) => line.trim())

    // Validate message structure
    if (segments.length === 0) {
      errors.push({
        segment: "MESSAGE",
        field: 0,
        message: "Message is empty",
        severity: "error",
      })
      return errors
    }

    // Validate MSH segment (required first segment)
    const firstSegment = segments[0]
    if (!firstSegment.startsWith("MSH")) {
      errors.push({
        segment: "MSH",
        field: 0,
        message: "Message must start with MSH segment",
        severity: "error",
      })
    }

    // Validate each segment
    segments.forEach((segment, index) => {
      const segmentErrors = this.validateSegment(segment, index)
      errors.push(...segmentErrors)
    })

    return errors
  }

  private validateSegment(segment: string, index: number): ValidationError[] {
    const errors: ValidationError[] = []
    const fields = segment.split("|")
    const segmentType = fields[0]

    // Check if segment type is known
    if (!this.schema.segments[segmentType]) {
      errors.push({
        segment: segmentType,
        field: 0,
        message: `Unknown segment type: ${segmentType}`,
        severity: "warning",
      })
      return errors
    }

    const segmentDef = this.schema.segments[segmentType]

    // Validate required fields
    segmentDef.fields.forEach((fieldDef) => {
      if (fieldDef.required && (!fields[fieldDef.position] || fields[fieldDef.position].trim() === "")) {
        errors.push({
          segment: segmentType,
          field: fieldDef.position,
          message: `Required field ${fieldDef.name} is missing`,
          severity: "error",
        })
      }

      // Validate field length
      if (fieldDef.maxLength && fields[fieldDef.position] && fields[fieldDef.position].length > fieldDef.maxLength) {
        errors.push({
          segment: segmentType,
          field: fieldDef.position,
          message: `Field ${fieldDef.name} exceeds maximum length of ${fieldDef.maxLength}`,
          severity: "warning",
        })
      }
    })

    return errors
  }
}

// Default HL7 v2.5 schema (simplified)
export const HL7_V25_SCHEMA: HL7Schema = {
  version: "2.5",
  segments: {
    MSH: {
      name: "Message Header",
      description: "Contains information about the message",
      fields: [
        {
          position: 1,
          name: "Field Separator",
          dataType: "ST",
          required: true,
          maxLength: 1,
          description: "Field separator character",
        },
        {
          position: 2,
          name: "Encoding Characters",
          dataType: "ST",
          required: true,
          maxLength: 4,
          description: "Encoding characters",
        },
        {
          position: 3,
          name: "Sending Application",
          dataType: "HD",
          required: false,
          maxLength: 227,
          description: "Sending application",
        },
        {
          position: 4,
          name: "Sending Facility",
          dataType: "HD",
          required: false,
          maxLength: 227,
          description: "Sending facility",
        },
        {
          position: 5,
          name: "Receiving Application",
          dataType: "HD",
          required: false,
          maxLength: 227,
          description: "Receiving application",
        },
        {
          position: 6,
          name: "Receiving Facility",
          dataType: "HD",
          required: false,
          maxLength: 227,
          description: "Receiving facility",
        },
        {
          position: 7,
          name: "Date/Time of Message",
          dataType: "TS",
          required: false,
          maxLength: 26,
          description: "Date and time of message",
        },
        {
          position: 9,
          name: "Message Type",
          dataType: "MSG",
          required: true,
          maxLength: 15,
          description: "Message type",
        },
        {
          position: 10,
          name: "Message Control ID",
          dataType: "ST",
          required: true,
          maxLength: 20,
          description: "Message control ID",
        },
        {
          position: 11,
          name: "Processing ID",
          dataType: "PT",
          required: true,
          maxLength: 3,
          description: "Processing ID",
        },
        { position: 12, name: "Version ID", dataType: "VID", required: true, maxLength: 60, description: "Version ID" },
      ],
    },
    PID: {
      name: "Patient Identification",
      description: "Contains patient demographic information",
      fields: [
        { position: 1, name: "Set ID", dataType: "SI", required: false, maxLength: 4, description: "Set ID - PID" },
        {
          position: 3,
          name: "Patient Identifier List",
          dataType: "CX",
          required: true,
          maxLength: 250,
          description: "Patient identifier list",
        },
        {
          position: 5,
          name: "Patient Name",
          dataType: "XPN",
          required: false,
          maxLength: 250,
          description: "Patient name",
        },
        {
          position: 7,
          name: "Date/Time of Birth",
          dataType: "TS",
          required: false,
          maxLength: 26,
          description: "Date/time of birth",
        },
        {
          position: 8,
          name: "Administrative Sex",
          dataType: "IS",
          required: false,
          maxLength: 1,
          description: "Administrative sex",
        },
      ],
    },
  },
}
