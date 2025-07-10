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
        { position: 2, name: "Patient ID", dataType: "CX", required: false, maxLength: 250, description: "Patient ID (External ID)" },
        { position: 3, name: "Patient Identifier List", dataType: "CX", required: true, maxLength: 250, description: "Patient identifier list" },
        { position: 4, name: "Alternate Patient ID", dataType: "CX", required: false, maxLength: 250, description: "Alternate patient ID - PID" },
        { position: 5, name: "Patient Name", dataType: "XPN", required: false, maxLength: 250, description: "Patient name" },
        { position: 6, name: "Mother's Maiden Name", dataType: "XPN", required: false, maxLength: 250, description: "Mother's maiden name" },
        { position: 7, name: "Date/Time of Birth", dataType: "TS", required: false, maxLength: 26, description: "Date/time of birth" },
        { position: 8, name: "Administrative Sex", dataType: "IS", required: false, maxLength: 1, description: "Administrative sex" },
        { position: 9, name: "Patient Alias", dataType: "XPN", required: false, maxLength: 250, description: "Patient alias" },
        { position: 10, name: "Race", dataType: "CE", required: false, maxLength: 250, description: "Race" },
        { position: 11, name: "Patient Address", dataType: "XAD", required: false, maxLength: 250, description: "Patient address" },
        { position: 12, name: "County Code", dataType: "IS", required: false, maxLength: 4, description: "County code" },
        { position: 13, name: "Phone Number - Home", dataType: "XTN", required: false, maxLength: 250, description: "Phone number - home" },
        { position: 14, name: "Phone Number - Business", dataType: "XTN", required: false, maxLength: 250, description: "Phone number - business" },
        { position: 15, name: "Primary Language", dataType: "CE", required: false, maxLength: 250, description: "Primary language" },
        { position: 16, name: "Marital Status", dataType: "CE", required: false, maxLength: 250, description: "Marital status" },
        { position: 17, name: "Religion", dataType: "CE", required: false, maxLength: 250, description: "Religion" },
        { position: 18, name: "Patient Account Number", dataType: "CX", required: false, maxLength: 250, description: "Patient account number" },
        { position: 19, name: "SSN Number - Patient", dataType: "ST", required: false, maxLength: 16, description: "SSN number - patient" },
      ],
    },
    EVN: {
      name: "Event Type",
      description: "Contains information about the event that triggered the message",
      fields: [
        { position: 1, name: "Event Type Code", dataType: "ID", required: false, maxLength: 3, description: "Event type code" },
        { position: 2, name: "Recorded Date/Time", dataType: "TS", required: true, maxLength: 26, description: "Recorded date/time" },
        { position: 3, name: "Date/Time Planned Event", dataType: "TS", required: false, maxLength: 26, description: "Date/time planned event" },
        { position: 4, name: "Event Reason Code", dataType: "IS", required: false, maxLength: 3, description: "Event reason code" },
        { position: 5, name: "Operator ID", dataType: "XCN", required: false, maxLength: 250, description: "Operator ID" },
        { position: 6, name: "Event Occurred", dataType: "TS", required: false, maxLength: 26, description: "Event occurred" },
      ],
    },
    PV1: {
      name: "Patient Visit",
      description: "Contains information about the patient visit",
      fields: [
        { position: 1, name: "Set ID", dataType: "SI", required: false, maxLength: 4, description: "Set ID - PV1" },
        { position: 2, name: "Patient Class", dataType: "IS", required: true, maxLength: 1, description: "Patient class" },
        { position: 3, name: "Assigned Patient Location", dataType: "PL", required: false, maxLength: 80, description: "Assigned patient location" },
        { position: 4, name: "Admission Type", dataType: "IS", required: false, maxLength: 2, description: "Admission type" },
        { position: 5, name: "Preadmit Number", dataType: "CX", required: false, maxLength: 250, description: "Preadmit number" },
        { position: 6, name: "Prior Patient Location", dataType: "PL", required: false, maxLength: 80, description: "Prior patient location" },
        { position: 7, name: "Attending Doctor", dataType: "XCN", required: false, maxLength: 250, description: "Attending doctor" },
        { position: 8, name: "Referring Doctor", dataType: "XCN", required: false, maxLength: 250, description: "Referring doctor" },
        { position: 9, name: "Consulting Doctor", dataType: "XCN", required: false, maxLength: 250, description: "Consulting doctor" },
        { position: 10, name: "Hospital Service", dataType: "IS", required: false, maxLength: 3, description: "Hospital service" },
      ],
    },
    OBX: {
      name: "Observation/Result",
      description: "Contains observation or result data",
      fields: [
        { position: 1, name: "Set ID", dataType: "SI", required: false, maxLength: 4, description: "Set ID - OBX" },
        { position: 2, name: "Value Type", dataType: "ID", required: false, maxLength: 2, description: "Value type" },
        { position: 3, name: "Observation Identifier", dataType: "CE", required: true, maxLength: 250, description: "Observation identifier" },
        { position: 4, name: "Observation Sub-ID", dataType: "ST", required: false, maxLength: 20, description: "Observation sub-ID" },
        { position: 5, name: "Observation Value", dataType: "Varies", required: false, maxLength: 99999, description: "Observation value" },
        { position: 6, name: "Units", dataType: "CE", required: false, maxLength: 250, description: "Units" },
        { position: 7, name: "References Range", dataType: "ST", required: false, maxLength: 60, description: "References range" },
        { position: 8, name: "Abnormal Flags", dataType: "IS", required: false, maxLength: 5, description: "Abnormal flags" },
        { position: 9, name: "Probability", dataType: "NM", required: false, maxLength: 5, description: "Probability" },
        { position: 10, name: "Nature of Abnormal Test", dataType: "ID", required: false, maxLength: 2, description: "Nature of abnormal test" },
      ],
    },
  },
}
